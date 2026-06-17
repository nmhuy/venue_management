"""Seed duration pricing rules and example multi-venue bookings."""
from database import SessionLocal, engine
from models import Base, DurationPricingRule, Venue, Client, Booking, BookingVenue

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Global duration pricing rules ─────────────────────────────────────────────
rules = [
    dict(venue_id=None, name="Semaine (7-13 j)",  min_days=7,  max_days=13, price_multiplier=0.90),
    dict(venue_id=None, name="Quinzaine (14-29 j)", min_days=14, max_days=29, price_multiplier=0.85),
    dict(venue_id=None, name="Mensuel (30+ j)",    min_days=30, max_days=None, price_multiplier=0.75),
]

for r in rules:
    exists = db.query(DurationPricingRule).filter(
        DurationPricingRule.name == r["name"],
        DurationPricingRule.venue_id == r["venue_id"],
    ).first()
    if not exists:
        db.add(DurationPricingRule(**r))
        pct = round((1 - r["price_multiplier"]) * 100)
        print(f"Règle créée : {r['name']} (−{pct}%)")

db.commit()

# ── Venue-specific rule example ────────────────────────────────────────────────
chateau = db.query(Venue).filter(Venue.name.ilike("%château%")).first()
if chateau:
    exists = db.query(DurationPricingRule).filter(
        DurationPricingRule.venue_id == chateau.id,
        DurationPricingRule.min_days == 3,
    ).first()
    if not exists:
        db.add(DurationPricingRule(
            venue_id=chateau.id,
            name="Week-end prolongé (3-6 j)",
            min_days=3,
            max_days=6,
            price_multiplier=0.95,
        ))
        print(f"Règle spécifique créée pour {chateau.name}: week-end prolongé −5%")
    db.commit()

# ── Example multi-venue booking ────────────────────────────────────────────────
venues = db.query(Venue).filter(Venue.is_active == True).limit(2).all()
client = db.query(Client).first()

if len(venues) >= 2 and client:
    from datetime import datetime
    start = datetime(2026, 9, 10, 10, 0)
    end   = datetime(2026, 9, 17, 10, 0)  # 7 days → triggers "Semaine" rule
    days  = (end - start).days

    # Check no duplicate
    exists = db.query(Booking).filter(
        Booking.event_name == "Gala multi-lieux (démo)",
    ).first()
    if not exists:
        base = sum(v.price_per_day * days for v in venues)
        multiplier = 0.90
        booking = Booking(
            venue_id=venues[0].id,
            client_id=client.id,
            event_type="séminaire",
            event_name="Gala multi-lieux (démo)",
            start_date=start,
            end_date=end,
            guest_count=120,
            status="en_attente",
            base_price=round(base, 2),
            duration_multiplier=multiplier,
            duration_rule_name="Semaine (7-13 j)",
            total_price=round(base * multiplier, 2),
        )
        db.add(booking)
        db.flush()
        for v in venues:
            db.add(BookingVenue(
                booking_id=booking.id,
                venue_id=v.id,
                price_per_day=v.price_per_day,
                days=days,
                subtotal=round(v.price_per_day * days, 2),
            ))
        db.commit()
        print(f"Réservation multi-lieux créée : {venues[0].name} + {venues[1].name} — {booking.total_price} €")

db.close()
print("Données tarifaires initialisées.")
