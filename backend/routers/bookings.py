from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime
from auth import get_current_user, require_editor
from database import get_db
from models import Booking, Venue
from schemas import BookingCreate, BookingUpdate, BookingOut

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/", response_model=List[BookingOut])
def list_bookings(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    venue_id: Optional[int] = None,
    client_id: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    query = db.query(Booking).options(joinedload(Booking.venue), joinedload(Booking.client))
    if status:
        query = query.filter(Booking.status == status)
    if event_type:
        query = query.filter(Booking.event_type == event_type)
    if venue_id:
        query = query.filter(Booking.venue_id == venue_id)
    if client_id:
        query = query.filter(Booking.client_id == client_id)
    if from_date:
        query = query.filter(Booking.start_date >= datetime.fromisoformat(from_date))
    if to_date:
        query = query.filter(Booking.end_date <= datetime.fromisoformat(to_date))
    return query.order_by(Booking.start_date).offset(skip).limit(limit).all()


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db), _: object = Depends(get_current_user)):
    booking = (
        db.query(Booking)
        .options(joinedload(Booking.venue), joinedload(Booking.client))
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    return booking


@router.post("/", response_model=BookingOut, status_code=201)
def create_booking(booking: BookingCreate, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    if booking.end_date <= booking.start_date:
        raise HTTPException(status_code=400, detail="La date de fin doit être après la date de début")

    conflicting = db.query(Booking).filter(
        Booking.venue_id == booking.venue_id,
        Booking.status.in_(["en_attente", "confirmé"]),
        Booking.start_date < booking.end_date,
        Booking.end_date > booking.start_date,
    ).count()
    if conflicting:
        raise HTTPException(status_code=409, detail="Le lieu est déjà réservé sur cette période")

    venue = db.query(Venue).filter(Venue.id == booking.venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")

    data = booking.model_dump()
    if data.get("total_price") is None:
        days = (booking.end_date - booking.start_date).days or 1
        data["total_price"] = venue.price_per_day * days

    db_booking = Booking(**data)
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)

    return (
        db.query(Booking)
        .options(joinedload(Booking.venue), joinedload(Booking.client))
        .filter(Booking.id == db_booking.id)
        .first()
    )


@router.put("/{booking_id}", response_model=BookingOut)
def update_booking(booking_id: int, booking: BookingUpdate, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    for field, value in booking.model_dump(exclude_unset=True).items():
        setattr(db_booking, field, value)
    db.commit()
    db.refresh(db_booking)
    return (
        db.query(Booking)
        .options(joinedload(Booking.venue), joinedload(Booking.client))
        .filter(Booking.id == booking_id)
        .first()
    )


@router.delete("/{booking_id}", status_code=204)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    db_booking.status = "annulé"
    db.commit()
