import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { MapPin, Eye, EyeOff, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", username);
      form.append("password", password);
      const { data } = await axios.post("/api/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      login(data.access_token, data.user);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Identifiants incorrects");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg mb-4">
            <MapPin className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VenueManager</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion de lieux événementiels</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom d'utilisateur</label>
              <input
                className="input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className="input pr-10"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>

        {/* Demo hints */}
        <div className="mt-6 card p-4 text-xs text-gray-500 space-y-1.5">
          <p className="font-medium text-gray-600 mb-2">Comptes de démonstration</p>
          {[
            { u: "admin", p: "admin123", r: "Admin — accès complet" },
            { u: "editeur", p: "edit123", r: "Éditeur — lecture + édition" },
            { u: "lecteur", p: "view123", r: "Lecteur — lecture seule" },
          ].map(({ u, p, r }) => (
            <button
              key={u}
              type="button"
              onClick={() => { setUsername(u); setPassword(p); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <span className="font-mono font-medium text-gray-700">{u}</span>
              <span className="text-gray-400 mx-1.5">/</span>
              <span className="font-mono">{p}</span>
              <span className="block text-gray-400 text-[11px] mt-0.5">{r}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
