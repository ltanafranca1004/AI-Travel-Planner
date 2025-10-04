from flask import Blueprint, render_template

bp = Blueprint("main", __name__)

@bp.get("/")
def home():
    # Renders the landing page with logo + heading
    return render_template("home.html", title="Turtle Trips")
