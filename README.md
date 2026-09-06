# MediConnect Healthcare Platform

MediConnect is a modern healthcare platform that helps users discover doctors, explore hospitals and specialties, manage appointments, and access emergency ambulance services. Built with a responsive, user-friendly interface designed for patients and healthcare administrators alike.

---

## Features

- **User Registration & Login**: Secure authentication with role-based access for patients and administrators.
- **Doctor Search**: Fast search across doctor names, medical specializations, hospital affiliations, and symptoms.
- **Doctor Filtering**: Intuitive multi-faceted filtering by medical department, hospital, city/area, experience level, consultation fee, and availability.
- **Doctor Details**: Detailed doctor profiles with clinical qualifications, affiliated hospitals, consultation schedules, languages, and patient reviews.
- **Hospital Discovery**: Comprehensive directory of accredited multi-specialty hospitals with emergency contact hotlines and facility overviews.
- **Medical Specialties**: Browse medical departments with plain-language categories (Heart Care, Brain & Nerves, Bones & Joints, etc.) for non-technical users.
- **Appointment Booking**: Seamless appointment scheduling with immediate slot confirmation.
- **Ambulance/Emergency Service**: 24/7 emergency dispatch portal with instant dial hotlines (108, 112) and online ambulance requests.
- **Responsive UI**: Fully responsive layout tailored for desktop, tablet, and mobile screens with custom slide-over drawer filters.
- **Protected Routes**: Secure navigation guards ensuring patient data and administrative portals remain private.
- **User-friendly Healthcare Interface**: Clear typography, high-contrast layouts, and intuitive workflows accessible to elderly and first-time users.

---

## Tech Stack

### Frontend
- **React 19** - Modern component-based user interface
- **Vite 8** - Lightning-fast build tool and development server
- **JavaScript (ES6+)** - Core application logic
- **React Router 7** - Declarative single-page application routing with SPA refresh support
- **Axios** - HTTP client with JWT request/response interceptors
- **Vanilla CSS3** - Custom healthcare design system, fluid responsiveness, and micro-animations
- **React Icons** - Clinical and interface icon suite
- **React Toastify** - Non-intrusive feedback notifications

### Backend
- **Python 3.11+ / Flask 3.1** - RESTful API service
- **SQLAlchemy** - Relational database ORM
- **PyJWT** - Secure JSON Web Token generation and validation
- **Werkzeug Security** - Salted password hashing
- **Flask-CORS** - Cross-Origin Resource Sharing handling
- **SQLite / MySQL** - Relational data persistence with automatic fallback

---

## Project Structure

```text
DoctorApp/
├── frontend/                # React + Vite Frontend Application
│   ├── public/              # Static assets & SPA routing (_redirects)
│   │   ├── _redirects       # Netlify/Cloudflare SPA rewrite configuration
│   │   └── favicon.svg      # Platform favicon
│   ├── src/
│   │   ├── assets/          # Static brand illustrations and icons
│   │   ├── components/      # Reusable UI components (Navbar, Footer, DoctorCard, etc.)
│   │   ├── context/         # React Context (AuthContext)
│   │   ├── pages/           # Application views (Home, Doctors, Hospitals, Appointments, etc.)
│   │   ├── services/        # Centralized API service modules (api.js, authService.js, etc.)
│   │   ├── utils/           # Helper utilities & specialty mapping
│   │   ├── App.jsx          # Route definitions & layout wrappers
│   │   ├── index.css        # Core design system & CSS variables
│   │   └── main.jsx         # React application entry point
│   ├── .env.example         # Frontend environment variable template
│   ├── .gitignore           # Frontend Git ignore rules
│   ├── index.html           # HTML5 entry template
│   ├── package.json         # Dependencies & scripts
│   ├── vercel.json          # Vercel SPA routing rewrite configuration
│   └── vite.config.js       # Vite build configuration
│
├── backend/                 # Flask REST API Backend
│   ├── routes/              # Modular API blueprints (auth, doctors, hospitals, etc.)
│   ├── models.py            # SQLAlchemy database models
│   ├── app.py               # Flask application entry point
│   ├── config.py            # Application configuration
│   ├── requirements.txt     # Python backend dependencies
│   ├── seed.py              # Initial database seeder script
│   └── .env.example         # Backend environment variable template
│
├── .gitignore               # Root Git ignore rules (protects secrets & node_modules)
└── README.md                # Project documentation
```

---

## Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher) & **npm** (v9.0.0 or higher)
- **Python** (v3.10 or higher)

---

### 1. Frontend Setup (React + Vite)

```bash
# Navigate to the frontend directory
cd frontend

# Copy environment variable template
cp .env.example .env

# Install dependencies
npm install

# Start local development server
npm run dev
```

The frontend will start at **`http://localhost:5173`**.

#### Production Build

```bash
# Generate optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

The production assets will be generated in `frontend/dist/`.

---

### 2. Backend Setup (Flask API)

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Seed the database with sample hospitals, doctors, and specialties
python seed.py

# Run the Flask server
python app.py
```

The backend API will run at **`http://127.0.0.1:5000`**.

---

## Environment Variables

### Frontend (`frontend/.env.example`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Base endpoint for the Flask REST API | `http://localhost:5000/api` |

### Backend (`backend/.env.example`)
| Variable | Description | Default |
|---|---|---|
| `FLASK_ENV` | Environment mode (`development` / `production`) | `development` |
| `FLASK_PORT` | Backend server port | `5000` |
| `SECRET_KEY` | Secret key for signing sessions and tokens | `your_secret_key_here` |
| `DATABASE_URL` | Database connection string (MySQL or SQLite) | `sqlite:///doctor_hospital.db` |

> [!WARNING]
> Never commit `.env` files containing real secrets, private keys, or passwords to version control. The repository's `.gitignore` is preconfigured to prevent accidental commits.

---

## Production Deployment

### Deploying Frontend to Vercel
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Set **Build Command** to `npm run build`.
4. Set **Output Directory** to `dist`.
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: URL of your deployed backend (e.g., `https://api.yourdomain.com/api`).
6. Deploy! The included `frontend/vercel.json` ensures all client-side routes rewrite to `index.html`.

### Deploying Frontend to Netlify
1. Connect your repository to [Netlify](https://netlify.com).
2. Set **Base directory** to `frontend`.
3. Set **Build command** to `npm run build`.
4. Set **Publish directory** to `frontend/dist`.
5. Under **Environment variables**, set `VITE_API_URL`.
6. Deploy! The included `frontend/public/_redirects` automatically copies to `dist/_redirects` to handle SPA route refreshes.

### Deploying Backend to Render / Railway
1. Set **Root Directory** to `backend`.
2. Set **Build Command** to `pip install -r requirements.txt`.
3. Set **Start Command** to `python app.py` or `gunicorn app:app`.
4. Configure environment variables (`SECRET_KEY`, `FLASK_ENV=production`, etc.).

---

## Demo Credentials

For testing and demonstration:

| Role | Email | Password |
|---|---|---|
| **Patient / User** | `patient@medicare.com` | `Patient@123` |
| **Administrator** | `admin@medicare.com` | `Admin@123` |

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
