from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from auth import get_current_user, require_editor
from database import get_db
from models import DurationPricingRule
from schemas import DurationRuleCreate, DurationRuleUpdate, DurationRuleOut

router = APIRouter(prefix="/duration-rules", tags=["duration-rules"])


@router.get("/", response_model=List[DurationRuleOut])
def list_rules(
    venue_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: object = Depends(get_current_user),
):
    q = db.query(DurationPricingRule)
    if venue_id is not None:
        # Return venue-specific rules + global rules
        q = q.filter(
            (DurationPricingRule.venue_id == venue_id) | (DurationPricingRule.venue_id == None)
        )
    return q.order_by(DurationPricingRule.venue_id.nullsfirst(), DurationPricingRule.min_days).all()


@router.post("/", response_model=DurationRuleOut, status_code=201)
def create_rule(
    rule: DurationRuleCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    db_rule = DurationPricingRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.put("/{rule_id}", response_model=DurationRuleOut)
def update_rule(
    rule_id: int,
    rule: DurationRuleUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    db_rule = db.query(DurationPricingRule).filter(DurationPricingRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    for field, value in rule.model_dump(exclude_unset=True).items():
        setattr(db_rule, field, value)
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.delete("/{rule_id}", status_code=204)
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_editor),
):
    db_rule = db.query(DurationPricingRule).filter(DurationPricingRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    db.delete(db_rule)
    db.commit()
