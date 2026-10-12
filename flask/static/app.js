/* Music Booking Tracker — small helpers, no frameworks. */
"use strict";

async function api(path, method, body) {
  const res = await fetch(path, {
    method: method || "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || ("HTTP " + res.status));
  }
  return res.json();
}

function formToJson(form) {
  const data = {};
  new FormData(form).forEach((v, k) => {
    data[k] = v === "" ? null : v;
  });
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  // ---- Venue dialog -------------------------------------------------------
  const dlgVenue = document.getElementById("dlg-venue");
  const frmVenue = document.getElementById("frm-venue");
  const btnNewVenue = document.getElementById("btn-new-venue");
  const btnCancelVenue = document.getElementById("btn-cancel-venue");

  if (btnNewVenue) {
    btnNewVenue.addEventListener("click", () => dlgVenue.showModal());
  }
  if (btnCancelVenue) {
    btnCancelVenue.addEventListener("click", () => dlgVenue.close());
  }
  if (frmVenue) {
    frmVenue.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/api/venues", "POST", formToJson(frmVenue));
        location.reload();
      } catch (err) {
        alert("Could not save venue: " + err.message);
      }
    });
  }

  // ---- Booking dialog ------------------------------------------------------
  const dlgBooking = document.getElementById("dlg-booking");
  const frmBooking = document.getElementById("frm-booking");
  const btnNewBooking = document.getElementById("btn-new-booking");
  const btnCancelBooking = document.getElementById("btn-cancel-booking");
  const selVenue = document.getElementById("f-venue");

  async function loadVenues(preselectId) {
    if (!selVenue) return;
    const venues = await api("/api/venues");
    selVenue.innerHTML = "";
    venues.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent =
        v.name + (v.city ? " — " + v.city : "");
      if (preselectId && String(v.id) === String(preselectId)) {
        opt.selected = true;
      }
      selVenue.appendChild(opt);
    });
  }

  if (btnNewBooking) {
    btnNewBooking.addEventListener("click", async () => {
      await loadVenues();
      if (!selVenue.options.length) {
        alert("Add a venue first, then create a booking.");
        return;
      }
      dlgBooking.showModal();
    });
  }
  if (btnCancelBooking) {
    btnCancelBooking.addEventListener("click", () => dlgBooking.close());
  }
  if (frmBooking) {
    frmBooking.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api("/api/bookings", "POST", formToJson(frmBooking));
        location.reload();
      } catch (err) {
        alert("Could not save booking: " + err.message);
      }
    });
  }

  // "New booking" shortcut from the venues table
  document.querySelectorAll("[data-new-booking-for]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await loadVenues(btn.getAttribute("data-new-booking-for"));
      dlgBooking.showModal();
    });
  });

  // ---- Stage changes --------------------------------------------------------
  document.querySelectorAll("[data-stage-select]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const id = sel.getAttribute("data-id");
      try {
        await api("/api/bookings/" + id + "/move", "POST", {
          stage: sel.value,
        });
        location.reload();
      } catch (err) {
        alert("Could not move booking: " + err.message);
      }
    });
  });

  // Dashboard overdue quick action
  document.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const stage = btn.getAttribute("data-stage");
      try {
        await api("/api/bookings/" + id + "/move", "POST", { stage });
        location.reload();
      } catch (err) {
        alert("Could not update: " + err.message);
      }
    });
  });
});
