import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, MapPin, Calendar, Users, UsersRound, Menu, LogOut, ChevronDown, KeyRound } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { AuthProvider, useAuth } from "./AuthContext";
import Dashboard from "./pages/Dashboard";
import Venues from "./pages/Venues";
import Bookings from "./pages/Bookings";
import Clients from "./pages/Clients";
import UsersPage from "./pages/Users";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

const ROLE_LABELS = { admin: "Admin", "éditeur": "Éditeur", lecteur: "Lecteur" };
const ROLE_COLORS = { admin: "bg-purple-100 text-purple-700", "éditeur": "bg-blue-100 text-blue-700", lecteur: "bg-gray-100 text-gray-600" };

function Sidebar({ onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Tableau de bord" },
    { to: "/venues", icon: MapPin, label: "Lieux" },
    { to: "/bookings", icon: Calendar, label: "Réservations" },
    { to: "/clients", icon: Users, label: "Clients" },
    ...(isAdmin ? [{ to: "/users", icon: UsersRound, label: "Utilisateurs" }] : []),
  ];

  const initials = user
    ? (user.full_name ? user.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2) : user.username.slice(0, 2)).toUpperCase()
    : "??";

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">VenueManager</h1>
          <p className="text-xs text-gray-500">Gestion événementielle</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User panel */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={() => setProfileOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || user?.username}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[user?.role] ?? ""}`}>
              {ROLE_LABELS[user?.role] ?? user?.role}
            </span>
          </div>
          <ChevronDown className={clsx("w-4 h-4 text-gray-400 shrink-0 transition-transform", profileOpen && "rotate-180")} />
        </button>

        {profileOpen && (
          <div className="mt-1 mx-1 bg-gray-50 rounded-lg overflow-hidden">
            <NavLink
              to="/change-password"
              onClick={() => { setProfileOpen(false); onClose?.(); }}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <KeyRound className="w-4 h-4" /> Changer mon mot de passe
            </NavLink>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-30 w-64 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-semibold text-gray-800">VenueManager</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/venues/*" element={<Venues />} />
            <Route path="/bookings/*" element={<Bookings />} />
            <Route path="/clients/*" element={<Clients />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/*" element={<RequireAuth><AppShell /></RequireAuth>} />
      </Routes>
    </AuthProvider>
  );
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}
