import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seasonsApi } from "../api";
import { X, Plus, Pencil, Trash2, TrendingUp, TrendingDown, Minus, Globe } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import clsx from "clsx";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

const PRESET_COLORS = [
  "#ec4899", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#6366f1", "#a855f7", "#64748b",
];

function SeasonForm({ season, venueId, onSaved, onCancel }) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: season
      ? season
      : { venue_id: venueId, price_multiplier: 1.0, color: "#6366f1", is_active: true },
  });
  const [selectedColor, setSelectedColor] = useState(season?.color ?? "#6366f1");
  const multiplier = parseFloat(watch("price_multiplier") || 1);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, color: selectedColor, price_multiplier: parseFloat(data.price_multiplier) };
      return season ? seasonsApi.update(season.id, payload) : seasonsApi.create(payload);
    },
    onSuccess: () => { onSaved(); toast.success(season ? "Saison mise à jour" : "Saison créée"); },
    onError: (e) => toast.error(e.response?.data?.detail ?? "Erreur"),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nom *</label>
          <input className="input" {...register("name", { required: true })} placeholder="Haute saison été" />
        </div>
        <div>
          <label className="label">Début</label>
          <div className="flex gap-1">
            <select className="input" {...register("start_month", { valueAsNumber: true })}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" min="1" max="31" className="input w-16" {...register("start_day", { valueAsNumber: true })} />
          </div>
        </div>
        <div>
          <label className="label">Fin</label>
          <div className="flex gap-1">
            <select className="input" {...register("end_month", { valueAsNumber: true })}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" min="1" max="31" className="input w-16" {...register("end_day", { valueAsNumber: true })} />
          </div>
        </div>
        <div>
          <label className="label">Multiplicateur *</label>
          <input type="number" step="0.05" min="0.1" max="5" className="input"
            {...register("price_multiplier", { required: true })} />
        </div>
        <div className="flex items-end pb-0.5">
          <span className={clsx(
            "text-sm font-semibold px-3 py-2 rounded-lg",
            multiplier > 1 ? "bg-orange-100 text-orange-700" : multiplier < 1 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          )}>
            {multiplier > 1 ? <TrendingUp className="inline w-4 h-4 mr-1" /> : multiplier < 1 ? <TrendingDown className="inline w-4 h-4 mr-1" /> : <Minus className="inline w-4 h-4 mr-1" />}
            {multiplier > 1 ? `+${((multiplier - 1) * 100).toFixed(0)}%` : multiplier < 1 ? `−${((1 - multiplier) * 100).toFixed(0)}%` : "Neutre"}
          </span>
        </div>
        <div className="col-span-2">
          <label className="label">Couleur</label>
          <div className="flex gap-2 flex-wrap mt-1">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setSelectedColor(c)}
                className={clsx("w-7 h-7 rounded-full border-2 transition-all", selectedColor === c ? "border-gray-800 scale-110" : "border-transparent")}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary btn-sm">
          {mutation.isPending ? "..." : season ? "Modifier" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}

function SeasonRow({ season, onEdit, onDelete }) {
  const mult = season.price_multiplier;
  const isHigh = mult > 1, isLow = mult < 1;

  return (
    <div className="flex items-center gap-3 py-3 hover:bg-gray-50 px-2 rounded-lg">
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: season.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800">{season.name}</span>
          {!season.venue_id && (
            <span className="badge bg-gray-100 text-gray-500 text-[10px] gap-1">
              <Globe className="w-3 h-3" />Globale
            </span>
          )}
          {!season.is_active && <span className="badge bg-red-50 text-red-500 text-[10px]">Inactif</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {MONTHS[season.start_month - 1]} {season.start_day} → {MONTHS[season.end_month - 1]} {season.end_day}
        </p>
      </div>
      <span className={clsx(
        "badge text-xs font-semibold shrink-0",
        isHigh ? "bg-orange-100 text-orange-700" : isLow ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
      )}>
        ×{mult.toFixed(2)}
        {isHigh ? ` (+${((mult - 1) * 100).toFixed(0)}%)` : isLow ? ` (−${((1 - mult) * 100).toFixed(0)}%)` : ""}
      </span>
      {onEdit && (
        <div className="flex gap-1 shrink-0">
          {season.venue_id && (
            <>
              <button onClick={onEdit} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded text-gray-500 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SeasonsModal({ venue, onClose, canEdit }) {
  const [editing, setEditing] = useState(null); // null | "new" | season-object
  const qc = useQueryClient();

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons", venue.id],
    queryFn: () => seasonsApi.list({ venue_id: venue.id }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => seasonsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["seasons"] }); toast.success("Saison supprimée"); },
  });

  const venueSeason = seasons.filter((s) => s.venue_id === venue.id);
  const globalSeasons = seasons.filter((s) => !s.venue_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold">Tarifs saisonniers</h2>
            <p className="text-sm text-gray-500">{venue.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Venue-specific seasons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Saisons spécifiques à ce lieu</h3>
              {canEdit && editing === null && (
                <button onClick={() => setEditing("new")} className="btn-primary btn-sm">
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              )}
            </div>

            {editing === "new" && (
              <SeasonForm
                venueId={venue.id}
                onSaved={() => { qc.invalidateQueries({ queryKey: ["seasons"] }); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            )}

            {venueSeason.length === 0 && editing === null && (
              <p className="text-sm text-gray-400 italic">Aucune saison spécifique</p>
            )}

            {venueSeason.map((s) => editing?.id === s.id ? (
              <SeasonForm
                key={s.id}
                season={s}
                venueId={venue.id}
                onSaved={() => { qc.invalidateQueries({ queryKey: ["seasons"] }); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <SeasonRow
                key={s.id}
                season={s}
                onEdit={canEdit ? () => setEditing(s) : null}
                onDelete={canEdit ? () => confirm(`Supprimer "${s.name}" ?`) && deleteMutation.mutate(s.id) : null}
              />
            ))}
          </div>

          {/* Global seasons (read-only here) */}
          {globalSeasons.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Saisons globales (s'appliquent à tous les lieux)
              </h3>
              {globalSeasons.map((s) => (
                <SeasonRow key={s.id} season={s} />
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Fermer</button>
        </div>
      </div>
    </div>
  );
}
