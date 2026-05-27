import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../AuthContext";
import { Plus, Pencil, Trash2, X, Shield, Eye, Edit3, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import axios from "axios";
import { api } from "../api";

const ROLES = [
  { value: "admin", label: "Admin", icon: Shield, color: "bg-purple-100 text-purple-700" },
  { value: "éditeur", label: "Éditeur", icon: Edit3, color: "bg-blue-100 text-blue-700" },
  { value: "lecteur", label: "Lecteur", icon: Eye, color: "bg-gray-100 text-gray-600" },
];

const roleConfig = Object.fromEntries(ROLES.map((r) => [r.value, r]));

function UserModal({ user, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const { register, handleSubmit } = useForm({
    defaultValues: user ? { username: user.username, email: user.email, full_name: user.full_name, role: user.role } : { role: "lecteur" },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit
        ? api.put(`/auth/users/${user.id}`, data).then((r) => r.data)
        : api.post("/auth/users", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(isEdit ? "Utilisateur mis à jour" : "Utilisateur créé");
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.detail ?? "Erreur"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Nom d'utilisateur *</label>
            <input className="input" {...register("username", { required: true })} disabled={isEdit} />
          </div>
          <div>
            <label className="label">Nom complet</label>
            <input className="input" {...register("full_name")} placeholder="Marie Dupont" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" {...register("email", { required: true })} />
          </div>
          {!isEdit && (
            <div>
              <label className="label">Mot de passe *</label>
              <input type="password" className="input" {...register("password", { required: !isEdit, minLength: 6 })} placeholder="Min. 6 caractères" />
            </div>
          )}
          <div>
            <label className="label">Rôle</label>
            <select className="input" {...register("role")}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e) {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Minimum 6 caractères"); return; }
    setLoading(true);
    try {
      await api.put(`/auth/users/${user.id}/reset-password`, { new_password: pwd });
      toast.success("Mot de passe réinitialisé");
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Réinitialiser le mot de passe</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleReset} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">Nouveau mot de passe pour <strong>{user.username}</strong></p>
          <input
            type="password"
            className="input"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Nouveau mot de passe (min. 6 car.)"
            required
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? "..." : "Réinitialiser"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const [modal, setModal] = useState(null); // null | "create" | user-object
  const [resetTarget, setResetTarget] = useState(null);
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/auth/users").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/auth/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("Utilisateur supprimé"); },
    onError: () => toast.error("Impossible de supprimer"),
  });

  const initials = (u) => (u.full_name ? u.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2) : u.username.slice(0, 2)).toUpperCase();
  const avatarColors = ["bg-primary-100 text-primary-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} utilisateur(s)</p>
        </div>
        <button onClick={() => setModal("create")} className="btn-primary">
          <Plus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>

      {/* Role legend */}
      <div className="flex gap-3 flex-wrap">
        {ROLES.map(({ value, label, icon: Icon, color }) => (
          <span key={value} className={`badge ${color} gap-1.5`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {users.map((u, i) => {
            const role = roleConfig[u.role];
            const RoleIcon = role?.icon ?? Shield;
            const isSelf = u.id === me?.id;
            return (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                  {initials(u)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{u.full_name || u.username}</p>
                    {isSelf && <span className="badge bg-primary-50 text-primary-600 text-[10px]">Moi</span>}
                    {!u.is_active && <span className="badge bg-red-50 text-red-600 text-[10px]">Désactivé</span>}
                  </div>
                  <p className="text-sm text-gray-500">@{u.username} · {u.email}</p>
                </div>
                <span className={`badge ${role?.color ?? "bg-gray-100 text-gray-600"} shrink-0`}>
                  <RoleIcon className="w-3.5 h-3.5 mr-1" />{role?.label ?? u.role}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setModal(u)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setResetTarget(u)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Réinitialiser le mot de passe">
                    <KeyRound className="w-4 h-4" />
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => confirm(`Supprimer ${u.username} ?`) && deleteMutation.mutate(u.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && <UserModal user={modal === "create" ? null : modal} onClose={() => setModal(null)} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />}
    </div>
  );
}
