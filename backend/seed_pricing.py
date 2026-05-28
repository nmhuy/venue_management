"""Seed seasons and discounts for demo."""
from database import SessionLocal, engine
from models import Base, Season, Discount, Venue

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# --- Seasons ---
venues = db.query(Venue).all()
venue_ids = {v.name: v.id for v in venues}

seasons = [
    # Global haute saison estivale
    dict(venue_id=None, name="Haute saison été", color="#f97316",
         start_month=7, start_day=1, end_month=8, end_day=31,
         price_multiplier=1.40),
    # Global basse saison hivernale
    dict(venue_id=None, name="Basse saison hiver", color="#64748b",
         start_month=11, start_day=1, end_month=2, end_day=28,
         price_multiplier=0.80),
    # Saison spéciale mariages (mai-juin + septembre)
    dict(venue_id=None, name="Saison mariages", color="#ec4899",
         start_month=5, start_day=1, end_month=6, end_day=30,
         price_multiplier=1.25),
    dict(venue_id=None, name="Saison mariages", color="#ec4899",
         start_month=9, start_day=1, end_month=9, end_day=30,
         price_multiplier=1.25),
    # Fêtes de fin d'année
    dict(venue_id=None, name="Fêtes de fin d'année", color="#a855f7",
         start_month=12, start_day=20, end_month=1, end_day=5,
         price_multiplier=1.60),
]

for s in seasons:
    if not db.query(Season).filter(
        Season.name == s["name"],
        Season.start_month == s["start_month"],
        Season.venue_id == s["venue_id"],
    ).first():
        db.add(Season(**s))
        print(f"Saison créée : {s['name']} (×{s['price_multiplier']})")

# --- Discounts ---
discounts = [
    dict(name="Réservation anticipée", code="EARLY20", discount_type="percentage",
         value=20, min_booking_amount=1000, description="20% de remise pour toute réservation faite plus de 6 mois à l'avance"),
    dict(name="Fidélité client", code="FIDELITE10", discount_type="percentage",
         value=10, min_booking_amount=500, description="10% offerts pour nos clients fidèles"),
    dict(name="Offre flash 200€", code="FLASH200", discount_type="fixed",
         value=200, min_booking_amount=2000, max_uses=50, description="200€ offerts sur votre prochain événement"),
    dict(name="Séminaire entreprise", code="PRO15", discount_type="percentage",
         value=15, min_booking_amount=0, description="15% de remise pour les séminaires d'entreprise"),
]

for d in discounts:
    if not db.query(Discount).filter(Discount.code == d["code"]).first():
        db.add(Discount(**d))
        print(f"Remise créée : {d['name']} ({d['code']})")

db.commit()
db.close()
print("Données tarifaires initialisées.")
