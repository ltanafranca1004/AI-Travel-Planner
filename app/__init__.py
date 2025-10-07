from flask import Flask
import os
from flask_mail import Mail
from .routes import bp as main_bp
from .models import db, login_manager

# extensions
mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY="dev",  # replace for prod
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///tt.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.sendgrid.net"),
        MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
        MAIL_USE_TLS=True,
        MAIL_USERNAME=os.getenv("MAIL_USERNAME", "apikey"),  # sendgrid username
        MAIL_PASSWORD=os.getenv("SENDGRID_API_KEY", ""),
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_DEFAULT_SENDER", "noreply@turtletrips.ai"),
        SECURITY_PASSWORD_SALT=os.getenv("SECURITY_PASSWORD_SALT", "dev-salt"),
        OAUTHLIB_INSECURE_TRANSPORT=os.getenv("OAUTHLIB_INSECURE_TRANSPORT", "1"),
        WTF_CSRF_ENABLED=False,
    )

    # init extensions
    db.init_app(app)
    login_manager.init_app(app)
    mail.init_app(app)

    # login settings
    login_manager.login_view = "auth.login"
    login_manager.login_message_category = "info"

    # register blueprints
    app.register_blueprint(main_bp)

    from .auth import bp as auth_bp  # lazy import after extensions
    app.register_blueprint(auth_bp, url_prefix="/auth")

    with app.app_context():
        # ensure models are registered before table creation
        from . import models  # noqa: F401
        db.create_all()

    return app
