import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingsApi, venuesApi, clientsApi } from "../api";
import { Plus, Calendar, List, X, Clock, CheckCircle, Ban, Pencil } from "lucide-react";
import { useAuth } from "../AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import CalendarView from "../components/CalendarView";

const EVENT_TYPES = ["mariage", "séminaire", "fête", "autre"];

const statusConfig = {
  en_attente: { label: "En attente", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  confirmé: { label: "Confirmé", color: "bg-green-100 text-green-700", icon: CheckCircle },
  annulé: { label: "Annulé", color: "bg-red-100 text-red-700", icon: Ban },
  terminé: { label: "Terminé", color: "bg-gray-100 text-gray-600", icon: CheckCircle },
};

const eventColors = {
  mariage: "bg-pink-50 text-pink-700 border-pink-200",
  séminaire: "bg-blue-50 text-blue-700 border-blue-200",
  fête: "bg-orange-50 text-orange-700 border-orange-200",
  autre: "bg-gray-50 text-gray-600 border-gray-200",
};

function BookingModal({ booking, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!booking;

  const { data: venues = [] } = useQuery({ queryKey: ["venues"], queryFn: () => venuesApi.list({ active_only: false }) });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => clientsApi.list({}) });

  const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 16) : "";

  const { register, handleSubmit, watch } = useForm({
    defaultValues: booking ? {
      ...booking,
      venue_id: booking.venue_id,
      client_id: booking.client_id,
      start_date: toInputDate(booking.start_date),
      end_date: toInputDate(booking.end_date),
    } : { status: "en_attente", deposit_paid: false, deposit_amount: 0, guest_count: 50 },
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        venue_id: parseInt(data.venue_id),
        client_id: parseInt(data.client_id),
        guest_count: parseInt(data.guest_count),
        deposit_amount: parseFloat(data.deposit_amount) || 0,
        total_price: data.total_price ? parseFloat(data.total_price) : null,
      };
      return isEdit ? bookingsApi.update(booking.id, payload) : bookingsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(isEdit ? "Réservation mise à jour" : "Réservation créée");
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.detail ?? "Erreur"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{isEdit ? "Modifier la réservation" : "Nouvelle réservation"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Lieu *</label>
              <select className="input" {...register("venue_id", { required: true })}>
                <option value="">Sélectionner un lieu</option>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.name} – {v.city}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Client *</label>
              <select className="input" {...register("client_id", { required: true })}>
                <option value="">Sélectionner un client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type d'événement *</label>
              <select className="input" {...register("event_type", { required: true })}>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nom de l'événement</label>
              <input className="input" {...register("event_name")} placeholder="Mariage Dupont..." />
            </div>
            <div>
              <label className="label">Début *</label>
              <input type="datetime-local" className="input" {...register("start_date", { required: true })} />
            </div>
            <div>
              <label className="label">Fin *</label>
              <input type="datetime-local" className="input" {...register("end_date", { required: true })} />
            </div>
            <div>
              <label className="label">Nombre d'invités *</label>
              <input type="number" className="input" {...register("guest_count", { required: true, min: 1 })} />
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" {...register("status")}>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Prix total (€)</label>
              <input type="number" step="0.01" className="input" {...register("total_price")} placeholder="Calculé auto" />
            </div>
            <div>
              <label className="label">Acompte (€)</label>
              <input type="number" step="0.01" className="input" {...register("deposit_amount")} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" id="deposit_paid" {...register("deposit_paid")} className="accent-primary-600 w-4 h-4" />
              <label htmlFor="deposit_paid" className="text-sm text-gray-700">Acompte versé</label>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} {...register("notes")} />
            </div>
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

export default function Bookings() {
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [view, setView] = useState("list"); // "list" | "calendar"
  const qc = useQueryClient();
  const { canEdit } = useAuth();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings", filterStatus, filterType],
    queryFn: () => bookingsApi.list({ status: filterStatus || undefined, event_type: filterType || undefined }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => bookingsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Réservation annulée");
    },
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Réservations</h1>
          <p className="text-gray-500 text-sm mt-1">{bookings.length} réservation(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                view === "list" ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <List className="w-4 h-4" /> Liste
            </button>
            <button
              onClick={() => setView("calendar")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-gray-200",
                view === "calendar" ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Calendar className="w-4 h-4" /> Calendrier
            </button>
          </div>
          {canEdit && (
            <button onClick={() => setModal("create")} className="btn-primary">
              <Plus className="w-4 h-4" /> Nouvelle réservation
            </button>
          )}
        </div>
      </div>

      {/* Filters (list view only) */}
      {view === "list" && (
        <div className="flex gap-3 flex-wrap">
          <select className="input w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="input w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : view === "calendar" ? (
        <CalendarView bookings={bookings} onSelectBooking={(b) => setModal(b)} />
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune réservation</p>
          <button onClick={() => setModal("create")} className="btn-primary mt-4">Créer une réservation</button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const status = statusConfig[b.status] ?? statusConfig.en_attente;
            const StatusIcon = status.icon;
            return (
              <div key={b.id} className={clsx("card p-4 flex items-center gap-4 border-l-4", eventColors[b.event_type] ?? eventColors.autre)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{b.event_name || "Réservation #" + b.id}</span>
                    <span className={`badge ${status.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />{status.label}
                    </span>
                    <span className="badge bg-gray-100 text-gray-600 capitalize">{b.event_type}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {b.venue?.name} · {b.client?.first_name} {b.client?.last_name} · {b.guest_count} invités
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(b.start_date), "d MMM yyyy", { locale: fr })} → {format(new Date(b.end_date), "d MMM yyyy", { locale: fr })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-gray-900">
                    {b.total_price?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                  </p>
                  {b.deposit_paid && <p className="text-xs text-green-600">Acompte versé</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <button onClick={() => setModal(b)} className="p-1.5 hover:bg-white/80 rounded-lg text-gray-500">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {b.status !== "annulé" && (
                      <button onClick={() => confirm("Annuler cette réservation ?") && cancelMutation.mutate(b.id)} className="p-1.5 hover:bg-white/80 rounded-lg text-red-500">
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <BookingModal
          booking={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
