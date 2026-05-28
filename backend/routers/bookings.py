from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from database import get_db
from models import Booking, Venue, BookingVenue, Discount
from schemas import BookingCreate, BookingUpdate, BookingOut
from auth import get_current_user, require_editor
from pricing import compute_venue_price, apply_discount, build_price_preview

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _load_booking(booking_id: int, db: Session) -> Booking:
    return (
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
    query = db.query(Booking).options(
        joinedload(Booking.venue),
        joinedload(Booking.client),
        joinedload(Booking.discount),
        joinedload(Booking.booking_venues).joinedload(BookingVenue.venue),
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
    b = _load_booking(booking_id, db)
    if not b:
        raise HTTPException(404, "Réservation non trouvée")
    return b


# ---------- Price preview ----------

class PricePreviewRequest(BaseModel):
    venue_ids: List[int]
    start_date: datetime
    end_date: datetime
    discount_code: Optional[str] = None


@router.post("/price-preview")
def price_preview(
    body: PricePreviewRequest,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    if body.end_date <= body.start_date:
        raise HTTPException(400, "La date de fin doit être après le début")
    return build_price_preview(
        body.venue_ids,
        body.start_date.date(),
        body.end_date.date(),
        body.discount_code,
        db,
    )


# ---------- Create ----------

class BookingCreateV2(BaseModel):
    venue_ids: List[int]               # multi-lieux
    client_id: int
    event_type: str
    event_name: Optional[str] = None
    start_date: datetime
    end_date: datetime
    guest_count: int
    status: str = "en_attente"
    discount_code: Optional[str] = None
    total_price: Optional[float] = None  # override manual
    deposit_paid: bool = False
    deposit_amount: float = 0
    notes: Optional[str] = None


@router.post("/", response_model=BookingOut, status_code=201)
def create_booking(
    booking: BookingCreateV2,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    if booking.end_date <= booking.start_date:
        raise HTTPException(400, "La date de fin doit être après le début")
    if not booking.venue_ids:
        raise HTTPException(400, "Au moins un lieu est requis")

    # Check conflicts for all venues
    for vid in booking.venue_ids:
        conflicting = db.query(Booking).join(
            BookingVenue, BookingVenue.booking_id == Booking.id, isouter=True
        ).filter(
            (Booking.venue_id == vid) | (BookingVenue.venue_id == vid),
            Booking.status.in_(["en_attente", "confirmé"]),
            Booking.start_date < booking.end_date,
            Booking.end_date > booking.start_date,
        ).count()
        if conflicting:
            venue = db.query(Venue).filter(Venue.id == vid).first()
            name = venue.name if venue else f"#{vid}"
            raise HTTPException(409, f"Le lieu « {name} » est déjà réservé sur cette période")

    # Compute price
    preview = build_price_preview(
        booking.venue_ids,
        booking.start_date.date(),
        booking.end_date.date(),
        booking.discount_code,
        db,
    )

    discount_obj = None
    if booking.discount_code and preview["discount"]["id"]:
        discount_obj = db.query(Discount).filter(Discount.id == preview["discount"]["id"]).first()

    base_price = preview["base_price"]
    discount_amount = preview["discount"]["amount"]
    total_price = booking.total_price if booking.total_price is not None else preview["total_price"]

    # Primary venue (first one)
    primary_venue_id = booking.venue_ids[0]

    db_booking = Booking(
        venue_id=primary_venue_id,
        client_id=booking.client_id,
        event_type=booking.event_type,
        event_name=booking.event_name,
        start_date=booking.start_date,
        end_date=booking.end_date,
        guest_count=booking.guest_count,
        status=booking.status,
        base_price=base_price,
        discount_id=discount_obj.id if discount_obj else None,
        discount_amount=discount_amount,
        total_price=total_price,
        deposit_paid=booking.deposit_paid,
        deposit_amount=booking.deposit_amount,
        notes=booking.notes,
    )
    db.add(db_booking)
    db.flush()  # get db_booking.id

    # Create BookingVenue lines
    for vd in preview["venues"]:
        bv = BookingVenue(
            booking_id=db_booking.id,
            venue_id=vd["venue_id"],
            price_per_day=vd["price_per_day"],
            days=vd["days"],
            seasonal_multiplier=vd["seasonal_multiplier"],
            season_name=vd["season_name"],
            subtotal=vd["subtotal"],
        )
        db.add(bv)

    # Increment discount usage
    if discount_obj:
        discount_obj.current_uses += 1

    db.commit()
    return _load_booking(db_booking.id, db)


# ---------- Update ----------

class BookingUpdateV2(BaseModel):
    event_type: Optional[str] = None
    event_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    guest_count: Optional[int] = None
    status: Optional[str] = None
    total_price: Optional[float] = None
    deposit_paid: Optional[bool] = None
    deposit_amount: Optional[float] = None
    notes: Optional[str] = None


@router.put("/{booking_id}", response_model=BookingOut)
def update_booking(
    booking_id: int,
    booking: BookingUpdateV2,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(404, "Réservation non trouvée")
    for field, value in booking.model_dump(exclude_unset=True).items():
        setattr(db_booking, field, value)
    db.commit()
    return _load_booking(booking_id, db)


@router.delete("/{booking_id}", status_code=204)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(404, "Réservation non trouvée")
    db_booking.status = "annulé"
    db.commit()
