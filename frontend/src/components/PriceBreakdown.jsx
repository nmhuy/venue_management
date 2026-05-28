import { Tag, TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle, Loader } from "lucide-react";
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

  const { venues, base_price, discount, total_price } = preview;
  const hasDiscount = discount?.amount > 0;

  return (
    <div className={clsx("rounded-xl border border-gray-200 overflow-hidden text-sm", className)}>
      {/* Per-venue lines */}
      {venues?.map((v, i) => (
        <div key={v.venue_id} className={clsx("px-4 py-3", i > 0 && "border-t border-gray-100")}>
          <p className="font-medium text-gray-800 mb-1.5">{v.venue_name}</p>
          {v.lines?.map((line, j) => {
            const isHigh = line.multiplier > 1;
            const isLow = line.multiplier < 1;
            return (
              <div key={j} className="flex items-center justify-between gap-2 text-gray-600 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {isHigh ? (
                    <TrendingUp className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  ) : isLow ? (
                    <TrendingDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  ) : (
                    <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  )}
                  <span className="truncate">{line.label}</span>
                  <span className="text-gray-400 shrink-0">{line.days}j × {line.rate.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
                  {line.multiplier !== 1 && (
                    <span className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0",
                      isHigh ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                    )}>
                      ×{line.multiplier.toFixed(2)}
                    </span>
                  )}
                </div>
                <span className="font-medium shrink-0">
                  {line.subtotal.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      {/* Subtotal (if multi-venue) */}
      {venues?.length > 1 && (
        <div className="flex justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-gray-700">
          <span>Sous-total</span>
          <span className="font-medium">
            {base_price?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </span>
        </div>
      )}

      {/* Discount */}
      {discount?.error ? (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-red-100 bg-red-50 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {discount.error}
        </div>
      ) : discount?.amount > 0 ? (
        <div className="flex items-center justify-between px-4 py-2 border-t border-green-100 bg-green-50 text-green-700">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <Tag className="w-3.5 h-3.5" />
            <span className="font-medium">{discount.name}</span>
            <span className="text-xs">
              ({discount.type === "percentage" ? `−${discount.value}%` : `−${discount.value} €`})
            </span>
          </div>
          <span className="font-semibold">
            −{discount.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
          </span>
        </div>
      ) : null}

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
