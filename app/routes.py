# routes.py
import json
from flask import Blueprint, render_template, request
import google.generativeai as genai

bp = Blueprint("main", __name__)

# --- your keys (hardcoded as requested) ---
GEMINI_API_KEY = "***REMOVED***"
GOOGLE_MAPS_API_KEY = "***REMOVED***"

# configure gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

@bp.get("/")
def home():
    return render_template("home.html", title="turtle trips.")

@bp.route("/review", methods=["GET", "POST"])
def review():
    data = request.form if request.method == "POST" else request.args
    return render_template("review.html", data=data, title="turtle trips — questions")

@bp.post("/generate")
def generate():
    # payload is posted from the questionnaire page as a hidden field
    raw = request.form.get("payload", "{}")
    try:
        payload = json.loads(raw)
    except Exception:
        payload = {"error": "bad payload"}

    # require JSON-only output from Gemini
    prompt = (
        "Using the following trip data, generate 2 different day by day travel plans and put "
        "the location plans in JSON. Output ONLY JSON. Each activity must include an exact spot "
        "(e.g., 'Eiffel Tower', 'McDonald's'). Keep the schema like: "
        '{"travel_plans":[{"plan_name":"","plan_description":"","daily_plan":[{"day":1,'
        '"date":"YYYY-MM-DD","theme":"","activities":[{"time_of_day":"","spot":"","description":""}]}]}]}. '
        "Budget key: $ = shoestring, $$ = budget, $$$ = comfortable, $$$$ = splurge, $$$$$ = luxury.\n"
        "Trip data:\n```json\n" + json.dumps(payload, indent=2) + "\n```"
    )

    try:
        resp = model.generate_content(prompt)
        generated_content = (resp.text or "").strip()
    except Exception as e:
        generated_content = json.dumps({"error": "Gemini API failed", "detail": str(e)})

    return render_template(
        "generate.html",
        payload=generated_content,
        google_maps_api_key=GOOGLE_MAPS_API_KEY,
        title="turtle trips — plan",
    )
