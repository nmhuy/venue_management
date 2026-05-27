import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api";
import { Building2, Users, Calendar, TrendingUp, Clock, CheckCircle, MapPin, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";

const eventTypeColors = {
  mariage: "bg-pink-100 text-pink-700",
  séminaire: "bg-blue-100 text-blue-700",
  fête: "bg-orange-100 text-orange-700",
  autre: "bg-gray-100 text-gray-700",
};

const statusConfig = {
  en_attente: { label: "En attente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmé: { label: "Confirmé", color: "bg-green-100 text-green-700", icon: CheckCircle },
  annulé: { label: "Annulé", color: "bg-red-100 text-red-700", icon: AlertCircle },
  terminé: { label: "Terminé", color: "bg-gray-100 text-gray-600", icon: CheckCircle },
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: dashboardApi.get });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const revenue = data?.revenue_total?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }) ?? "–";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Lieux actifs" value={data?.active_venues ?? 0} sub={`${data?.total_venues ?? 0} au total`} color="bg-primary-100 text-primary-700" />
        <StatCard icon={Users} label="Clients" value={data?.total_clients ?? 0} color="bg-blue-100 text-blue-700" />
        <StatCard icon={Clock} label="En attente" value={data?.pending_bookings ?? 0} sub={`${data?.confirmed_bookings ?? 0} confirmées`} color="bg-yellow-100 text-yellow-700" />
        <StatCard icon={TrendingUp} label="Chiffre d'affaires" value={revenue} sub="Réservations confirmées" color="bg-green-100 text-green-700" />
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Prochaines réservations (30 jours)
          </h2>
          <Link to="/bookings" className="text-sm text-primary-600 hover:underline">
            Tout voir
          </Link>
        </div>

        {data?.upcoming_bookings?.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Aucune réservation à venir</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data?.upcoming_bookings?.map((b) => {
              const status = statusConfig[b.status] ?? statusConfig.en_attente;
              const StatusIcon = status.icon;
              return (
                <div key={b.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{b.event_name || "–"}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 flex-wrap">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{b.venue?.name}</span>
                      <span>·</span>
                      <span>{b.client?.first_name} {b.client?.last_name}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <span className={`badge ${eventTypeColors[b.event_type] ?? "bg-gray-100 text-gray-600"}`}>
                        {b.event_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {format(new Date(b.start_date), "d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <span className={`badge ${status.color} shrink-0`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
