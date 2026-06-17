"""Seed data: duration rules + seasons + discount codes."""
from database import SessionLocal, engine
from models import Base, DurationPricingRule, Season, Discount, Venue, Client, Booking, BookingVenue

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Duration pricing rules ──────────────────────────────────────────────────────
rules = [
    dict(venue_id=None, name="Semaine (7-13 j)",    min_days=7,  max_days=13,  price_multiplier=0.90),
    dict(venue_id=None, name="Quinzaine (14-29 j)", min_days=14, max_days=29,  price_multiplier=0.85),
    dict(venue_id=None, name="Mensuel (30+ j)",     min_days=30, max_days=None, price_multiplier=0.75),
]
for r in rules:
    exists = db.query(DurationPricingRule).filter(
        DurationPricingRule.name == r["name"],
        DurationPricingRule.venue_id == r["venue_id"],
    ).first()
    if not exists:
        db.add(DurationPricingRule(**r))
        pct = round((1 - r["price_multiplier"]) * 100)
        print(f"Règle durée créée : {r['name']} (−{pct}%)")

db.commit()

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
            min_days=3, max_days=6, price_multiplier=0.95,
        ))
        print(f"Règle spécifique créée pour {chateau.name}: week-end prolongé −5%")
    db.commit()

# ── Seasons ────────────────────────────────────────────────────────────────────
seasons = [
    dict(venue_id=None, name="Haute saison été",      color="#f97316",
         start_month=7,  start_day=1,  end_month=8,  end_day=31, price_multiplier=1.40),
    dict(venue_id=None, name="Basse saison hiver",    color="#64748b",
         start_month=11, start_day=1,  end_month=2,  end_day=28, price_multiplier=0.80),
    dict(venue_id=None, name="Saison mariages",       color="#ec4899",
         start_month=5,  start_day=1,  end_month=6,  end_day=30, price_multiplier=1.25),
    dict(venue_id=None, name="Saison mariages",       color="#ec4899",
         start_month=9,  start_day=1,  end_month=9,  end_day=30, price_multiplier=1.25),
    dict(venue_id=None, name="Fêtes de fin d'année",  color="#a855f7",
         start_month=12, start_day=20, end_month=1,  end_day=5,  price_multiplier=1.60),
]
for s in seasons:
    if not db.query(Season).filter(
        Season.name == s["name"],
        Season.start_month == s["start_month"],
        Season.venue_id == s["venue_id"],
    ).first():
        db.add(Season(**s))
        print(f"Saison créée : {s['name']} (×{s['price_multiplier']})")

# ── Discount codes ─────────────────────────────────────────────────────────────
discounts = [
    dict(name="Réservation anticipée", code="EARLY20",    discount_type="percentage",
         value=20, min_booking_amount=1000,
         description="20% de remise pour toute réservation faite plus de 6 mois à l'avance"),
    dict(name="Fidélité client",       code="FIDELITE10", discount_type="percentage",
         value=10, min_booking_amount=500,
         description="10% offerts pour nos clients fidèles"),
    dict(name="Offre flash 200€",      code="FLASH200",   discount_type="fixed",
         value=200, min_booking_amount=2000, max_uses=50,
         description="200€ offerts sur votre prochain événement"),
    dict(name="Séminaire entreprise",  code="PRO15",      discount_type="percentage",
         value=15, min_booking_amount=0,
         description="15% de remise pour les séminaires d'entreprise"),
]
for d in discounts:
    if not db.query(Discount).filter(Discount.code == d["code"]).first():
        db.add(Discount(**d))
        print(f"Remise créée : {d['name']} ({d['code']})")

db.commit()

# ── Example multi-venue booking ────────────────────────────────────────────────
venues = db.query(Venue).filter(Venue.is_active == True).limit(2).all()
client = db.query(Client).first()

if len(venues) >= 2 and client:
    from datetime import datetime
    start = datetime(2026, 9, 10, 10, 0)
    end   = datetime(2026, 9, 17, 10, 0)
    days  = (end - start).days

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
