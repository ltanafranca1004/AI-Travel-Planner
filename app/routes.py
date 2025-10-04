from flask import Blueprint, render_template
import google.generativeai as genai
API_KEY = "***REMOVED***"
genai.configure(api_key=API_KEY)
bp = Blueprint("main", __name__)

@bp.get("/")
def home():
    # Renders the landing page with logo + heading
    model = genai.GenerativeModel('gemini-2.5-flash')
    return render_template("home.html", title="Turtle Trips")
