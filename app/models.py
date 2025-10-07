from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager

# These will be initialized in __init__.py
db = SQLAlchemy()
login_manager = LoginManager()


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Profile preferences
    budget_preference = db.Column(db.String(20), default="$$", nullable=False)  # $, $$, $$$, $$$$, $$$$$
    travel_style = db.Column(db.String(50), default="balanced", nullable=False)  # chill, balanced, packed
    interests = db.Column(db.Text, default="[]", nullable=False)  # JSON array of interests
    bio = db.Column(db.Text, nullable=True)
    must_see = db.Column(db.Text, nullable=True)
    must_avoid = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    trips = db.relationship("Trip", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
    
    def get_interests(self) -> list:
        """Get user interests as a Python list"""
        import json
        try:
            return json.loads(self.interests)
        except (json.JSONDecodeError, TypeError):
            return []
    
    def set_interests(self, interests: list) -> None:
        """Set user interests from a Python list"""
        import json
        self.interests = json.dumps(interests)


class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    payload_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


@login_manager.user_loader
def load_user(user_id: str):
    try:
        return User.query.get(int(user_id))
    except Exception:
        return None


