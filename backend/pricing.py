"""Pricing utilities: duration-based multiplier + per-venue price breakdown."""
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from models import Venue, DurationPricingRule


def find_duration_rule(days: int, venue_ids: List[int], db: Session) -> Optional[DurationPricingRule]:
    """Return the best applicable duration rule for this booking.

    Venue-specific rules take priority over global ones.
    Among matching rules, the one with the highest min_days wins (most specific).
    """
    def _query(venue_id):
        q = db.query(DurationPricingRule).filter(
            DurationPricingRule.is_active == True,
            DurationPricingRule.venue_id == venue_id,
            DurationPricingRule.min_days <= days,
        )
        # max_days NULL means "no upper bound"
        q = q.filter(
            (DurationPricingRule.max_days >= days) | (DurationPricingRule.max_days == None)
        )
        return q.order_by(DurationPricingRule.min_days.desc()).first()

    # 1. Try venue-specific rules (only meaningful for single-venue bookings)
    if len(venue_ids) == 1:
        rule = _query(venue_ids[0])
        if rule:
            return rule

    # 2. Fall back to global rules
    return _query(None)


def build_price_preview(venue_ids: List[int], start_date, end_date, db: Session) -> dict:
    """Return a full price breakdown dict for the given venues and date range."""
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date)
    if isinstance(end_date, str):
        end_date = datetime.fromisoformat(end_date)

    days = (end_date - start_date).days + 1

    venues_data = []
    base_price = 0.0

    for vid in venue_ids:
        venue = db.query(Venue).filter(Venue.id == vid, Venue.is_active == True).first()
        if not venue:
            continue
        subtotal = round(venue.price_per_day * days, 2)
        base_price += subtotal
        venues_data.append({
            "venue_id": vid,
            "venue_name": venue.name,
            "price_per_day": venue.price_per_day,
            "days": days,
            "subtotal": subtotal,
        })

    base_price = round(base_price, 2)
    rule = find_duration_rule(days, venue_ids, db)

    duration_discount = None
    total_price = base_price

    if rule and rule.price_multiplier != 1.0:
        discount_amount = round(base_price * (1.0 - rule.price_multiplier), 2)
        total_price = round(base_price * rule.price_multiplier, 2)
        duration_discount = {
            "id": rule.id,
            "name": rule.name,
            "multiplier": rule.price_multiplier,
            "discount_pct": round((1.0 - rule.price_multiplier) * 100, 1),
            "discount_amount": discount_amount,
        }

    return {
        "days": days,
        "venues": venues_data,
        "base_price": base_price,
        "duration_discount": duration_discount,
        "total_price": round(total_price, 2),
    }
