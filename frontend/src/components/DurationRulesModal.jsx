import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { durationRulesApi } from "../api";
import { X, Plus, Pencil, Trash2, Globe, Timer } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import clsx from "clsx";

function RuleForm({ rule, venueId, onSaved, onCancel }) {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: rule
      ? rule
      : { venue_id: venueId ?? null, min_days: 7, max_days: null, price_multiplier: 0.9, is_active: true },
  });

  const multiplier = parseFloat(watch("price_multiplier") || 1);
  const discountPct = multiplier < 1 ? ((1 - multiplier) * 100).toFixed(0) : 0;

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        venue_id: venueId ?? null,
        min_days: parseInt(data.min_days),
        max_days: data.max_days ? parseInt(data.max_days) : null,
        price_multiplier: parseFloat(data.price_multiplier),
      };
      return rule ? durationRulesApi.update(rule.id, payload) : durationRulesApi.create(payload);
    },
    onSuccess: () => { onSaved(); toast.success(rule ? "Règle mise à jour" : "Règle créée"); },
    onError: (e) => toast.error(e.response?.data?.detail ?? "Erreur"),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nom *</label>
          <input className="input" {...register("name", { required: true })} placeholder="Semaine (7-13 j)" />
        </div>
        <div>
          <label className="label">Durée min (jours) *</label>
          <input type="number" min="1" className="input" {...register("min_days", { required: true, valueAsNumber: true })} />
        </div>
        <div>
          <label className="label">Durée max (jours)</label>
          <input type="number" min="1" className="input" {...register("max_days", { setValueAs: (v) => v === "" ? null : parseInt(v) })} placeholder="Illimité" />
        </div>
        <div>
          <label className="label">Multiplicateur *</label>
          <input type="number" step="0.01" min="0.1" max="2" className="input"
            {...register("price_multiplier", { required: true })} />
        </div>
        <div className="flex items-end pb-0.5">
          <span className={clsx(
            "text-sm font-semibold px-3 py-2 rounded-lg",
            multiplier < 1 ? "bg-blue-100 text-blue-700" : multiplier > 1 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
          )}>
            {multiplier < 1 ? `−${discountPct}%` : multiplier > 1 ? `+${((multiplier - 1) * 100).toFixed(0)}%` : "Neutre"}
          </span>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">Annuler</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary btn-sm">
          {mutation.isPending ? "..." : rule ? "Modifier" : "Ajouter"}
        </button>
      </div>
    </form>
  );
}

function RuleRow({ rule, onEdit, onDelete }) {
  const mult = rule.price_multiplier;
  const isDiscount = mult < 1;
  const pct = isDiscount ? ((1 - mult) * 100).toFixed(0) : ((mult - 1) * 100).toFixed(0);
  const rangeLabel = rule.max_days
    ? `${rule.min_days}–${rule.max_days} jours`
    : `${rule.min_days}+ jours`;

  return (
    <div className="flex items-center gap-3 py-3 hover:bg-gray-50 px-2 rounded-lg">
      <Timer className="w-4 h-4 text-gray-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-800">{rule.name}</span>
          {!rule.venue_id && (
            <span className="badge bg-gray-100 text-gray-500 text-[10px] gap-1">
              <Globe className="w-3 h-3" />Globale
            </span>
          )}
          {!rule.is_active && <span className="badge bg-red-50 text-red-500 text-[10px]">Inactif</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{rangeLabel}</p>
      </div>
      <span className={clsx(
        "badge text-xs font-semibold shrink-0",
        isDiscount ? "bg-blue-100 text-blue-700" : mult > 1 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
      )}>
        ×{mult.toFixed(2)}
        {isDiscount ? ` (−${pct}%)` : mult > 1 ? ` (+${pct}%)` : ""}
      </span>
      {onEdit && rule.venue_id && (
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1 hover:bg-gray-200 rounded text-gray-500">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded text-gray-500 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function DurationRulesModal({ venue, onClose, canEdit }) {
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ["duration-rules", venue.id],
    queryFn: () => durationRulesApi.list({ venue_id: venue.id }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => durationRulesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["duration-rules"] }); toast.success("Règle supprimée"); },
  });

  const venueRules = rules.filter((r) => r.venue_id === venue.id);
  const globalRules = rules.filter((r) => !r.venue_id);

  const saved = () => { qc.invalidateQueries({ queryKey: ["duration-rules"] }); setEditing(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary-600" /> Tarification par durée
            </h2>
            <p className="text-sm text-gray-500">{venue.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Venue-specific rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Règles spécifiques à ce lieu</h3>
              {canEdit && editing === null && (
                <button onClick={() => setEditing("new")} className="btn-primary btn-sm">
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              )}
            </div>

            {editing === "new" && (
              <RuleForm venueId={venue.id} onSaved={saved} onCancel={() => setEditing(null)} />
            )}

            {venueRules.length === 0 && editing === null && (
              <p className="text-sm text-gray-400 italic">Aucune règle spécifique</p>
            )}

            {venueRules.map((r) =>
              editing?.id === r.id ? (
                <RuleForm key={r.id} rule={r} venueId={venue.id} onSaved={saved} onCancel={() => setEditing(null)} />
              ) : (
                <RuleRow
                  key={r.id}
                  rule={r}
                  onEdit={canEdit ? () => setEditing(r) : null}
                  onDelete={canEdit ? () => confirm(`Supprimer "${r.name}" ?`) && deleteMutation.mutate(r.id) : null}
                />
              )
            )}
          </div>

          {/* Global rules (read-only) */}
          {globalRules.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Règles globales (s'appliquent à tous les lieux)
              </h3>
              {globalRules.map((r) => <RuleRow key={r.id} rule={r} />)}
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
