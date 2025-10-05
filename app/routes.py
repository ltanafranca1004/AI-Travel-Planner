from flask import Blueprint, render_template, request
import json

bp = Blueprint("main", __name__)

@bp.get("/")
def home():
    return render_template("home.html", title="turtle trips.")

@bp.route("/review", methods=["GET", "POST"])
def review():
    data = request.form if request.method == "POST" else request.args
    return render_template("review.html", data=data, title="turtle trips — questions")

@bp.post("/generate")
def generate():
    raw = request.form.get("payload", "{}")
    try:
        payload = json.loads(raw)
    except Exception:
        payload = {}
    return render_template("generate.html", payload=payload, title="turtle trips — plan")
