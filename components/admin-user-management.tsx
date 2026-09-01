"use client";

import { useState } from "react";
import { UserPlus, UserX, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ManagedUser, Role } from "@/types";

interface AdminUserManagementProps {
  initialUsers: ManagedUser[];
  currentUserId: number;
}

export function AdminUserManagement({ initialUsers, currentUserId }: AdminUserManagementProps) {
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<number | null>(null);
  
  // Feedback messages
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STAFF");
  const [isActive, setIsActive] = useState(true);

  function resetForm() {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setIsActive(true);
    setModalError(null);
  }

  function handleOpenModal() {
    resetForm();
    setIsModalOpen(true);
    setStatusMessage(null);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    resetForm();
  }

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setModalError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          role,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setModalError(data.error || "Failed to create user.");
        setLoading(false);
        return;
      }

      const createdUser: ManagedUser = {
        id: data.item.id,
        name: data.item.name,
        email: data.item.email,
        role: data.item.role,
        isActive: data.item.isActive,
      };

      setUsers((prev) => [...prev, createdUser]);
      setIsModalOpen(false);
      resetForm();
      setStatusMessage({
        type: "success",
        text: data.demo
          ? `User "${createdUser.name}" added in demo view.`
          : `User "${createdUser.name}" created successfully.`,
      });
    } catch {
      setModalError("A network error occurred while creating user.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(userId: number) {
    setDeactivatingId(userId);
    setStatusMessage(null);
    setConfirmDeactivateId(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to deactivate user.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u))
      );

      setStatusMessage({
        type: "success",
        text: data.message || "User account deactivated successfully.",
      });
    } catch {
      setStatusMessage({
        type: "error",
        text: "A network error occurred while deactivating user.",
      });
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="font-extrabold text-ink">User access</h2>
          <p className="text-xs text-muted">Manage system users, authentication roles, and account statuses.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenModal}
          className="btn-primary !px-3.5 !py-2 text-xs"
        >
          <UserPlus size={15} />
          Add User
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl p-3.5 text-xs font-semibold ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="ml-auto text-slate-400 hover:text-slate-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const isBusy = deactivatingId === u.id;
              const isConfirming = confirmDeactivateId === u.id;

              return (
                <tr key={u.id} className="transition hover:bg-slate-50/50">
                  <td className="py-4 font-bold text-ink">
                    {u.name}
                    {isSelf && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                        You
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-muted">{u.email}</td>
                  <td className="py-4">
                    <span
                      className={`badge ${
                        u.role === "ADMIN"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4">
                    {u.isActive ? (
                      <span className="badge bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500">
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-right">
                    {isSelf ? (
                      <span className="text-xs text-slate-400">Current User</span>
                    ) : !u.isActive ? (
                      <span className="text-xs text-slate-400">Inactive</span>
                    ) : isConfirming ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeactivate(u.id)}
                          disabled={isBusy}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                        >
                          {isBusy ? "Deactivating…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeactivateId(null)}
                          disabled={isBusy}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeactivateId(u.id)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/60 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        <UserX size={13} />
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-8 text-center text-sm text-muted">
            No users found.
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">Add New User</h3>
                <p className="text-xs text-muted">Create a new authenticated account.</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800">
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="mt-4 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Maya Rao"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya@medmatch.test"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="input"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="label">Initial Status</label>
                  <select
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={loading}
                  className="btn-secondary !px-4 !py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary !px-4 !py-2 text-xs"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
