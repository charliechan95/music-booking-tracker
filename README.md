# Music Booking Tracker

A free, self-hosted booking pipeline tracker for touring musicians.
Find gigs, track outreach, manage bookings — no paid APIs, no subscriptions.

## Stack (all free)

- **Flask** — web framework (open source)
- **SQLite** — database via Python stdlib (no server, no cost)
- **Vanilla HTML/CSS/JS** — no frontend framework, no build step

There are **zero paid APIs** in this app. Everything runs locally.

## Quick start

```bash
cd music-booking-tracker
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000

## What it does

- **Dashboard** — pipeline stage counts, overdue follow-ups, recent bookings
- **Pipeline** — kanban board: New Lead → Contacted → Negotiating →
  Confirmed → Completed (or Cancelled). Move bookings between stages,
  search, add new bookings.
- **Venues** — venue/contact directory with city, country, type, source.
  Add a booking straight from a venue row.

## Data model

- `venues` — name, contact, email, phone, country, city, type, source, notes
- `bookings` — venue, title, event date, stage, fee + currency,
  follow-up date, notes

Data lives in `bookings.db` (created automatically on first run).

## Notes

- Multi-currency fees are stored as entered (no live FX — that would
  need a paid API).
- Follow-up reminders are date-based; overdue items surface on the
  dashboard. No email/SMS sending (would need a paid provider).
