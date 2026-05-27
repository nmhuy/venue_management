import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "../api";
import { useAuth } from "../AuthContext";
import { Plus, Search, User, Mail, Phone, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function ClientModal({ client, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!client;

  const { register, handleSubmit } = useForm({ defaultValues: client ?? {} });

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? clientsApi.update(client.id, data) : clientsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(isEdit ? "Client mis à jour" : "Client créé");
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.detail ?? "Erreur"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{isEdit ? "Modifier le client" : "Nouveau client"}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" {...register("first_name", { required: true })} />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" {...register("last_name", { required: true })} />
            </div>
            <div className="col-span-2">
              <label className="label">Email *</label>
              <input type="email" className="input" {...register("email", { required: true })} />
            </div>
            <div className="col-span-2">
              <label className="label">Téléphone</label>
              <input className="input" {...register("phone")} placeholder="06 12 34 56 78" />
            </div>
            <div className="col-span-2">
              <label className="label">Adresse</label>
              <input className="input" {...register("address")} />
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

export default function Clients() {
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { canEdit } = useAuth();
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => clientsApi.list({ search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => clientsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé");
    },
    onError: () => toast.error("Impossible de supprimer ce client (des réservations existent)"),
  });

  const initials = (c) => `${c.first_name[0]}${c.last_name[0]}`.toUpperCase();

  const colors = ["bg-primary-100 text-primary-700", "bg-blue-100 text-blue-700", "bg-green-100 text-green-700", "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client(s) enregistré(s)</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal("create")} className="btn-primary">
            <Plus className="w-4 h-4" /> Nouveau client
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun client</p>
          {canEdit && <button onClick={() => setModal("create")} className="btn-primary mt-4">Ajouter un client</button>}
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {clients.map((c, i) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${colors[i % colors.length]}`}>
                {initials(c)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.phone}</span>}
                </div>
              </div>
              <div className="text-xs text-gray-400 shrink-0 hidden sm:block">
                Client depuis {format(new Date(c.created_at), "MMM yyyy", { locale: fr })}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button onClick={() => setModal(c)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => confirm(`Supprimer ${c.first_name} ${c.last_name} ?`) && deleteMutation.mutate(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ClientModal
          client={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
