import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { discountsApi } from "../api";
import { useAuth } from "../AuthContext";
import { Plus, Tag, Pencil, Trash2, X, CheckCircle, XCircle, Percent, Euro } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import clsx from "clsx";

function DiscountModal({ discount, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!discount;
  const { register, handleSubmit, watch } = useForm({
    defaultValues: discount
      ? {
          ...discount,
          expires_at: discount.expires_at
            ? new Date(discount.expires_at).toISOString().slice(0, 16)
            : "",
        }
      : { discount_type: "percentage", value: 10, min_booking_amount: 0, is_active: true },
  });
  const discountType = watch("discount_type");

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        value: parseFloat(data.value),
        min_booking_amount: parseFloat(data.min_booking_amount) || 0,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        expires_at: data.expires_at || null,
        code: (data.code || "").toUpperCase(),
      };
      return isEdit
        ? discountsApi.update(discount.id, payload)
        : discountsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discounts"] });
      toast.success(isEdit ? "Remise mise à jour" : "Remise créée");
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.detail ?? "Erreur"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{isEdit ? "Modifier la remise" : "Nouvelle remise"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nom *</label>
              <input className="input" {...register("name", { required: true })} placeholder="Réservation anticipée" />
            </div>
            <div>
              <label className="label">Code promo *</label>
              <input className="input uppercase" {...register("code", { required: !isEdit })}
                placeholder="EARLY20" disabled={isEdit} />
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="input" {...register("discount_type")}>
                <option value="percentage">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (€)</option>
              </select>
            </div>
            <div>
              <label className="label">
                {discountType === "percentage" ? "Taux (%) *" : "Montant (€) *"}
              </label>
              <input type="number" step="0.01" min="0" className="input"
                {...register("value", { required: true, min: 0 })} />
            </div>
            <div>
              <label className="label">Montant min. réservation (€)</label>
              <input type="number" step="0.01" min="0" className="input"
                {...register("min_booking_amount")} placeholder="0" />
            </div>
            <div>
              <label className="label">Utilisations max</label>
              <input type="number" min="1" className="input"
                {...register("max_uses")} placeholder="Illimité" />
            </div>
            <div>
              <label className="label">Expire le</label>
              <input type="datetime-local" className="input" {...register("expires_at")} />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} {...register("description")} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" {...register("is_active")} className="accent-primary-600 w-4 h-4" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Actif</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? "..." : isEdit ? "Mettre à jour" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Discounts() {
  const [modal, setModal] = useState(null);
  const { canEdit } = useAuth();
  const qc = useQueryClient();

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ["discounts"],
    queryFn: discountsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => discountsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["discounts"] }); toast.success("Remise supprimée"); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => discountsApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discounts"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remises & Codes promo</h1>
          <p className="text-gray-500 text-sm mt-1">{discounts.length} code(s)</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal("create")} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouvelle remise
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : discounts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucune remise configurée</p>
          {canEdit && <button onClick={() => setModal("create")} className="btn-primary mt-4">Créer une remise</button>}
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {discounts.map((d) => {
            const usagePercent = d.max_uses ? Math.round((d.current_uses / d.max_uses) * 100) : null;
            const isExpired = d.expires_at && new Date(d.expires_at) < new Date();
            return (
              <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                <div className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  d.discount_type === "percentage" ? "bg-primary-100 text-primary-700" : "bg-green-100 text-green-700"
                )}>
                  {d.discount_type === "percentage" ? <Percent className="w-5 h-5" /> : <Euro className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{d.name}</span>
                    <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{d.code}</code>
                    {!d.is_active && <span className="badge bg-red-100 text-red-600 text-xs">Désactivé</span>}
                    {isExpired && <span className="badge bg-red-100 text-red-600 text-xs">Expiré</span>}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {d.discount_type === "percentage" ? `−${d.value}%` : `−${d.value} €`}
                    {d.min_booking_amount > 0 && ` · min. ${d.min_booking_amount} €`}
                    {d.expires_at && ` · expire ${format(new Date(d.expires_at), "d MMM yyyy", { locale: fr })}`}
                  </p>
                  {d.max_uses && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 max-w-32 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={clsx("h-1.5 rounded-full transition-all", usagePercent >= 90 ? "bg-red-500" : "bg-primary-500")}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{d.current_uses}/{d.max_uses} utilisations</span>
                    </div>
                  )}
                  {!d.max_uses && (
                    <p className="text-xs text-gray-400 mt-0.5">{d.current_uses} utilisation{d.current_uses > 1 ? "s" : ""} · illimité</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: d.id, is_active: !d.is_active })}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                      title={d.is_active ? "Désactiver" : "Activer"}
                    >
                      {d.is_active ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    </button>
                    <button onClick={() => setModal(d)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirm(`Supprimer le code ${d.code} ?`) && deleteMutation.mutate(d.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && <DiscountModal discount={modal === "create" ? null : modal} onClose={() => setModal(null)} />}
    </div>
  );
}
