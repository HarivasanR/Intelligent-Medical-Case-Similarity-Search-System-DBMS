import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getMySqlPool } from "@/lib/mysql";
import type { ManagedUser, Role } from "@/types";
import type { z } from "zod";
import type { createUserSchema } from "@/lib/validation";

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function listDatabaseUsers(): Promise<ManagedUser[]> {
  const pool = getMySqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      u.id, 
      u.full_name AS name, 
      u.email, 
      r.name AS role, 
      u.is_active AS isActive, 
      u.created_at AS createdAt
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ORDER BY u.id ASC
  `);

  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    email: String(r.email),
    role: r.role as Role,
    isActive: Boolean(r.isActive),
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
  }));
}

export async function createDatabaseUser(input: CreateUserInput, actorAdminId: number): Promise<ManagedUser> {
  const pool = getMySqlPool();
  const connection = await pool.getConnection();

  try {
    // 1. Check if email already exists
    const [existing] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [input.email]
    );
    if (existing.length > 0) {
      throw new Error("A user with this email address is already registered.");
    }

    // 2. Fetch role_id from the roles table
    const [roles] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM roles WHERE name = ? LIMIT 1",
      [input.role]
    );
    if (roles.length === 0) {
      throw new Error("Invalid role specified.");
    }
    const roleId = Number(roles[0].id);

    // 3. Hash password using bcryptjs
    const passwordHash = await bcrypt.hash(input.password, 12);

    // 4. Begin transaction
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (role_id, full_name, email, password_hash, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [roleId, input.fullName, input.email, passwordHash, input.isActive ? 1 : 0]
    );
    const newUserId = result.insertId;

    // 5. Audit log
    await connection.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE', 'user', ?, JSON_OBJECT('email', ?, 'role', ?, 'fullName', ?))`,
      [actorAdminId, newUserId, input.email, input.role, input.fullName]
    );

    await connection.commit();

    return {
      id: newUserId,
      name: input.fullName,
      email: input.email,
      role: input.role,
      isActive: input.isActive,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deactivateDatabaseUser(targetUserId: number, actorAdminId: number): Promise<{ id: number; isActive: boolean }> {
  // 1. Prevent self-lockout
  if (targetUserId === actorAdminId) {
    throw new Error("Self-deactivation is not permitted. You cannot deactivate your own account.");
  }

  const pool = getMySqlPool();
  const connection = await pool.getConnection();

  try {
    // 2. Find target user and their role
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT u.id, u.full_name, u.is_active, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1`,
      [targetUserId]
    );

    if (rows.length === 0) {
      throw new Error("User not found.");
    }

    const targetUser = rows[0];
    if (!targetUser.is_active) {
      throw new Error("User is already deactivated.");
    }

    // 3. Protect the last active ADMIN
    if (targetUser.role === "ADMIN") {
      const [adminCountRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(*) AS count
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name = 'ADMIN' AND u.is_active = TRUE`
      );
      const activeAdminCount = Number(adminCountRows[0]?.count || 0);
      if (activeAdminCount <= 1) {
        throw new Error("Cannot deactivate the last active Administrator account.");
      }
    }

    // 4. Begin transaction for soft deactivation
    await connection.beginTransaction();

    await connection.execute(
      "UPDATE users SET is_active = FALSE WHERE id = ?",
      [targetUserId]
    );

    // 5. Audit log
    await connection.execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'UPDATE', 'user', ?, JSON_OBJECT('action', 'deactivate', 'is_active', false))`,
      [actorAdminId, targetUserId]
    );

    await connection.commit();

    return {
      id: targetUserId,
      isActive: false,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
