# backend/init_users.py
import os
from app import app, db
from app import User  # Assure-toi d'avoir ton modèle User dans models.py ou app.py
from werkzeug.security import generate_password_hash

def init_db_users():
    with app.app_context():
        # 1. Création de l'Administrateur
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                password_hash=generate_password_hash('admin123'),
                role='admin'
            )
            db.session.add(admin)
            print("✅ Utilisateur 'admin' créé (Mot de passe: admin123)")
        else:
            print("ℹ️  L'utilisateur 'admin' existe déjà.")

        # 2. Création de l'Analyste (User Standard)
        if not User.query.filter_by(username='analyste_test').first():
            analyst = User(
                username='analyste_test',
                password_hash=generate_password_hash('user123'),
                role='analyst'
            )
            db.session.add(analyst)
            print("✅ Utilisateur 'analyste_test' créé (Mot de passe: user123)")
        else:
            print("ℹ️  L'utilisateur 'analyste_test' existe déjà.")

        try:
            db.session.commit()
            print("🎉 Succès ! Les utilisateurs sont prêts pour la démo.")
        except Exception as e:
            db.session.rollback()
            print(f"❌ Erreur lors de la création : {e}")

if __name__ == "__main__":
    init_db_users()