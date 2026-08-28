import mysql from "mysql2/promise";

let pool: mysql.Pool | undefined;
export function getMySqlPool() {
  if (!process.env.MYSQL_URL) throw new Error("MYSQL_URL is not configured");
  pool ??= mysql.createPool({ uri: process.env.MYSQL_URL, connectionLimit: 10, namedPlaceholders: true });
  return pool;
}
