"""Add demo users (run once, safe to re-run)."""
from database import SessionLocal, engine
from models import Base, User
from auth import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

users = [
    {"username": "admin", "email": "admin@venuemanager.fr", "password": "admin123", "full_name": "Administrateur", "role": "admin"},
    {"username": "editeur", "email": "editeur@venuemanager.fr", "password": "edit123", "full_name": "Marie Dupont", "role": "éditeur"},
    {"username": "lecteur", "email": "lecteur@venuemanager.fr", "password": "view123", "full_name": "Jean Martin", "role": "lecteur"},
]

for u in users:
    if not db.query(User).filter(User.username == u["username"]).first():
        db.add(User(
            username=u["username"],
            email=u["email"],
            hashed_password=hash_password(u["password"]),
            full_name=u["full_name"],
            role=u["role"],
        ))
        print(f"Créé : {u['username']} ({u['role']}) — mot de passe : {u['password']}")
    else:
        print(f"Déjà existant : {u['username']}")

db.commit()
db.close()
