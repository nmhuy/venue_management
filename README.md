# VenueManager

Application de gestion de lieux événementiels (mariages, séminaires, fêtes).

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | Python 3.9 · FastAPI · SQLAlchemy · SQLite |
| Auth | JWT (python-jose) · bcrypt (passlib) |
| Frontend | React 18 · Vite · Tailwind CSS · TanStack Query |

---

## Installation

### Prérequis

- Python 3.9+
- Node.js 18+

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Initialiser la base de données avec des données de démo
python seed.py
python seed_users.py
```

### Frontend

```bash
cd frontend
npm install
```

---

## Démarrage

Lancer les deux serveurs dans des terminaux séparés :

```bash
# Terminal 1 — API
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — Interface
cd frontend
npm run dev
```

| Service | URL |
|---|---|
| Application | http://localhost:5173 |
| API REST | http://localhost:8000 |
| Documentation API (Swagger) | http://localhost:8000/docs |

---

## Comptes de démonstration

| Utilisateur | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin123` | Admin |
| `editeur` | `edit123` | Éditeur |
| `lecteur` | `view123` | Lecteur |

---

## Rôles et permissions

| Action | Lecteur | Éditeur | Admin |
|---|:---:|:---:|:---:|
| Voir lieux, réservations, clients | ✓ | ✓ | ✓ |
| Créer / modifier / supprimer | — | ✓ | ✓ |
| Gérer les utilisateurs | — | — | ✓ |

---

## Fonctionnalités

### Lieux
- Fiche complète : capacité, prix/jour, surface, ville, description
- Équipements : parking, traiteur, hébergement, jardin, piscine, sono
- Types d'événements associés (mariage, séminaire, fête, autre)
- Vérification de disponibilité sur une période
- Upload de photos

### Réservations
- Détection automatique des conflits de dates
- Calcul automatique du prix total
- Suivi des acomptes
- Statuts : en attente · confirmé · annulé · terminé
- **Vue liste** avec filtres par statut et type d'événement
- **Vue calendrier** mensuelle avec navigation et légende par type

### Clients
- Annuaire avec recherche
- Historique des réservations

### Tableau de bord
- Statistiques en temps réel (lieux actifs, CA, réservations)
- Liste des prochaines réservations (30 jours)

### Authentification
- Connexion JWT (durée 8h)
- Changement de mot de passe personnel
- Gestion des utilisateurs réservée aux admins (création, rôle, réinitialisation de mot de passe)

---

## Structure du projet

```
venue_management/
├── backend/
│   ├── main.py              # Point d'entrée FastAPI, route /dashboard
│   ├── database.py          # Connexion SQLite, session factory
│   ├── models.py            # Modèles SQLAlchemy (User, Venue, Client, Booking)
│   ├── schemas.py           # Schémas Pydantic (validation I/O)
│   ├── auth.py              # JWT, bcrypt, dépendances require_editor/require_admin
│   ├── seed.py              # Jeu de données lieux/clients/réservations
│   ├── seed_users.py        # Comptes de démonstration
│   ├── requirements.txt
│   └── routers/
│       ├── auth_router.py   # POST /auth/login, GET /auth/me, CRUD /auth/users
│       ├── venues.py        # CRUD /venues + upload photos + disponibilité
│       ├── bookings.py      # CRUD /bookings
│       └── clients.py       # CRUD /clients
│
└── frontend/
    └── src/
        ├── api.js           # Instance axios avec intercepteur JWT
        ├── AuthContext.jsx  # Contexte auth (login/logout, canEdit, isAdmin)
        ├── App.jsx          # Routeur, AppShell, sidebar, RequireAuth/RequireAdmin
        └── pages/
            ├── Dashboard.jsx
            ├── Venues.jsx
            ├── Bookings.jsx     # Inclut CalendarView
            ├── Clients.jsx
            ├── Users.jsx        # Admin uniquement
            ├── Login.jsx
            └── ChangePassword.jsx
```

---

## API — principales routes

### Auth
| Méthode | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | Connexion (form OAuth2), retourne un JWT |
| `GET` | `/auth/me` | Profil de l'utilisateur connecté |
| `PUT` | `/auth/me/password` | Changer son propre mot de passe |
| `GET` | `/auth/users` | Liste des utilisateurs *(admin)* |
| `POST` | `/auth/users` | Créer un utilisateur *(admin)* |
| `PUT` | `/auth/users/{id}` | Modifier un utilisateur *(admin)* |
| `PUT` | `/auth/users/{id}/reset-password` | Réinitialiser un mot de passe *(admin)* |
| `DELETE` | `/auth/users/{id}` | Supprimer un utilisateur *(admin)* |

### Lieux
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/venues/` | Liste avec filtres (search, city, event_type, capacity, max_price) |
| `POST` | `/venues/` | Créer un lieu *(éditeur+)* |
| `PUT` | `/venues/{id}` | Modifier *(éditeur+)* |
| `DELETE` | `/venues/{id}` | Désactiver *(éditeur+)* |
| `GET` | `/venues/{id}/availability` | Vérifier la disponibilité sur une période |
| `POST` | `/venues/{id}/photos` | Uploader une photo *(éditeur+)* |

### Réservations
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/bookings/` | Liste avec filtres (status, event_type, venue_id, from_date, to_date) |
| `POST` | `/bookings/` | Créer (vérifie les conflits, calcule le prix) *(éditeur+)* |
| `PUT` | `/bookings/{id}` | Modifier *(éditeur+)* |
| `DELETE` | `/bookings/{id}` | Annuler *(éditeur+)* |

### Clients & Dashboard
| Méthode | Route | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/clients/…` | CRUD clients |
| `GET` | `/dashboard` | Statistiques + prochaines réservations |

La documentation interactive complète est disponible sur **http://localhost:8000/docs**.
