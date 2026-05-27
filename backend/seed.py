"""Seed script to populate the database with sample data."""
from database import SessionLocal, engine
from models import Base, Venue, Client, Booking
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)

db = SessionLocal()

venues_data = [
    {
        "name": "Château des Roses",
        "description": "Un magnifique château du XVIIIe siècle niché dans un parc arboré de 5 hectares. Salle de réception pouvant accueillir jusqu'à 300 personnes, chapelle privée et logements pour les proches.",
        "address": "12 Route du Château",
        "city": "Versailles",
        "capacity_min": 50,
        "capacity_max": 300,
        "price_per_day": 4500.0,
        "surface_m2": 850.0,
        "has_parking": True,
        "has_catering": True,
        "has_accommodation": True,
        "has_garden": True,
        "has_pool": True,
        "has_sound_system": True,
        "event_types": "mariage,fête",
    },
    {
        "name": "Domaine de la Forêt",
        "description": "Domaine rustique et chaleureux au cœur de la forêt de Fontainebleau. Idéal pour les séminaires d'entreprise avec salles modulables et équipements audiovisuels.",
        "address": "8 Allée des Chênes",
        "city": "Fontainebleau",
        "capacity_min": 10,
        "capacity_max": 120,
        "price_per_day": 1800.0,
        "surface_m2": 400.0,
        "has_parking": True,
        "has_catering": True,
        "has_accommodation": True,
        "has_garden": True,
        "has_pool": False,
        "has_sound_system": True,
        "event_types": "séminaire,autre",
    },
    {
        "name": "La Villa Méditerranée",
        "description": "Villa avec piscine et vue mer panoramique, parfaite pour des fêtes et célébrations en plein air. Terrasse de 200m² et jardins paysagés.",
        "address": "47 Boulevard du Littoral",
        "city": "Nice",
        "capacity_min": 20,
        "capacity_max": 150,
        "price_per_day": 3200.0,
        "surface_m2": 600.0,
        "has_parking": True,
        "has_catering": False,
        "has_accommodation": True,
        "has_garden": True,
        "has_pool": True,
        "has_sound_system": True,
        "event_types": "mariage,fête,autre",
    },
    {
        "name": "Espace Innovation Paris",
        "description": "Lieu moderne en plein cœur de Paris, idéal pour conférences et séminaires d'entreprise. Équipements high-tech, espaces coworking et salle de conférence principale.",
        "address": "23 Rue de la République",
        "city": "Paris",
        "capacity_min": 5,
        "capacity_max": 200,
        "price_per_day": 2500.0,
        "surface_m2": 500.0,
        "has_parking": False,
        "has_catering": True,
        "has_accommodation": False,
        "has_garden": False,
        "has_pool": False,
        "has_sound_system": True,
        "event_types": "séminaire,autre",
    },
    {
        "name": "Mas Provençal",
        "description": "Authentique mas provençal avec oliveraie, vignes et piscine naturelle. Un cadre exceptionnel pour vos mariages et fêtes de famille dans l'arrière-pays provençal.",
        "address": "Route des Baux",
        "city": "Les Baux-de-Provence",
        "capacity_min": 30,
        "capacity_max": 200,
        "price_per_day": 3800.0,
        "surface_m2": 700.0,
        "has_parking": True,
        "has_catering": True,
        "has_accommodation": True,
        "has_garden": True,
        "has_pool": True,
        "has_sound_system": False,
        "event_types": "mariage,fête",
    },
]

clients_data = [
    {"first_name": "Sophie", "last_name": "Martin", "email": "sophie.martin@email.fr", "phone": "06 12 34 56 78"},
    {"first_name": "Thomas", "last_name": "Bernard", "email": "t.bernard@company.fr", "phone": "07 23 45 67 89"},
    {"first_name": "Marie", "last_name": "Dubois", "email": "marie.dubois@email.fr", "phone": "06 34 56 78 90"},
    {"first_name": "Pierre", "last_name": "Moreau", "email": "p.moreau@startup.io", "phone": "07 45 67 89 01"},
    {"first_name": "Camille", "last_name": "Laurent", "email": "camille.l@email.fr", "phone": "06 56 78 90 12"},
]

venues = []
for v in venues_data:
    venue = Venue(**v)
    db.add(venue)
    venues.append(venue)

clients = []
for c in clients_data:
    client = Client(**c)
    db.add(client)
    clients.append(client)

db.commit()

now = datetime.now()
bookings_data = [
    {
        "venue": venues[0], "client": clients[0],
        "event_type": "mariage", "event_name": "Mariage Martin-Dupont",
        "start_date": now + timedelta(days=15), "end_date": now + timedelta(days=16),
        "guest_count": 180, "status": "confirmé", "total_price": 4500.0,
        "deposit_paid": True, "deposit_amount": 1500.0,
    },
    {
        "venue": venues[1], "client": clients[1],
        "event_type": "séminaire", "event_name": "Séminaire Q3 TechCorp",
        "start_date": now + timedelta(days=7), "end_date": now + timedelta(days=9),
        "guest_count": 45, "status": "confirmé", "total_price": 3600.0,
        "deposit_paid": True, "deposit_amount": 900.0,
    },
    {
        "venue": venues[2], "client": clients[2],
        "event_type": "fête", "event_name": "Fête d'anniversaire 40 ans",
        "start_date": now + timedelta(days=25), "end_date": now + timedelta(days=26),
        "guest_count": 80, "status": "en_attente", "total_price": 3200.0,
        "deposit_paid": False, "deposit_amount": 0.0,
    },
    {
        "venue": venues[3], "client": clients[3],
        "event_type": "séminaire", "event_name": "Kickoff Annuel Startup.io",
        "start_date": now + timedelta(days=3), "end_date": now + timedelta(days=4),
        "guest_count": 30, "status": "confirmé", "total_price": 2500.0,
        "deposit_paid": True, "deposit_amount": 800.0,
    },
    {
        "venue": venues[4], "client": clients[4],
        "event_type": "mariage", "event_name": "Mariage Laurent-Petit",
        "start_date": now + timedelta(days=45), "end_date": now + timedelta(days=47),
        "guest_count": 120, "status": "en_attente", "total_price": 7600.0,
        "deposit_paid": False, "deposit_amount": 0.0,
    },
]

for b in bookings_data:
    venue = b.pop("venue")
    client = b.pop("client")
    booking = Booking(venue_id=venue.id, client_id=client.id, **b)
    db.add(booking)

db.commit()
db.close()
print("Base de données initialisée avec succès !")
