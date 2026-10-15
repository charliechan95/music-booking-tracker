/* i18n — EN / 繁中 language switch for the music booking tracker.
   UI language only; user data (venues, bookings) is never translated.
   Persisted per browser; default is English. */
"use strict";

const I18N = {
  en: {
    title: "Music Booking Tracker",
    brand: "🎵 Booking Tracker",
    tab_dashboard: "Dashboard", tab_pipeline: "Pipeline", tab_venues: "Venues",
    dash_title: "Dashboard",
    dash_overdue_title: "⚠️ Overdue follow-ups",
    dash_recent_title: "Recent bookings",
    th_booking: "Booking", th_venue: "Venue", th_followup_was: "Follow-up was",
    th_title: "Title", th_event_date: "Event date", th_stage: "Stage",
    th_name: "Name", th_contact: "Contact", th_location: "Location",
    th_type: "Type",
    btn_export: "⬇ Export data (JSON)",
    export_note: "Backup your data — same device only.",
    pipeline_title: "Booking pipeline",
    ph_search_bookings: "Search bookings…",
    btn_search: "Search",
    btn_new_booking: "+ New booking",
    venues_title: "Venues & contacts",
    ph_search_venues: "Search venues…",
    btn_new_venue: "+ New venue",
    dlg_venue_new: "New venue", dlg_booking_new: "New booking",
    lbl_venue_name: "Name", lbl_contact_name: "Contact name",
    lbl_email: "Email", lbl_phone: "Phone", lbl_city: "City",
    lbl_country: "Country", lbl_venue_type: "Venue type",
    lbl_source: "Source", lbl_notes: "Notes",
    lbl_venue: "Venue", lbl_booking_title: "Title",
    lbl_event_date: "Event date", lbl_stage: "Stage", lbl_fee: "Fee",
    lbl_currency: "Currency", lbl_followup_date: "Follow-up date",
    ph_venue_name: "e.g. Esplanade Concert Hall",
    ph_venue_type: "Concert hall / Festival / Wedding / Corporate",
    ph_venue_source: "Referral / Cold outreach / Agent…",
    ph_booking_title: "e.g. Diwali Gala Night",
    btn_save: "Save", btn_cancel: "Cancel",
    btn_mark_contacted: "Mark contacted",
    no_bookings_hint: "No bookings yet. Add your first venue, then a booking.",
    no_bookings: "No bookings",
    no_venues_hint: "No venues yet. Add your first one.",
    lbl_followup: "Follow up",
    btn_new_booking_for: "+ Booking",
    alert_venue_first: "Add a venue first, then create a booking.",
    via: "via",
    stage_new_lead: "New Lead", stage_contacted: "Contacted",
    stage_negotiating: "Negotiating", stage_confirmed: "Confirmed",
    stage_completed: "Completed", stage_cancelled: "Cancelled",
  },
  zh: {
    title: "演出預約追蹤",
    brand: "🎵 預約追蹤",
    tab_dashboard: "主頁", tab_pipeline: "預約流程", tab_venues: "場地",
    dash_title: "主頁",
    dash_overdue_title: "⚠️ 逾期跟進",
    dash_recent_title: "近期預約",
    th_booking: "預約", th_venue: "場地", th_followup_was: "跟進日期",
    th_title: "標題", th_event_date: "活動日期", th_stage: "階段",
    th_name: "名稱", th_contact: "聯絡人", th_location: "地點",
    th_type: "類型",
    btn_export: "⬇ 匯出資料（JSON）",
    export_note: "備份你的資料 — 只在此裝置。",
    pipeline_title: "預約流程",
    ph_search_bookings: "搜尋預約…",
    btn_search: "搜尋",
    btn_new_booking: "+ 新增預約",
    venues_title: "場地及聯絡人",
    ph_search_venues: "搜尋場地…",
    btn_new_venue: "+ 新增場地",
    dlg_venue_new: "新增場地", dlg_booking_new: "新增預約",
    lbl_venue_name: "名稱", lbl_contact_name: "聯絡人姓名",
    lbl_email: "電郵", lbl_phone: "電話", lbl_city: "城市",
    lbl_country: "國家", lbl_venue_type: "場地類型",
    lbl_source: "來源", lbl_notes: "備註",
    lbl_venue: "場地", lbl_booking_title: "標題",
    lbl_event_date: "活動日期", lbl_stage: "階段", lbl_fee: "費用",
    lbl_currency: "貨幣", lbl_followup_date: "跟進日期",
    ph_venue_name: "例如：濱海藝術中心音樂廳",
    ph_venue_type: "音樂廳／音樂節／婚禮／企業活動",
    ph_venue_source: "介紹／主動聯絡／經紀…",
    ph_booking_title: "例如：排燈節晚宴演出",
    btn_save: "儲存", btn_cancel: "取消",
    btn_mark_contacted: "標為已聯絡",
    no_bookings_hint: "尚無預約。請先新增第一個場地，再新增預約。",
    no_bookings: "尚無預約",
    no_venues_hint: "尚無場地。請先新增第一個。",
    lbl_followup: "跟進",
    btn_new_booking_for: "+ 預約",
    alert_venue_first: "請先新增一個場地，再建立預約。",
    via: "來自",
    stage_new_lead: "新潛在客戶", stage_contacted: "已聯絡",
    stage_negotiating: "議價中", stage_confirmed: "已確認",
    stage_completed: "已完成", stage_cancelled: "已取消",
  },
};

let LANG = "en";
try {
  LANG = localStorage.getItem("mbt_lang") === "zh" ? "zh" : "en";
} catch { /* storage unavailable: keep default */ }

function t(key) {
  return (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.querySelectorAll("[data-lang-btn]").forEach((b) =>
    b.classList.toggle("active", b.dataset.langBtn === LANG));
  document.documentElement.lang = LANG === "zh" ? "zh-Hant" : "en";
  document.title = t("title");
}

function setLang(next) {
  if (next !== "zh" && next !== "en") return;
  LANG = next;
  try { localStorage.setItem("mbt_lang", LANG); } catch { /* ignore */ }
  applyI18n();
  if (typeof renderAll === "function") renderAll();
  if (typeof window.onLangChange === "function") window.onLangChange();
}

document.querySelectorAll("[data-lang-btn]").forEach((b) =>
  b.addEventListener("click", () => setLang(b.dataset.langBtn)));
