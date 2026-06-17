"""Safe schema migration for existing SQLite databases.
Adds new columns to existing tables and creates new tables.
Run once after updating models.py: python migrate.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "venue_management.db")

if not os.path.exists(DB_PATH):
    print("No database found — will be created fresh by the app.")
    exit(0)

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

NEW_BOOKING_COLUMNS = [
    ("base_price", "FLOAT"),
    ("duration_multiplier", "FLOAT DEFAULT 1.0"),
    ("duration_rule_name", "VARCHAR(100)"),
]

existing = {row[1] for row in c.execute("PRAGMA table_info(bookings)").fetchall()}

for col, col_type in NEW_BOOKING_COLUMNS:
    if col not in existing:
        c.execute(f"ALTER TABLE bookings ADD COLUMN {col} {col_type}")
        print(f"Added bookings.{col}")
    else:
        print(f"bookings.{col} already exists")

conn.commit()
conn.close()

# Create new tables via SQLAlchemy
from database import engine
from models import Base
Base.metadata.create_all(bind=engine)
print("New tables created (duration_pricing_rules, booking_venues).")
print("Migration complete.")
