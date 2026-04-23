from flask import Flask
from flask_cors import CORS
from app.cache import cache
import os

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None
from app.route.analytics import analytics
from app.routes.auth import auth
from app import db
from app.routes.user_dashboard import dashboard
from app.routes.ai import ai
from app.routes.admin_dashboard import admin
from app.routes.wishlist import wishlist


def load_backend_env():
    if load_dotenv is None:
        return
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    env_path = os.path.join(backend_dir, ".env")
    load_dotenv(env_path)

def create_app():
    load_backend_env()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "my-secret-key")
    cache.init_app(app)
    CORS(
        app,
        resources={
            r"/*": {
                "origins": [
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                    "http://localhost:5174",
                    "http://127.0.0.1:5174",
                ]
            }
        },
        allow_headers=["Content-Type", "Authorization"],
    )
    app.register_blueprint(auth)
    app.register_blueprint(dashboard)
    app.register_blueprint(ai) 
    app.register_blueprint(admin)
    app.register_blueprint(wishlist)  
    app.register_blueprint(analytics)
    return app 