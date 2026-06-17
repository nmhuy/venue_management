import { TrendingDown, Minus, Loader, Timer } from "lucide-react";
import clsx from "clsx";

export default function PriceBreakdown({ preview, loading, className }) {
  if (loading) {
    return (
      <div className={clsx("flex items-center gap-2 text-sm text-gray-400 py-3", className)}>
        <Loader className="w-4 h-4 animate-spin" /> Calcul du prix...
      </div>
    );
  }
  if (!preview) return null;

  const { venues, base_price, duration_discount, total_price, days } = preview;
  const hasDiscount = duration_discount?.discount_amount > 0;

  return (
    <div className={clsx("rounded-xl border border-gray-200 overflow-hidden text-sm", className)}>
      {/* Per-venue lines */}
      {venues?.map((v, i) => (
        <div key={v.venue_id} className={clsx("px-4 py-3", i > 0 && "border-t border-gray-100")}>
          <p className="font-medium text-gray-800 mb-1.5">{v.venue_name}</p>
          <div className="flex items-center justify-between gap-2 text-gray-600">
            <div className="flex items-center gap-1.5 min-w-0">
              <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">
                {v.days}j × {v.price_per_day.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
              </span>
            </div>
            <span className="font-medium shrink-0">
              {v.subtotal.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </span>
          </div>
        </div>
      ))}

      {/* Subtotal (multi-venue only) */}
      {venues?.length > 1 && (
        <div className="flex justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-gray-700">
          <span>Sous-total ({days} jour{days > 1 ? "s" : ""})</span>
          <span className="font-medium">
            {base_price?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </span>
        </div>
      )}

      {/* Duration discount */}
      {hasDiscount && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-blue-100 bg-blue-50 text-blue-700">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 shrink-0" />
            <TrendingDown className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">{duration_discount.name}</span>
            <span className="text-xs">(−{duration_discount.discount_pct}%)</span>
          </div>
          <span className="font-semibold">
            −{duration_discount.discount_amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </span>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 font-semibold text-gray-900">
        <span>Total</span>
        <div className="text-right">
          {hasDiscount && (
            <p className="text-xs text-gray-400 line-through font-normal">
              {base_price?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          )}
          <p className="text-base text-primary-700">
            {total_price?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </p>
        </div>
      </div>
    </div>
  );
}
