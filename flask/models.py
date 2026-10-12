"""Database models for the Music Booking Tracker.

Uses SQLite via the stdlib sqlite3 module — no paid APIs, no external
services. All data stays local.
"""
import os
import sqlite3
from datetime import datetime

DB_PATH = os.environ.get("DB_PATH", "bookings.db")

# Pipeline stages in order
STAGES = [
    ("new_lead", "New Lead"),
    ("contacted", "Contacted"),
    ("negotiating", "Negotiating"),
    ("confirmed", "Confirmed"),
    ("completed", "Completed"),
    ("cancelled", "Cancelled"),
]

STAGE_LABELS = dict(STAGES)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they do not exist. Safe to run on every startup."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS venues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_name TEXT,
            email TEXT,
            phone TEXT,
            country TEXT,
            city TEXT,
            venue_type TEXT,
            source TEXT,
            notes TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id INTEGER NOT NULL REFERENCES venues(id),
            title TEXT NOT NULL,
            event_date TEXT,
            stage TEXT NOT NULL DEFAULT 'new_lead',
            fee REAL,
            currency TEXT DEFAULT 'USD',
            follow_up_date TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds")


# ---- Venues ---------------------------------------------------------------

def create_venue(data):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO venues
           (name, contact_name, email, phone, country, city, venue_type,
            source, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("name"),
            data.get("contact_name"),
            data.get("email"),
            data.get("phone"),
            data.get("country"),
            data.get("city"),
            data.get("venue_type"),
            data.get("source"),
            data.get("notes"),
            now_iso(),
        ),
    )
    venue_id = cur.lastrowid
    conn.commit()
    conn.close()
    return venue_id


def list_venues(search=None):
    conn = get_db()
    cur = conn.cursor()
    if search:
        like = f"%{search}%"
        cur.execute(
            """SELECT * FROM venues
               WHERE name LIKE ? OR city LIKE ? OR country LIKE ?
                  OR contact_name LIKE ?
               ORDER BY name""",
            (like, like, like, like),
        )
    else:
        cur.execute("SELECT * FROM venues ORDER BY name")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_venue(venue_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM venues WHERE id = ?", (venue_id,))
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


# ---- Bookings --------------------------------------------------------------

def create_booking(data):
    conn = get_db()
    cur = conn.cursor()
    ts = now_iso()
    cur.execute(
        """INSERT INTO bookings
           (venue_id, title, event_date, stage, fee, currency,
            follow_up_date, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data.get("venue_id"),
            data.get("title"),
            data.get("event_date"),
            data.get("stage", "new_lead"),
            data.get("fee"),
            data.get("currency", "USD"),
            data.get("follow_up_date"),
            data.get("notes"),
            ts,
            ts,
        ),
    )
    booking_id = cur.lastrowid
    conn.commit()
    conn.close()
    return booking_id


def list_bookings(stage=None, search=None):
    conn = get_db()
    cur = conn.cursor()
    query = """SELECT b.*, v.name AS venue_name, v.city AS venue_city,
                      v.country AS venue_country
               FROM bookings b
               JOIN venues v ON v.id = b.venue_id"""
    params = []
    clauses = []
    if stage:
        clauses.append("b.stage = ?")
        params.append(stage)
    if search:
        like = f"%{search}%"
        clauses.append(
            "(b.title LIKE ? OR v.name LIKE ? OR v.city LIKE ?)"
        )
        params.extend([like, like, like])
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY b.event_date IS NULL, b.event_date"
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_booking(booking_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """SELECT b.*, v.name AS venue_name, v.city AS venue_city,
                  v.country AS venue_country
           FROM bookings b
           JOIN venues v ON v.id = b.venue_id
           WHERE b.id = ?""",
        (booking_id,),
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def update_booking(booking_id, data):
    allowed = [
        "title", "event_date", "stage", "fee", "currency",
        "follow_up_date", "notes",
    ]
    sets = []
    params = []
    for key in allowed:
        if key in data:
            sets.append(f"{key} = ?")
            params.append(data[key])
    if not sets:
        return False
    sets.append("updated_at = ?")
    params.append(now_iso())
    params.append(booking_id)
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE bookings SET {', '.join(sets)} WHERE id = ?", params
    )
    conn.commit()
    changed = cur.rowcount > 0
    conn.close()
    return changed


def move_booking_stage(booking_id, stage):
    if stage not in STAGE_LABELS:
        return False
    return update_booking(booking_id, {"stage": stage})


def overdue_follow_ups():
    """Bookings with a follow-up date in the past that are not completed."""
    conn = get_db()
    cur = conn.cursor()
    today = datetime.utcnow().date().isoformat()
    cur.execute(
        """SELECT b.*, v.name AS venue_name
           FROM bookings b
           JOIN venues v ON v.id = b.venue_id
           WHERE b.follow_up_date IS NOT NULL
             AND b.follow_up_date < ?
             AND b.stage NOT IN ('completed', 'cancelled')
           ORDER BY b.follow_up_date""",
        (today,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def stage_counts():
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT stage, COUNT(*) AS n FROM bookings GROUP BY stage"
    )
    counts = {stage: 0 for stage, _ in STAGES}
    for row in cur.fetchall():
        counts[row["stage"]] = row["n"]
    conn.close()
    return counts
