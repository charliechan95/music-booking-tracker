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
  // Guarded write: returns true on success, false when storage is full or
  // unavailable (e.g. quota). Callers surface the failure to the user.
  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  _nextId(kind) {
    const key = "mbt_seq_" + kind;
    const n = (parseInt(localStorage.getItem(key) || "0", 10) || 0) + 1;
    try { localStorage.setItem(key, String(n)); } catch { /* seq gap only */ }
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
    return this._write("mbt_venues", list) ? venue.id : null;
  },
  updateVenue(id, data) {
    const list = this._read("mbt_venues", []);
    const v = list.find((x) => String(x.id) === String(id));
    if (!v) return false;
    for (const k of ["name", "contact_name", "email", "phone",
                     "country", "city", "venue_type", "source", "notes"]) {
      if (data[k] !== undefined) v[k] = data[k] || (k === "name" ? "" : null);
    }
    return this._write("mbt_venues", list);
  },
  // How many bookings point at this venue. Deleting a venue is blocked while
  // bookings reference it — never silently orphan or cascade-delete bookings.
  venueBookingCount(id) {
    return this._read("mbt_bookings", []).filter(
      (b) => String(b.venue_id) === String(id)
    ).length;
  },
  deleteVenue(id) {
    if (this.venueBookingCount(id) > 0) return false;
    const list = this._read("mbt_venues", []);
    const i = list.findIndex((x) => String(x.id) === String(id));
    if (i < 0) return false;
    list.splice(i, 1);
    return this._write("mbt_venues", list);
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
    return this._write("mbt_bookings", list) ? booking.id : null;
  },
  updateBooking(id, data) {
    const list = this._read("mbt_bookings", []);
    const b = list.find((x) => String(x.id) === String(id));
    if (!b) return false;
    if (data.title !== undefined) b.title = data.title || "";
    if (data.venue_id != null && data.venue_id !== "")
      b.venue_id = parseInt(data.venue_id, 10);
    if (data.event_date !== undefined) b.event_date = data.event_date || null;
    if (data.stage && STAGE_LABELS[data.stage]) b.stage = data.stage;
    if (data.fee !== undefined) b.fee = data.fee ? parseFloat(data.fee) : null;
    if (data.currency !== undefined) b.currency = data.currency || "HKD";
    if (data.follow_up_date !== undefined)
      b.follow_up_date = data.follow_up_date || null;
    if (data.notes !== undefined) b.notes = data.notes || null;
    b.updated_at = this.nowIso();
    return this._write("mbt_bookings", list);
  },
  deleteBooking(id) {
    const list = this._read("mbt_bookings", []);
    const i = list.findIndex((x) => String(x.id) === String(id));
    if (i < 0) return false;
    list.splice(i, 1);
    return this._write("mbt_bookings", list);
  },
  moveBooking(id, stage) {
    if (!STAGE_LABELS[stage]) return false;
    const list = this._read("mbt_bookings", []);
    const b = list.find((x) => String(x.id) === String(id));
    if (!b) return false;
    b.stage = stage;
    b.updated_at = this.nowIso();
    return this._write("mbt_bookings", list);
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
  // Shape-check a backup object BEFORE anything is written.
  // Reject: wrong container, missing/bad lists, rows missing id+name/title,
  // bad stage, bookings pointing at unknown venues, duplicate ids.
  validateImport(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
    if (!Array.isArray(obj.venues) || !Array.isArray(obj.bookings)) return false;
    const ids = new Set();
    for (const v of obj.venues) {
      if (!v || v.id == null || typeof v.name !== "string") return false;
      if (ids.has("v" + v.id)) return false;
      ids.add("v" + v.id);
    }
    for (const b of obj.bookings) {
      if (!b || b.id == null || typeof b.title !== "string") return false;
      if (b.stage && !STAGE_LABELS[b.stage]) return false;
      if (!obj.venues.some((v) => String(v.id) === String(b.venue_id)))
        return false;
      if (ids.has("b" + b.id)) return false;
      ids.add("b" + b.id);
    }
    return true;
  },
  // Full restore from a validated backup: REPLACES all data. Validates first
  // so corrupt data is never merged in; rolls back on write failure.
  importAll(obj) {
    if (!this.validateImport(obj)) return false;
    const prevVenues = this._read("mbt_venues", []);
    const prevBookings = this._read("mbt_bookings", []);
    if (!this._write("mbt_venues", obj.venues)) return false;
    if (!this._write("mbt_bookings", obj.bookings)) {
      this._write("mbt_venues", prevVenues);
      return false;
    }
    // Keep id sequences ahead of imported ids so new rows don't collide.
    const maxId = (rows) =>
      rows.reduce((m, r) => Math.max(m, parseInt(r.id, 10) || 0), 0);
    try {
      localStorage.setItem("mbt_seq_venue", String(maxId(obj.venues)));
      localStorage.setItem("mbt_seq_booking", String(maxId(obj.bookings)));
    } catch { /* seq persist best-effort; ids still unique via _nextId */ }
    return true;
  },
};
