import json
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import current_user, login_user, logout_user, login_required
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask_mail import Message
from . import db, mail
from .models import User
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


def send_email(subject: str, recipients: list[str], body: str) -> None:
    try:
        msg = Message(subject=subject, recipients=recipients, body=body)
        mail.send(msg)
    except Exception:
        # In dev, swallow email errors so local work continues
        pass


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

    # send verification email
    token = generate_token(user.email, "verify")
    link = url_for("auth.verify_email", token=token, _external=True)
    send_email("verify your turtle trips account", [user.email], f"click to verify: {link}")

    flash("check your email to verify your account", "info")
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
        send_email("reset your turtle trips password", [user.email], f"reset link: {link}")
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


