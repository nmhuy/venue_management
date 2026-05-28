"""Price calculation utilities: seasonal multipliers + discount application."""
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from models import Venue, Season, Discount, BookingVenue


def _day_in_season(d: date, season: Season) -> bool:
    """Return True if calendar day `d` falls inside `season` (ignores year)."""
    sm, sd = season.start_month, season.start_day
    em, ed = season.end_month, season.end_day
    month_day = (d.month, d.day)
    start = (sm, sd)
    end = (em, ed)

    if start <= end:
        # Normal range: e.g. Jun 1 → Aug 31
        return start <= month_day <= end
    else:
        # Wraps around year-end: e.g. Dec 15 → Jan 15
        return month_day >= start or month_day <= end


def _find_season_for_day(d: date, seasons: list[Season]) -> Optional[Season]:
    """Return the first active season that covers day `d`, or None."""
    for s in seasons:
        if s.is_active and _day_in_season(d, s):
            return s
    return None


def compute_venue_price(
    venue: Venue,
    start_date: date,
    end_date: date,
    db: Session,
) -> dict:
    """
    Compute price for one venue over [start_date, end_date).

    Returns:
        {
            "venue_id": int,
            "venue_name": str,
            "price_per_day": float,
            "days": int,
            "lines": [{"label": str, "days": int, "rate": float, "subtotal": float, "multiplier": float}],
            "subtotal": float,
            "seasonal_multiplier": float,   # dominant multiplier (for BookingVenue)
            "season_name": str | None,
        }
    """
    # Collect applicable seasons (venue-specific first, then global)
    seasons = (
        db.query(Season)
        .filter(
            Season.is_active == True,
            (Season.venue_id == venue.id) | (Season.venue_id == None),  # noqa
        )
        .all()
    )

    days_total = max((end_date - start_date).days, 1)
    # Group consecutive days by season
    day_buckets: dict[Optional[int], int] = {}  # season_id → days count
    current = start_date
    while current < end_date:
        s = _find_season_for_day(current, seasons)
        key = s.id if s else None
        day_buckets[key] = day_buckets.get(key, 0) + 1
        current += timedelta(days=1)

    season_map = {s.id: s for s in seasons}
    lines = []
    subtotal = 0.0
    # Dominant season (most days)
    dominant_key = max(day_buckets, key=lambda k: day_buckets[k])

    for season_id, n_days in day_buckets.items():
        s = season_map.get(season_id) if season_id else None
        multiplier = s.price_multiplier if s else 1.0
        rate = venue.price_per_day * multiplier
        line_total = rate * n_days
        subtotal += line_total
        lines.append({
            "label": s.name if s else "Tarif standard",
            "days": n_days,
            "rate": rate,
            "multiplier": multiplier,
            "subtotal": line_total,
        })

    dominant_season = season_map.get(dominant_key) if dominant_key else None

    return {
        "venue_id": venue.id,
        "venue_name": venue.name,
        "price_per_day": venue.price_per_day,
        "days": days_total,
        "lines": lines,
        "subtotal": round(subtotal, 2),
        "seasonal_multiplier": dominant_season.price_multiplier if dominant_season else 1.0,
        "season_name": dominant_season.name if dominant_season else None,
    }


def apply_discount(base_price: float, discount: Optional[Discount]) -> tuple[float, float]:
    """
    Return (discount_amount, final_price).
    """
    if not discount or not discount.is_active:
        return 0.0, base_price
    if discount.min_booking_amount and base_price < discount.min_booking_amount:
        return 0.0, base_price
    if discount.discount_type == "percentage":
        amount = round(base_price * discount.value / 100, 2)
    else:
        amount = min(round(discount.value, 2), base_price)
    return amount, round(base_price - amount, 2)


def build_price_preview(
    venue_ids: list[int],
    start_date: date,
    end_date: date,
    discount_code: Optional[str],
    db: Session,
) -> dict:
    """Full price preview for a booking (used by both create and the preview endpoint)."""
    venues = db.query(Venue).filter(Venue.id.in_(venue_ids), Venue.is_active == True).all()
    if not venues:
        return {"error": "Aucun lieu valide"}

    venue_details = [compute_venue_price(v, start_date, end_date, db) for v in venues]
    base_price = sum(v["subtotal"] for v in venue_details)

    discount = None
    discount_error = None
    if discount_code:
        from datetime import datetime
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
        elif base_price < (discount.min_booking_amount or 0):
            discount_error = f"Montant minimum requis : {discount.min_booking_amount:.0f} €"
            discount = None

    discount_amount, total = apply_discount(base_price, discount)

    return {
        "venues": venue_details,
        "base_price": round(base_price, 2),
        "discount": {
            "id": discount.id if discount else None,
            "code": discount.code if discount else None,
            "name": discount.name if discount else None,
            "type": discount.discount_type if discount else None,
            "value": discount.value if discount else None,
            "amount": discount_amount,
            "error": discount_error,
        },
        "total_price": round(total, 2),
    }
