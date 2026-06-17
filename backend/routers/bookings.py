from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from auth import get_current_user, require_editor
from database import get_db
from models import Booking, BookingVenue, Venue, Discount
from schemas import BookingCreate, BookingUpdate, BookingOut, PricePreviewIn
from pricing import build_price_preview, find_duration_rule

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _load_booking(booking_id: int, db: Session) -> Booking:
    b = (
        db.query(Booking)
        .options(
            joinedload(Booking.venue),
            joinedload(Booking.client),
            joinedload(Booking.discount),
            joinedload(Booking.booking_venues).joinedload(BookingVenue.venue),
        )
        .filter(Booking.id == booking_id)
        .first()
    )
    if not b:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    return b


def _check_conflicts(venue_id: int, start: datetime, end: datetime, db: Session, exclude_id: int = None):
    # Use <= / >= so that the end date is treated as inclusive:
    # a booking ending on day X blocks another booking starting on day X.
    q = db.query(Booking).filter(
        Booking.venue_id == venue_id,
        Booking.status.in_(["en_attente", "confirmé"]),
        Booking.start_date <= end,
        Booking.end_date >= start,
    )
    if exclude_id:
        q = q.filter(Booking.id != exclude_id)
    from models import BookingVenue as BV
    q2 = (
        db.query(Booking)
        .join(BV, BV.booking_id == Booking.id)
        .filter(
            BV.venue_id == venue_id,
            Booking.status.in_(["en_attente", "confirmé"]),
            Booking.start_date <= end,
            Booking.end_date >= start,
        )
    )
    if exclude_id:
        q2 = q2.filter(Booking.id != exclude_id)
    return q.count() + q2.count()


@router.post("/price-preview")
def price_preview(
    data: PricePreviewIn,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    if data.end_date <= data.start_date:
        raise HTTPException(status_code=400, detail="La date de fin doit être après la date de début")
    if not data.venue_ids:
        raise HTTPException(status_code=400, detail="Sélectionnez au moins un lieu")
    return build_price_preview(
        data.venue_ids, data.start_date, data.end_date, db,
        discount_code=data.discount_code,
    )


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
    query = (
        db.query(Booking)
        .options(
            joinedload(Booking.venue),
            joinedload(Booking.client),
            joinedload(Booking.discount),
            joinedload(Booking.booking_venues).joinedload(BookingVenue.venue),
        )
    )
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
    return _load_booking(booking_id, db)


@router.post("/", response_model=BookingOut, status_code=201)
def create_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    if booking.end_date <= booking.start_date:
        raise HTTPException(status_code=400, detail="La date de fin doit être après la date de début")
    if not booking.venue_ids:
        raise HTTPException(status_code=400, detail="Sélectionnez au moins un lieu")

    for vid in booking.venue_ids:
        if not db.query(Venue).filter(Venue.id == vid, Venue.is_active == True).first():
            raise HTTPException(status_code=404, detail=f"Lieu {vid} non trouvé")
        if _check_conflicts(vid, booking.start_date, booking.end_date, db):
            venue = db.query(Venue).get(vid)
            raise HTTPException(
                status_code=409,
                detail=f"Le lieu « {venue.name} » est déjà réservé sur cette période",
            )

    preview = build_price_preview(
        booking.venue_ids, booking.start_date, booking.end_date, db,
        discount_code=booking.discount_code,
    )

    # Resolve discount FK
    discount_obj = None
    if booking.discount_code and preview.get("discount", {}).get("id"):
        discount_obj = db.query(Discount).get(preview["discount"]["id"])

    duration_disc = preview.get("duration_discount")

    db_booking = Booking(
        venue_id=booking.venue_ids[0],
        client_id=booking.client_id,
        event_type=booking.event_type,
        event_name=booking.event_name,
        start_date=booking.start_date,
        end_date=booking.end_date,
        guest_count=booking.guest_count,
        status=booking.status,
        base_price=preview["base_price"],
        duration_multiplier=duration_disc["multiplier"] if duration_disc else 1.0,
        duration_rule_name=duration_disc["name"] if duration_disc else None,
        discount_id=discount_obj.id if discount_obj else None,
        discount_amount=preview["discount"]["amount"] if preview.get("discount") else 0,
        total_price=preview["total_price"],
        deposit_paid=booking.deposit_paid,
        deposit_amount=booking.deposit_amount,
        notes=booking.notes,
    )
    db.add(db_booking)
    db.flush()

    for v in preview["venues"]:
        db.add(BookingVenue(
            booking_id=db_booking.id,
            venue_id=v["venue_id"],
            price_per_day=v["price_per_day"],
            days=v["days"],
            seasonal_multiplier=v.get("seasonal_multiplier", 1.0),
            season_name=v.get("season_name"),
            subtotal=v["subtotal"],
        ))

    if discount_obj:
        discount_obj.current_uses += 1

    db.commit()
    return _load_booking(db_booking.id, db)


@router.put("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: int,
    booking: BookingUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")

    data = booking.model_dump(exclude_unset=True)
    venue_ids = data.pop("venue_ids", None)
    discount_code = data.pop("discount_code", None)

    start = data.get("start_date", db_booking.start_date)
    end = data.get("end_date", db_booking.end_date)
    ids = venue_ids or [bv.venue_id for bv in db_booking.booking_venues] or [db_booking.venue_id]

    if venue_ids or "start_date" in data or "end_date" in data or discount_code is not None:
        if end <= start:
            raise HTTPException(status_code=400, detail="La date de fin doit être après la date de début")

        for vid in ids:
            if _check_conflicts(vid, start, end, db, exclude_id=booking_id):
                venue = db.query(Venue).get(vid)
                raise HTTPException(
                    status_code=409,
                    detail=f"Le lieu « {venue.name} » est déjà réservé sur cette période",
                )

        preview = build_price_preview(ids, start, end, db, discount_code=discount_code)

        discount_obj = None
        if discount_code and preview.get("discount", {}).get("id"):
            discount_obj = db.query(Discount).get(preview["discount"]["id"])

        duration_disc = preview.get("duration_discount")

        data["venue_id"] = ids[0]
        data["base_price"] = preview["base_price"]
        data["duration_multiplier"] = duration_disc["multiplier"] if duration_disc else 1.0
        data["duration_rule_name"] = duration_disc["name"] if duration_disc else None
        data["discount_id"] = discount_obj.id if discount_obj else None
        data["discount_amount"] = preview["discount"]["amount"] if preview.get("discount") else 0
        data["total_price"] = preview["total_price"]

        db.query(BookingVenue).filter(BookingVenue.booking_id == booking_id).delete()
        for v in preview["venues"]:
            db.add(BookingVenue(
                booking_id=booking_id,
                venue_id=v["venue_id"],
                price_per_day=v["price_per_day"],
                days=v["days"],
                seasonal_multiplier=v.get("seasonal_multiplier", 1.0),
                season_name=v.get("season_name"),
                subtotal=v["subtotal"],
            ))

        if discount_obj:
            discount_obj.current_uses += 1

    for field, value in data.items():
        setattr(db_booking, field, value)

    db.commit()
    return _load_booking(booking_id, db)


@router.delete("/{booking_id}", status_code=204)
def cancel_booking(booking_id: int, db: Session = Depends(get_db), _: object = Depends(require_editor)):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    db_booking.status = "annulé"
    db.commit()
