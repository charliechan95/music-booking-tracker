/* Music Booking Tracker — static data layer.
   localStorage-backed, no backend. Mirrors the Flask models.py API. */
"use strict";

const STAGES = [
  ["new_lead", "New Lead"],
  ["contacted", "Contacted"],
  ["negotiating", "Negotiating"],
  ["confirmed", "Confirmed"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];
const STAGE_LABELS = Object.fromEntries(STAGES);

const DB = {
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  _nextId(kind) {
    const key = "mbt_seq_" + kind;
    const n = (parseInt(localStorage.getItem(key) || "0", 10) || 0) + 1;
    localStorage.setItem(key, String(n));
    return n;
  },
  nowIso() {
    return new Date().toISOString().slice(0, 19);
  },

  // ---- Venues -----------------------------------------------------------
  venues(search) {
    let list = this._read("mbt_venues", []);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) =>
        [v.name, v.city, v.country, v.contact_name]
          .some((f) => (f || "").toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  },
  venue(id) {
    return this._read("mbt_venues", []).find(
      (v) => String(v.id) === String(id)
    ) || null;
  },
  createVenue(data) {
    const list = this._read("mbt_venues", []);
    const venue = {
      id: this._nextId("venue"),
      name: data.name || "",
      contact_name: data.contact_name || null,
      email: data.email || null,
      phone: data.phone || null,
      country: data.country || null,
      city: data.city || null,
      venue_type: data.venue_type || null,
      source: data.source || null,
      notes: data.notes || null,
      created_at: this.nowIso(),
    };
    list.push(venue);
    this._write("mbt_venues", list);
    return venue.id;
  },

  // ---- Bookings ----------------------------------------------------------
  bookings(stage, search) {
    let list = this._read("mbt_bookings", []);
    if (stage) list = list.filter((b) => b.stage === stage);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) => {
        const v = this.venue(b.venue_id) || {};
        return [b.title, v.name, v.city]
          .some((f) => (f || "").toLowerCase().includes(q));
      });
    }
    return [...list].sort((a, b) => {
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return a.event_date.localeCompare(b.event_date);
    });
  },
  booking(id) {
    return this._read("mbt_bookings", []).find(
      (b) => String(b.id) === String(id)
    ) || null;
  },
  createBooking(data) {
    const list = this._read("mbt_bookings", []);
    const ts = this.nowIso();
    const booking = {
      id: this._nextId("booking"),
      venue_id: parseInt(data.venue_id, 10),
      title: data.title || "",
      event_date: data.event_date || null,
      stage: data.stage || "new_lead",
      fee: data.fee ? parseFloat(data.fee) : null,
      currency: data.currency || "HKD",
      follow_up_date: data.follow_up_date || null,
      notes: data.notes || null,
      created_at: ts,
      updated_at: ts,
    };
    list.push(booking);
    this._write("mbt_bookings", list);
    return booking.id;
  },
  moveBooking(id, stage) {
    if (!STAGE_LABELS[stage]) return false;
    const list = this._read("mbt_bookings", []);
    const b = list.find((x) => String(x.id) === String(id));
    if (!b) return false;
    b.stage = stage;
    b.updated_at = this.nowIso();
    this._write("mbt_bookings", list);
    return true;
  },

  // ---- Dashboard ----------------------------------------------------------
  stageCounts() {
    const counts = Object.fromEntries(STAGES.map(([s]) => [s, 0]));
    for (const b of this._read("mbt_bookings", [])) {
      if (counts[b.stage] !== undefined) counts[b.stage]++;
    }
    return counts;
  },
  overdueFollowUps() {
    const today = new Date().toISOString().slice(0, 10);
    return this._read("mbt_bookings", [])
      .filter(
        (b) =>
          b.follow_up_date &&
          b.follow_up_date < today &&
          !["completed", "cancelled"].includes(b.stage)
      )
      .sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date));
  },

  // ---- Export / import -----------------------------------------------------
  exportAll() {
    return {
      venues: this._read("mbt_venues", []),
      bookings: this._read("mbt_bookings", []),
      exported_at: this.nowIso(),
    };
  },
};
