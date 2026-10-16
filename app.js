/* Music Booking Tracker — static UI. Renders from db.js, no backend. */
"use strict";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const STAGE_LABEL_KEY = {
  "new_lead": "stage_new_lead", "contacted": "stage_contacted",
  "negotiating": "stage_negotiating", "confirmed": "stage_confirmed",
  "completed": "stage_completed", "cancelled": "stage_cancelled",
};
function stageLabel(s) {
  const k = STAGE_LABEL_KEY[s];
  return k ? t(k) : (s || "");
}
function stagePill(stage) {
  return `<span class="pill">${esc(stageLabel(stage))}</span>`;
}

function venueLabel(v) {
  if (!v) return "—";
  let s = esc(v.name);
  if (v.city) s += " — " + esc(v.city);
  return s;
}

/* ---- Tabs --------------------------------------------------------------- */
document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((b) =>
      b.classList.toggle("active", b === btn));
    document.querySelectorAll(".view").forEach((v) =>
      v.classList.toggle("active", v.id === "view-" + btn.dataset.tab));
  });
});

/* ---- Dashboard ----------------------------------------------------------- */
function renderDashboard() {
  const counts = DB.stageCounts();
  document.getElementById("stage-cards").innerHTML = STAGES.map(
    ([s]) => `
    <a class="card" href="#" data-goto="pipeline">
      <div class="card-num">${counts[s]}</div>
      <div class="card-label">${esc(stageLabel(s))}</div>
    </a>`
  ).join("");

  const overdue = DB.overdueFollowUps();
  const sec = document.getElementById("overdue-section");
  sec.style.display = overdue.length ? "" : "none";
  document.getElementById("overdue-body").innerHTML = overdue.map((b) => {
    const v = DB.venue(b.venue_id);
    return `<tr class="overdue">
      <td>${esc(b.title)}</td>
      <td>${esc(v ? v.name : "—")}</td>
      <td>${esc(b.follow_up_date)}</td>
      <td><button data-move data-id="${b.id}"
                  data-stage="contacted">${t("btn_mark_contacted")}</button></td>
    </tr>`;
  }).join("");

  const recent = DB.bookings().slice(0, 8);
  document.getElementById("recent-body").innerHTML = recent.length
    ? recent.map((b) => {
        const v = DB.venue(b.venue_id);
        return `<tr>
          <td>${esc(b.title)}</td>
          <td>${venueLabel(v)}</td>
          <td>${esc(b.event_date || "—")}</td>
          <td>${stagePill(b.stage)}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="4" class="muted">${t("no_bookings_hint")}</td></tr>`;

  document.querySelectorAll('[data-goto]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelector(`[data-tab="${a.dataset.goto}"]`).click();
    });
  });
}

/* ---- Pipeline ------------------------------------------------------------- */
let pipelineQuery = "";

function renderPipeline() {
  const board = document.getElementById("board");
  board.innerHTML = STAGES.map(([stage]) => {
    const bookings = DB.bookings(stage, pipelineQuery || null);
    const cards = bookings.map((b) => {
      const v = DB.venue(b.venue_id) || {};
      const opts = STAGES.map(([s]) =>
        `<option value="${s}"${s === b.stage ? " selected" : ""}>${esc(stageLabel(s))}</option>`
      ).join("");
      return `<div class="booking-card">
        <strong>${esc(b.title)}</strong>
        <div class="muted">${esc(v.name || "—")}
          ${v.city ? "· " + esc(v.city) : ""}
          ${v.country ? "· " + esc(v.country) : ""}</div>
        ${b.event_date ? `<div>📅 ${esc(b.event_date)}</div>` : ""}
        ${b.fee ? `<div>💰 ${esc(b.fee)} ${esc(b.currency)}</div>` : ""}
        ${b.follow_up_date
          ? `<div class="followup">⏰ ${esc(t("lbl_followup"))}: ${esc(b.follow_up_date)}</div>` : ""}
        <div class="card-actions">
          <select data-stage-select data-id="${b.id}">${opts}</select>
          <button data-edit-booking="${b.id}">${t("btn_edit")}</button>
          <button data-del-booking="${b.id}">${t("btn_delete")}</button>
        </div>
      </div>`;
    }).join("");
    return `<div class="column">
      <h3>${esc(stageLabel(stage))} <span class="count">${bookings.length}</span></h3>
      ${cards || '<div class="muted empty">' + t("no_bookings") + "</div>"}
    </div>`;
  }).join("");

  board.querySelectorAll("[data-stage-select]").forEach((sel) => {
    sel.addEventListener("change", () => {
      if (!DB.moveBooking(sel.dataset.id, sel.value))
        alert(t("alert_save_failed"));
      renderAll();
    });
  });
}

document.getElementById("pipeline-search").addEventListener("click", () => {
  pipelineQuery = document.getElementById("pipeline-q").value.trim();
  renderPipeline();
});
document.getElementById("pipeline-q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    pipelineQuery = e.target.value.trim();
    renderPipeline();
  }
});

/* ---- Venues ---------------------------------------------------------------- */
let venuesQuery = "";

function renderVenues() {
  const list = DB.venues(venuesQuery || null);
  document.getElementById("venues-body").innerHTML = list.length
    ? list.map((v) => `
      <tr>
        <td><strong>${esc(v.name)}</strong>
          ${v.source ? `<div class="muted">${t("via")} ${esc(v.source)}</div>` : ""}</td>
        <td>${esc(v.contact_name || "—")}
          ${v.email ? `<div class="muted">${esc(v.email)}</div>` : ""}
          ${v.phone ? `<div class="muted">${esc(v.phone)}</div>` : ""}</td>
        <td>${esc([v.city, v.country].filter(Boolean).join(", "))}</td>
        <td>${esc(v.venue_type || "—")}</td>
        <td class="row-actions">
          <button data-new-booking-for="${v.id}">${t("btn_new_booking_for")}</button>
          <button data-edit-venue="${v.id}">${t("btn_edit")}</button>
          <button data-del-venue="${v.id}">${t("btn_delete")}</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="muted">${t("no_venues_hint")}</td></tr>`;

  document.querySelectorAll("[data-new-booking-for]").forEach((btn) => {
    btn.addEventListener("click", () =>
      openBookingDialog(btn.dataset.newBookingFor));
  });
}

document.getElementById("venues-search").addEventListener("click", () => {
  venuesQuery = document.getElementById("venues-q").value.trim();
  renderVenues();
});
document.getElementById("venues-q").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    venuesQuery = e.target.value.trim();
    renderVenues();
  }
});

/* ---- Dialogs --------------------------------------------------------------- */
function formToObj(form) {
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v === "" ? null : v; });
  return data;
}

const dlgVenue = document.getElementById("dlg-venue");
const dlgVenueTitle = document.getElementById("dlg-venue-title");
let editingVenueId = null;
// venueId null = new venue; otherwise prefilled edit.
function openVenueDialog(venueId) {
  editingVenueId = venueId || null;
  const form = document.getElementById("frm-venue");
  form.reset();
  const v = editingVenueId ? DB.venue(editingVenueId) : null;
  dlgVenueTitle.textContent = t(v ? "dlg_venue_edit" : "dlg_venue_new");
  if (v) {
    for (const k of ["name", "contact_name", "email", "phone",
                     "city", "country", "venue_type", "source", "notes"]) {
      form.elements[k].value = v[k] == null ? "" : v[k];
    }
  }
  dlgVenue.showModal();
}
document.getElementById("btn-new-venue").addEventListener("click", () =>
  openVenueDialog());
document.getElementById("btn-cancel-venue").addEventListener("click", () =>
  dlgVenue.close());
document.getElementById("frm-venue").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = formToObj(e.target);
  const ok = editingVenueId
    ? DB.updateVenue(editingVenueId, data)
    : DB.createVenue(data) != null;
  if (!ok) { alert(t("alert_save_failed")); return; }  // keep dialog open, form data intact
  editingVenueId = null;
  e.target.reset();
  dlgVenue.close();
  renderAll();
});

const dlgBooking = document.getElementById("dlg-booking");
const dlgBookingTitle = document.getElementById("dlg-booking-title");
const selVenue = document.getElementById("f-venue");
const selStage = document.getElementById("f-stage");
let editingBookingId = null;
function buildStageOptions() {
  selStage.innerHTML = STAGES.map(([s]) =>
    `<option value="${s}">${esc(stageLabel(s))}</option>`).join("");
}
buildStageOptions();
function refreshOpenDialogTitles() {
  if (dlgVenue.open)
    dlgVenueTitle.textContent = t(editingVenueId ? "dlg_venue_edit" : "dlg_venue_new");
  if (dlgBooking.open)
    dlgBookingTitle.textContent = t(editingBookingId ? "dlg_booking_edit" : "dlg_booking_new");
}
window.onLangChange = () => {
  buildStageOptions();
  refreshOpenDialogTitles();
};

// bookingId null = new booking (preselectId preselects the venue);
// otherwise the booking dialog opens prefilled for editing.
function openBookingDialog(preselectId, bookingId) {
  editingBookingId = bookingId || null;
  const b = editingBookingId ? DB.booking(editingBookingId) : null;
  const venues = DB.venues();
  selVenue.innerHTML = venues.map((v) =>
    `<option value="${v.id}"${String(v.id) === String(b ? b.venue_id : preselectId)
      ? " selected" : ""}>${esc(v.name)}${v.city ? " — " + esc(v.city) : ""}</option>`
  ).join("");
  dlgBookingTitle.textContent = t(b ? "dlg_booking_edit" : "dlg_booking_new");
  const form = document.getElementById("frm-booking");
  form.reset();  // restores the HKD default on the currency input
  if (b) {
    form.elements["venue_id"].value = b.venue_id;
    form.elements.title.value = b.title || "";
    form.elements["event_date"].value = b.event_date || "";
    form.elements.stage.value = b.stage;
    form.elements.fee.value = b.fee == null ? "" : b.fee;
    form.elements.currency.value = b.currency || "HKD";
    form.elements["follow_up_date"].value = b.follow_up_date || "";
    form.elements.notes.value = b.notes || "";
  }
  dlgBooking.showModal();
}

document.getElementById("btn-new-booking").addEventListener("click", () => {
  if (!DB.venues().length) {
    alert(t("alert_venue_first"));
    document.querySelector('[data-tab="venues"]').click();
    return;
  }
  openBookingDialog();
});
document.getElementById("btn-cancel-booking").addEventListener("click", () =>
  dlgBooking.close());
document.getElementById("frm-booking").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = formToObj(e.target);
  const ok = editingBookingId
    ? DB.updateBooking(editingBookingId, data)
    : DB.createBooking(data) != null;
  if (!ok) { alert(t("alert_save_failed")); return; }  // keep dialog open, form data intact
  editingBookingId = null;
  e.target.reset();
  dlgBooking.close();
  renderAll();
});

/* ---- Global actions (delegated) -------------------------------------------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-move]");
  if (btn) {
    if (!DB.moveBooking(btn.dataset.id, btn.dataset.stage))
      alert(t("alert_save_failed"));
    renderAll();
    return;
  }
  const edV = e.target.closest("[data-edit-venue]");
  if (edV) { openVenueDialog(edV.dataset.editVenue); return; }
  const delV = e.target.closest("[data-del-venue]");
  if (delV) {
    const id = delV.dataset.delVenue;
    if (DB.venueBookingCount(id) > 0) {
      alert(t("alert_venue_has_bookings"));  // blocked: bookings still point here
      return;
    }
    if (!confirm(t("confirm_delete_venue"))) return;
    if (!DB.deleteVenue(id)) alert(t("alert_save_failed"));
    renderAll();
    return;
  }
  const edB = e.target.closest("[data-edit-booking]");
  if (edB) { openBookingDialog(null, edB.dataset.editBooking); return; }
  const delB = e.target.closest("[data-del-booking]");
  if (delB) {
    if (!confirm(t("confirm_delete_booking"))) return;
    if (!DB.deleteBooking(delB.dataset.delBooking)) alert(t("alert_save_failed"));
    renderAll();
  }
});

/* ---- Export ----------------------------------------------------------------- */
document.getElementById("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(DB.exportAll(), null, 2)],
    { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "booking-tracker-backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---- Import / restore -------------------------------------------------------- */
document.getElementById("btn-import").addEventListener("click", () =>
  document.getElementById("file-import").click());
document.getElementById("file-import").addEventListener("change", (e) => {
  const file = e.target.files[0];
  e.target.value = "";  // allow picking the same file again
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let obj = null;
    try { obj = JSON.parse(reader.result); } catch { obj = null; }
    if (!DB.validateImport(obj)) { alert(t("alert_import_bad")); return; }
    if (!confirm(t("confirm_import"))) return;  // replace is destructive
    if (!DB.importAll(obj)) { alert(t("alert_save_failed")); return; }
    alert(t("alert_import_ok"));
    renderAll();
  };
  reader.onerror = () => alert(t("alert_import_bad"));
  reader.readAsText(file);
});

/* ---- Boot -------------------------------------------------------------------- */
function renderAll() {
  renderDashboard();
  renderPipeline();
  renderVenues();
}
renderAll();
applyI18n();
