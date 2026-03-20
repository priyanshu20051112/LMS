from app import create_app
from app.routes.auth import auth
from app import db

app = create_app()

if __name__=='__main__':
    app.run(debug=True)