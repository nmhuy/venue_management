import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function ChangePassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [show, setShow] = useState({ current: false, new: false });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (form.new_password.length < 6) {
      toast.error("Minimum 6 caractères");
      return;
    }
    setLoading(true);
    try {
      await api.put("/auth/me/password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success("Mot de passe mis à jour");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  function PwdField({ id, label, value, showKey }) {
    return (
      <div>
        <label className="label">{label}</label>
        <div className="relative">
          <input
            type={show[showKey] ? "text" : "password"}
            className="input pr-10"
            value={value}
            onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
            required
          />
          <button type="button" onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Changer mon mot de passe</h1>
        <p className="text-gray-500 text-sm mt-1">Saisissez votre mot de passe actuel puis le nouveau</p>
      </div>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <PwdField id="current_password" label="Mot de passe actuel" value={form.current_password} showKey="current" />
          <PwdField id="new_password" label="Nouveau mot de passe" value={form.new_password} showKey="new" />
          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">
              <KeyRound className="w-4 h-4" />{loading ? "Enregistrement..." : "Mettre à jour"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
