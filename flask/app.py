"""Music Booking Tracker — Flask backend.

Free stack: Flask + SQLite (stdlib). No paid APIs, no external services.
Run with:  python app.py   →  http://localhost:5000
"""
from flask import Flask, jsonify, render_template, request

import models

app = Flask(__name__)


@app.before_request
def _ensure_db():
    models.init_db()


# ---- Pages -----------------------------------------------------------------

@app.route("/")
def dashboard():
    counts = models.stage_counts()
    overdue = models.overdue_follow_ups()
    recent = models.list_bookings()[:8]
    return render_template(
        "dashboard.html",
        counts=counts,
        stages=models.STAGES,
        overdue=overdue,
        recent=recent,
    )


@app.route("/pipeline")
def pipeline():
    search = request.args.get("q", "").strip() or None
    columns = []
    for stage, label in models.STAGES:
        columns.append(
            {
                "stage": stage,
                "label": label,
                "bookings": models.list_bookings(
                    stage=stage, search=search
                ),
            }
        )
    return render_template(
        "pipeline.html", columns=columns, stages=models.STAGES,
        search=search or "",
    )


@app.route("/venues")
def venues_page():
    search = request.args.get("q", "").strip() or None
    venues = models.list_venues(search=search)
    return render_template(
        "venues.html", venues=venues, search=search or "",
        stages=models.STAGES,
    )


# ---- JSON API ---------------------------------------------------------------

@app.route("/api/venues", methods=["GET", "POST"])
def api_venues():
    if request.method == "POST":
        data = request.get_json(force=True)
        if not data.get("name"):
            return jsonify({"error": "name is required"}), 400
        venue_id = models.create_venue(data)
        return jsonify({"id": venue_id}), 201
    search = request.args.get("q", "").strip() or None
    return jsonify(models.list_venues(search=search))


@app.route("/api/bookings", methods=["GET", "POST"])
def api_bookings():
    if request.method == "POST":
        data = request.get_json(force=True)
        if not data.get("venue_id") or not data.get("title"):
            return jsonify(
                {"error": "venue_id and title are required"}
            ), 400
        booking_id = models.create_booking(data)
        return jsonify({"id": booking_id}), 201
    stage = request.args.get("stage") or None
    search = request.args.get("q", "").strip() or None
    return jsonify(models.list_bookings(stage=stage, search=search))


@app.route("/api/bookings/<int:booking_id>", methods=["GET", "PATCH"])
def api_booking_detail(booking_id):
    if request.method == "PATCH":
        data = request.get_json(force=True)
        ok = models.update_booking(booking_id, data)
        if not ok:
            return jsonify({"error": "not found or no changes"}), 404
        return jsonify({"ok": True})
    booking = models.get_booking(booking_id)
    if not booking:
        return jsonify({"error": "not found"}), 404
    return jsonify(booking)


@app.route("/api/bookings/<int:booking_id>/move", methods=["POST"])
def api_booking_move(booking_id):
    data = request.get_json(force=True)
    stage = data.get("stage")
    ok = models.move_booking_stage(booking_id, stage)
    if not ok:
        return jsonify({"error": "invalid stage or not found"}), 400
    return jsonify({"ok": True})


@app.route("/api/followups/overdue")
def api_overdue():
    return jsonify(models.overdue_follow_ups())


if __name__ == "__main__":
    import os
    models.init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
