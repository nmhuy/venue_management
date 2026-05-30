from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
import os

from database import engine, get_db, SessionLocal
from models import Base, Venue, Client, Booking
from schemas import DashboardStats
from routers import venues, clients, bookings
from routers.auth_router import router as auth_router
from routers.seasons import router as seasons_router
from routers.discounts import router as discounts_router
from auth import get_current_user

# Créer les tables une seule fois au démarrage (uniquement si elles n'existent pas)
# La colonne price_period est ajoutée via migration SQL
try:
    if Base.metadata.tables["venues"] is None:
        Base.metadata.create_all(bind=engine)
    elif "price_period" not in Base.metadata.tables["venues"].columns:
        # Ajouter la colonne si elle n'existe pas (migration)
        Base.metadata.create_all(bind=engine)
except Exception:
    pass

app = FastAPI(title="Venue Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "null"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(venues.router)
app.include_router(clients.router)
app.include_router(bookings.router)
app.include_router(seasons_router)
app.include_router(discounts_router)


@app.get("/dashboard", response_model=DashboardStats)
def get_dashboard(_: object = Depends(get_current_user)):
    db = SessionLocal()
    try:
        now = datetime.now()
        upcoming_limit = now + timedelta(days=30)

        upcoming = (
            db.query(Booking)
            .options(joinedload(Booking.venue), joinedload(Booking.client))
            .filter(
                Booking.start_date >= now,
                Booking.start_date <= upcoming_limit,
                Booking.status.in_(["en_attente", "confirmé"]),
            )
            .order_by(Booking.start_date)
            .limit(10)
            .all()
        )

        revenue = db.query(Booking).filter(Booking.status == "confirmé").all()
        total_revenue = sum(b.total_price or 0 for b in revenue)

        return DashboardStats(
            total_venues=db.query(Venue).count(),
            active_venues=db.query(Venue).filter(Venue.is_active == True).count(),
            total_clients=db.query(Client).count(),
            total_bookings=db.query(Booking).count(),
            pending_bookings=db.query(Booking).filter(Booking.status == "en_attente").count(),
            confirmed_bookings=db.query(Booking).filter(Booking.status == "confirmé").count(),
            revenue_total=total_revenue,
            upcoming_bookings=upcoming,
        )
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "Venue Management API", "docs": "/docs"}
