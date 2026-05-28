from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from database import get_db
from models import Discount
from auth import get_current_user, require_editor, require_admin

router = APIRouter(prefix="/discounts", tags=["discounts"])


class DiscountOut(BaseModel):
    id: int
    name: str
    code: str
    discount_type: str
    value: float
    min_booking_amount: float
    max_uses: Optional[int] = None
    current_uses: int
    is_active: bool
    expires_at: Optional[datetime] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DiscountCreate(BaseModel):
    name: str
    code: str
    discount_type: str       # "percentage" | "fixed"
    value: float
    min_booking_amount: float = 0
    max_uses: Optional[int] = None
    is_active: bool = True
    expires_at: Optional[datetime] = None
    description: Optional[str] = None


class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    discount_type: Optional[str] = None
    value: Optional[float] = None
    min_booking_amount: Optional[float] = None
    max_uses: Optional[int] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    description: Optional[str] = None


class ValidateResponse(BaseModel):
    valid: bool
    discount_id: Optional[int] = None
    name: Optional[str] = None
    discount_type: Optional[str] = None
    value: Optional[float] = None
    error: Optional[str] = None


@router.get("/", response_model=List[DiscountOut])
def list_discounts(
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    return db.query(Discount).order_by(Discount.created_at.desc()).all()


@router.get("/validate/{code}", response_model=ValidateResponse)
def validate_code(
    code: str,
    base_amount: float = 0,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    d = db.query(Discount).filter(Discount.code == code.upper()).first()
    if not d:
        return ValidateResponse(valid=False, error="Code inconnu")
    if not d.is_active:
        return ValidateResponse(valid=False, error="Code désactivé")
    if d.expires_at and d.expires_at < datetime.now():
        return ValidateResponse(valid=False, error="Code expiré")
    if d.max_uses and d.current_uses >= d.max_uses:
        return ValidateResponse(valid=False, error="Quota épuisé")
    if base_amount and d.min_booking_amount and base_amount < d.min_booking_amount:
        return ValidateResponse(
            valid=False,
            error=f"Montant minimum requis : {d.min_booking_amount:.0f} €",
        )
    return ValidateResponse(
        valid=True,
        discount_id=d.id,
        name=d.name,
        discount_type=d.discount_type,
        value=d.value,
    )


@router.post("/", response_model=DiscountOut, status_code=201)
def create_discount(
    body: DiscountCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    if db.query(Discount).filter(Discount.code == body.code.upper()).first():
        raise HTTPException(400, "Code déjà utilisé")
    data = body.model_dump()
    data["code"] = data["code"].upper()
    d = Discount(**data)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.put("/{discount_id}", response_model=DiscountOut)
def update_discount(
    discount_id: int,
    body: DiscountUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    d = db.query(Discount).filter(Discount.id == discount_id).first()
    if not d:
        raise HTTPException(404, "Remise non trouvée")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/{discount_id}", status_code=204)
def delete_discount(
    discount_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    d = db.query(Discount).filter(Discount.id == discount_id).first()
    if not d:
        raise HTTPException(404, "Remise non trouvée")
    db.delete(d)
    db.commit()
