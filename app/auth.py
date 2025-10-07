import json
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import current_user, login_user, logout_user, login_required
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask_mail import Message
from .models import db, User
from . import mail
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError
from flask import current_app

bp = Blueprint("auth", __name__, template_folder="templates")


def _ts():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"])  # time-safe signer


def generate_token(email: str, purpose: str) -> str:
    return _ts().dumps({"email": email, "purpose": purpose}, salt=current_app.config.get("SECURITY_PASSWORD_SALT", "salt"))


def verify_token(token: str, max_age: int, expected_purpose: str):
    try:
        data = _ts().loads(token, salt=current_app.config.get("SECURITY_PASSWORD_SALT", "salt"), max_age=max_age)
        if data.get("purpose") != expected_purpose:
            return None
        return data
    except (BadSignature, SignatureExpired):
        return None


def send_email(subject: str, recipients: list[str], body: str) -> bool:
    """Attempt to send an email. Returns True on success.

    In development, if mail credentials are missing or sending fails, return False
    so callers can provide an on-screen fallback link.
    """
    try:
        # Minimal sanity checks for local/dev environments
        if not current_app.config.get("MAIL_PASSWORD"):
            return False
        msg = Message(subject=subject, recipients=recipients, body=body)
        mail.send(msg)
        return True
    except Exception:
        return False


@bp.get("/login")
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.home"))
    return render_template("auth/login.html", title="turtle trips — login")


@bp.post("/login")
def login_post():
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        flash("invalid credentials", "error")
        return redirect(url_for("auth.login"))
    login_user(user, remember=True)
    return redirect(request.args.get("next") or url_for("main.home"))


@bp.get("/signup")
def signup():
    if current_user.is_authenticated:
        return redirect(url_for("main.home"))
    return render_template("auth/signup.html", title="turtle trips — sign up")


@bp.post("/signup")
def signup_post():
    email = (request.form.get("email") or "").strip().lower()
    password = request.form.get("password") or ""
    if not email or not password:
        flash("email and password required", "error")
        return redirect(url_for("auth.signup"))
    user = User(email=email)
    user.set_password(password)
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        flash("account already exists", "error")
        return redirect(url_for("auth.signup"))

    # send verification email (with dev fallback link)
    token = generate_token(user.email, "verify")
    # Use the correct port for local development
    link = url_for("auth.verify_email", token=token, _external=True)
    if "5000" in link:
        link = link.replace("5000", "5001")
    
    sent = send_email("verify your turtle trips account", [user.email], f"click to verify: {link}")

    if sent:
        flash("check your email to verify your account", "info")
    else:
        # Dev fallback so local testing works without SMTP
        flash(f"email not sent in dev — verify using this link: {link}", "info")
    return redirect(url_for("auth.login"))


@bp.get("/verify/<token>")
def verify_email(token):
    data = verify_token(token, max_age=60 * 60 * 24, expected_purpose="verify")
    if not data:
        flash("verification link invalid or expired", "error")
        return redirect(url_for("auth.login"))
    user = User.query.filter_by(email=data.get("email")).first()
    if not user:
        flash("account not found", "error")
        return redirect(url_for("auth.signup"))
    if not user.is_verified:
        user.is_verified = True
        db.session.commit()
    flash("email verified — you can now log in", "success")
    return redirect(url_for("auth.login"))


@bp.get("/forgot")
def forgot():
    if current_user.is_authenticated:
        return redirect(url_for("main.home"))
    return render_template("auth/forgot.html", title="turtle trips — forgot password")


@bp.post("/forgot")
def forgot_post():
    email = (request.form.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()
    if user:
        token = generate_token(user.email, "reset")
        link = url_for("auth.reset", token=token, _external=True)
        # Use the correct port for local development
        if "5000" in link:
            link = link.replace("5000", "5001")
        
        sent = send_email("reset your turtle trips password", [user.email], f"reset link: {link}")
        if not sent:
            # Dev fallback: surface the link so you can complete the flow locally
            flash(f"email not sent in dev — use this reset link: {link}", "info")
        else:
            flash("if an account exists, a reset email was sent", "info")
    else:
        flash("if an account exists, a reset email was sent", "info")
    return redirect(url_for("auth.login"))


@bp.get("/reset/<token>")
def reset(token):
    data = verify_token(token, max_age=60 * 60 * 2, expected_purpose="reset")
    if not data:
        flash("reset link invalid or expired", "error")
        return redirect(url_for("auth.forgot"))
    return render_template("auth/reset.html", token=token, title="turtle trips — reset password")


@bp.post("/reset/<token>")
def reset_post(token):
    data = verify_token(token, max_age=60 * 60 * 2, expected_purpose="reset")
    if not data:
        flash("reset link invalid or expired", "error")
        return redirect(url_for("auth.forgot"))
    password = request.form.get("password") or ""
    if not password:
        flash("password required", "error")
        return redirect(url_for("auth.reset", token=token))
    user = User.query.filter_by(email=data.get("email")).first()
    if not user:
        flash("account not found", "error")
        return redirect(url_for("auth.signup"))
    user.set_password(password)
    db.session.commit()
    flash("password updated — you can now log in", "success")
    return redirect(url_for("auth.login"))


@bp.post("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("main.home"))


@bp.get("/profile")
@login_required
def profile():
    return render_template("auth/profile.html", title="turtle trips — profile")


@bp.post("/profile")
@login_required
def profile_post():
    budget = request.form.get("budget_preference", "").strip()
    travel_style = request.form.get("travel_style", "").strip()
    bio = request.form.get("bio", "").strip()
    must_see = request.form.get("must_see", "").strip()
    must_avoid = request.form.get("must_avoid", "").strip()
    notes = request.form.get("notes", "").strip()
    interests = request.form.getlist("interests")  # Get multiple checkbox values
    
    # Validate budget preference
    valid_budgets = ["$", "$$", "$$$", "$$$$", "$$$$$"]
    if budget in valid_budgets:
        current_user.budget_preference = budget
    
    # Validate travel style
    valid_styles = ["chill", "balanced", "packed"]
    if travel_style in valid_styles:
        current_user.travel_style = travel_style
    
    # Update all profile fields
    current_user.bio = bio
    current_user.must_see = must_see
    current_user.must_avoid = must_avoid
    current_user.notes = notes
    
    # Update interests
    current_user.set_interests(interests)
    
    try:
        db.session.commit()
        flash("profile updated", "success")
    except Exception:
        db.session.rollback()
        flash("error updating profile", "error")
    
    return redirect(url_for("auth.profile"))


