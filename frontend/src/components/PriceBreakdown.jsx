import { Tag, TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle, Timer, Loader } from "lucide-react";
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

  const { venues, base_price, duration_discount, discount, total_price, days } = preview;
  const hasDurationDiscount = duration_discount?.discount_amount > 0;
  const hasPromoDiscount = discount?.amount > 0;
  const hasAnyDiscount = hasDurationDiscount || hasPromoDiscount;

  return (
    <div className={clsx("rounded-xl border border-gray-200 overflow-hidden text-sm", className)}>
      {/* Per-venue lines with seasonal breakdown */}
      {venues?.map((v, i) => (
        <div key={v.venue_id} className={clsx("px-4 py-3", i > 0 && "border-t border-gray-100")}>
          <p className="font-medium text-gray-800 mb-1.5">{v.venue_name}</p>
          {v.lines?.length > 0 ? (
            v.lines.map((line, j) => {
              const isHigh = line.multiplier > 1;
              const isLow = line.multiplier < 1;
              return (
                <div key={j} className="flex items-center justify-between gap-2 text-gray-600 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    {isHigh ? (
                      <TrendingUp className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    ) : isLow ? (
                      <TrendingDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <span className="truncate">{line.label}</span>
                    <span className="text-gray-400 shrink-0">
                      {line.days}j × {line.rate.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </span>
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
            })
          ) : (
            <div className="flex items-center justify-between gap-2 text-gray-600">
              <div className="flex items-center gap-1.5">
                <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{v.days}j × {v.price_per_day.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
              </div>
              <span className="font-medium">{v.subtotal.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
            </div>
          )}
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
      {hasDurationDiscount && (
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

      {/* Promo code discount */}
      {discount?.error ? (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-red-100 bg-red-50 text-red-700 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {discount.error}
        </div>
      ) : hasPromoDiscount ? (
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
          {hasAnyDiscount && (
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
