import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { venuesApi } from "../api";
import { Plus, Search, MapPin, Users, Euro, Car, Utensils, Bed, Trees, Waves, Music, Pencil, Trash2, X, Timer, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../AuthContext";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import DurationRulesModal from "../components/DurationRulesModal";
import SeasonsModal from "../components/SeasonsModal";

const EVENT_TYPES = ["mariage", "séminaire", "fête", "autre"];

const amenityConfig = [
  { key: "has_parking", icon: Car, label: "Parking" },
  { key: "has_catering", icon: Utensils, label: "Traiteur" },
  { key: "has_accommodation", icon: Bed, label: "Hébergement" },
  { key: "has_garden", icon: Trees, label: "Jardin" },
  { key: "has_pool", icon: Waves, label: "Piscine" },
  { key: "has_sound_system", icon: Music, label: "Sono" },
];

function VenueModal({ venue, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!venue;

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: venue ? {
      ...venue,
      event_types: venue.event_types,
    } : {
      event_types: EVENT_TYPES.join(","),
      has_parking: false, has_catering: false, has_accommodation: false,
      has_garden: false, has_pool: false, has_sound_system: false,
      capacity_min: 10, is_active: true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? venuesApi.update(venue.id, data) : venuesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(isEdit ? "Lieu mis à jour" : "Lieu créé");
      onClose();
    },
    onError: () => toast.error("Une erreur est survenue"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{isEdit ? "Modifier le lieu" : "Nouveau lieu"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nom du lieu *</label>
              <input className="input" {...register("name", { required: true })} placeholder="Château des Roses" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={3} {...register("description")} placeholder="Description du lieu..." />
            </div>
            <div>
              <label className="label">Adresse *</label>
              <input className="input" {...register("address", { required: true })} placeholder="12 Rue de la Paix" />
            </div>
            <div>
              <label className="label">Ville *</label>
              <input className="input" {...register("city", { required: true })} placeholder="Paris" />
            </div>
            <div>
              <label className="label">Capacité min. *</label>
              <input type="number" className="input" {...register("capacity_min", { required: true, min: 1 })} />
            </div>
            <div>
              <label className="label">Capacité max. *</label>
              <input type="number" className="input" {...register("capacity_max", { required: true, min: 1 })} />
            </div>
            <div>
              <label className="label">Prix / jour (€) *</label>
              <input type="number" step="0.01" className="input" {...register("price_per_day", { required: true, min: 0 })} />
            </div>
            <div>
              <label className="label">Surface (m²)</label>
              <input type="number" step="0.1" className="input" {...register("surface_m2")} />
            </div>
          </div>

          <div>
            <label className="label">Types d'événements</label>
            <input className="input" {...register("event_types")} placeholder="mariage,séminaire,fête,autre" />
            <p className="text-xs text-gray-400 mt-1">Séparés par des virgules</p>
          </div>

          <div>
            <label className="label">Équipements</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {amenityConfig.map(({ key, icon: Icon, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:border-primary-300 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
                  <input type="checkbox" {...register(key)} className="accent-primary-600" />
                  <Icon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer le lieu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VenueCard({ venue, onEdit, onDelete, onDurationRules, onSeasons, canEdit }) {
  const amenities = amenityConfig.filter(({ key }) => venue[key]);
  const eventTypes = venue.event_types?.split(",").filter(Boolean) ?? [];

  return (
    <div className="card overflow-hidden hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-br from-primary-400 to-primary-700 h-36 flex items-center justify-center">
        <MapPin className="w-12 h-12 text-white/70" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{venue.name}</h3>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onDurationRules(venue)}
              className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
              title="Tarification par durée"
            >
              <Timer className="w-4 h-4" />
            </button>
            <button
              onClick={() => onSeasons(venue)}
              className="p-1.5 hover:bg-primary-50 rounded-lg text-gray-400 hover:text-primary-600 transition-colors"
              title="Tarifs saisonniers"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            {canEdit && (
              <>
                <button onClick={() => onEdit(venue)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(venue)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5" />{venue.city}
        </p>

        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
          <span className="flex items-center gap-1"><Users className="w-4 h-4 text-gray-400" />{venue.capacity_min}–{venue.capacity_max}</span>
          <span className="flex items-center gap-1"><Euro className="w-4 h-4 text-gray-400" />{venue.price_per_day.toLocaleString("fr-FR")}/j</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {eventTypes.map((t) => (
            <span key={t} className="badge bg-primary-50 text-primary-700 text-xs">{t}</span>
          ))}
        </div>

        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {amenities.map(({ key, icon: Icon, label }) => (
              <span key={key} className="badge bg-gray-100 text-gray-600 text-xs flex items-center gap-1">
                <Icon className="w-3 h-3" />{label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Venues() {
  const [modal, setModal] = useState(null);
  const [durationVenue, setDurationVenue] = useState(null);
  const [seasonsVenue, setSeasonsVenue] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { canEdit } = useAuth();

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues", search],
    queryFn: () => venuesApi.list({ search, active_only: false }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => venuesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Lieu désactivé");
    },
  });

  const handleDelete = (venue) => {
    if (confirm(`Désactiver "${venue.name}" ?`)) deleteMutation.mutate(venue.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lieux</h1>
          <p className="text-gray-500 text-sm mt-1">{venues.length} lieu(x) enregistré(s)</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal("create")} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouveau lieu
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : venues.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun lieu trouvé</p>
          {canEdit && <button onClick={() => setModal("create")} className="btn-primary mt-4">Créer un lieu</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {venues.map((v) => (
            <VenueCard
              key={v.id}
              venue={v}
              onEdit={(v) => setModal(v)}
              onDelete={handleDelete}
              onDurationRules={(v) => setDurationVenue(v)}
              onSeasons={(v) => setSeasonsVenue(v)}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {modal && (
        <VenueModal
          venue={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
      {durationVenue && (
        <DurationRulesModal
          venue={durationVenue}
          onClose={() => setDurationVenue(null)}
          canEdit={canEdit}
        />
      )}
      {seasonsVenue && (
        <SeasonsModal
          venue={seasonsVenue}
          onClose={() => setSeasonsVenue(null)}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
