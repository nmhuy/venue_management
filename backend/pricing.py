"""Pricing utilities: seasonal multipliers + duration rules + promo codes."""
from datetime import datetime, date, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from models import Venue, Season, Discount, DurationPricingRule


# ── Price period helpers ────────────────────────────────────────────────────────

def _get_price_frequency(period: str) -> tuple:
    if period == "weekly":
        return 7.0, "hebdomadaire"
    elif period == "weekend":
        return 2.0, "week-end"
    else:
        return 1.0, "journalier"


# ── Seasonal helpers ────────────────────────────────────────────────────────────

def _day_in_season(d: date, season: Season) -> bool:
    sm, sd = season.start_month, season.start_day
    em, ed = season.end_month, season.end_day
    month_day = (d.month, d.day)
    start = (sm, sd)
    end = (em, ed)
    if start <= end:
        return start <= month_day <= end
    else:
        return month_day >= start or month_day <= end


def _find_season_for_day(d: date, seasons) -> Optional[Season]:
    for s in seasons:
        if s.is_active and _day_in_season(d, s):
            return s
    return None


def compute_venue_price(venue: Venue, start_date: date, end_date: date, db: Session) -> dict:
    """Compute price for one venue using day-by-day seasonal multipliers.

    The end date is INCLUSIVE: Aug 1→Aug 2 = 2 days.
    """
    period = venue.price_period or "daily"
    freq_days, frequency_label = _get_price_frequency(period)

    seasons = (
        db.query(Season)
        .filter(
            Season.is_active == True,
            (Season.venue_id == venue.id) | (Season.venue_id == None),
        )
        .all()
    )

    # Inclusive day count
    days_total = (end_date - start_date).days + 1
    day_buckets: dict = {}
    current = start_date
    # Iterate over all days inclusively
    for _ in range(days_total):
        s = _find_season_for_day(current, seasons)
        key = s.id if s else None
        day_buckets[key] = day_buckets.get(key, 0) + 1
        current += timedelta(days=1)

    booking_days = {}
    for season_id, raw_days in day_buckets.items():
        booking_days[season_id] = raw_days // freq_days if freq_days > 1 else raw_days

    season_map = {s.id: s for s in seasons}
    lines = []
    subtotal = 0.0
    dominant_key = max(booking_days, key=lambda k: booking_days[k]) if booking_days else None

    for season_id, n_periods in booking_days.items():
        s = season_map.get(season_id) if season_id else None
        multiplier = s.price_multiplier if s else 1.0
        rate = venue.price_per_day * multiplier
        line_total = rate * n_periods
        subtotal += line_total
        lines.append({
            "label": s.name if s else "Tarif standard",
            "days": n_periods,
            "rate": rate,
            "multiplier": multiplier,
            "subtotal": line_total,
        })

    dominant_season = season_map.get(dominant_key) if dominant_key else None

    return {
        "venue_id": venue.id,
        "venue_name": venue.name,
        "price_per_day": venue.price_per_day,
        "price_period": venue.price_period,
        "frequency": frequency_label,
        "days": days_total,
        "lines": lines,
        "subtotal": round(subtotal, 2),
        "seasonal_multiplier": dominant_season.price_multiplier if dominant_season else 1.0,
        "season_name": dominant_season.name if dominant_season else None,
    }


# ── Duration rule lookup ────────────────────────────────────────────────────────

def find_duration_rule(days: int, venue_ids: List[int], db: Session) -> Optional[DurationPricingRule]:
    """Return the best applicable duration rule.

    Venue-specific rules take priority. Among matches, highest min_days wins.
    """
    def _query(venue_id):
        q = db.query(DurationPricingRule).filter(
            DurationPricingRule.is_active == True,
            DurationPricingRule.venue_id == venue_id,
            DurationPricingRule.min_days <= days,
        ).filter(
            (DurationPricingRule.max_days >= days) | (DurationPricingRule.max_days == None)
        )
        return q.order_by(DurationPricingRule.min_days.desc()).first()

    if len(venue_ids) == 1:
        rule = _query(venue_ids[0])
        if rule:
            return rule
    return _query(None)


# ── Discount application ────────────────────────────────────────────────────────

def apply_discount(base_price: float, discount: Optional[Discount]) -> tuple:
    """Return (discount_amount, final_price)."""
    if not discount or not discount.is_active:
        return 0.0, base_price
    if discount.min_booking_amount and base_price < discount.min_booking_amount:
        return 0.0, base_price
    if discount.discount_type == "percentage":
        amount = round(base_price * discount.value / 100, 2)
    else:
        amount = min(round(discount.value, 2), base_price)
    return amount, round(base_price - amount, 2)


# ── Full price preview ──────────────────────────────────────────────────────────

def build_price_preview(
    venue_ids: List[int],
    start_date,
    end_date,
    db: Session,
    discount_code: Optional[str] = None,
) -> dict:
    """Full price breakdown:
      1. Per-venue seasonal pricing
      2. Duration rule multiplier
      3. Promo code discount
    """
    if isinstance(start_date, datetime):
        start_date = start_date.date()
    elif isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date).date()

    if isinstance(end_date, datetime):
        end_date = end_date.date()
    elif isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date).date()

    venues = db.query(Venue).filter(Venue.id.in_(venue_ids), Venue.is_active == True).all()
    if not venues:
        return {"error": "Aucun lieu valide"}

    venue_details = [compute_venue_price(v, start_date, end_date, db) for v in venues]
    base_price = round(sum(v["subtotal"] for v in venue_details), 2)
    days = venue_details[0]["days"] if venue_details else 1

    # Duration discount
    duration_rule = find_duration_rule(days, venue_ids, db)
    duration_discount = None
    after_duration = base_price

    if duration_rule and duration_rule.price_multiplier != 1.0:
        duration_discount_amount = round(base_price * (1.0 - duration_rule.price_multiplier), 2)
        after_duration = round(base_price * duration_rule.price_multiplier, 2)
        duration_discount = {
            "id": duration_rule.id,
            "name": duration_rule.name,
            "multiplier": duration_rule.price_multiplier,
            "discount_pct": round((1.0 - duration_rule.price_multiplier) * 100, 1),
            "discount_amount": duration_discount_amount,
        }

    # Promo code
    discount = None
    discount_error = None
    if discount_code:
        discount = db.query(Discount).filter(
            Discount.code == discount_code.upper(),
            Discount.is_active == True,
        ).first()
        if not discount:
            discount_error = "Code invalide ou expiré"
        elif discount.expires_at and discount.expires_at < datetime.now():
            discount_error = "Code expiré"
            discount = None
        elif discount.max_uses and discount.current_uses >= discount.max_uses:
            discount_error = "Code épuisé"
            discount = None
        elif after_duration < (discount.min_booking_amount or 0):
            discount_error = f"Montant minimum requis : {discount.min_booking_amount:.0f} €"
            discount = None

    promo_amount, total_price = apply_discount(after_duration, discount)

    return {
        "days": days,
        "venues": venue_details,
        "base_price": base_price,
        "duration_discount": duration_discount,
        "discount": {
            "id": discount.id if discount else None,
            "code": discount.code if discount else None,
            "name": discount.name if discount else None,
            "type": discount.discount_type if discount else None,
            "value": discount.value if discount else None,
            "amount": promo_amount,
            "error": discount_error,
        },
        "total_price": round(total_price, 2),
    }
