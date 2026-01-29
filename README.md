# Chemical Equipment Visualizer

A full-stack application for uploading, analyzing, and visualizing chemical equipment data with both web and desktop interfaces.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Django](https://img.shields.io/badge/Django-4.0+-green.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- **CSV Upload** — Upload equipment data via web or desktop interface
- **Data Analysis** — Automatic calculation of statistics and summaries
- **Interactive Charts** — Visualizations using Chart.js (web) and Matplotlib (desktop)
- **History Management** — Store and retrieve the last 5 uploaded datasets
- **PDF Reports** — Generate detailed analysis reports
- **Dark Mode** — Toggle between light and dark themes
- **User Authentication** — Secure registration and login system

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Django + Django REST Framework |
| Web Frontend | React.js + Chart.js |
| Desktop App | PyQt5 + Matplotlib |
| Database | SQLite |
| PDF Generation | ReportLab |

## Project Structure

```
visualizer/
├── backend/                    # Django REST API
│   ├── equipment_app/          # Main application
│   │   ├── models.py           # Database models
│   │   ├── views.py            # API endpoints
│   │   ├── serializers.py      # Data serializers
│   │   └── urls.py             # URL routing
│   └── visualizer_config/      # Django settings
├── frontend/
│   ├── web/                    # React application
│   │   └── src/
│   │       ├── components/     # React components
│   │       └── styles/         # CSS files
│   └── desktop/                # PyQt5 application
│       └── main.py
└── sample-data.csv             # Sample CSV for testing
```

## Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- pip and npm

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start the server
python manage.py runserver
```

The API will be available at `http://localhost:8000`

### 2. Web Frontend Setup

```bash
cd frontend/web

# Install dependencies
npm install

# Start development server
npm start
```

The web app will open at `http://localhost:3000`

### 3. Desktop App Setup (Optional)

```bash
cd frontend/desktop

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout |

### Datasets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/datasets/` | List all datasets |
| POST | `/api/datasets/upload/` | Upload CSV file |
| GET | `/api/datasets/summary/` | Get dataset summaries |
| GET | `/api/datasets/{id}/details/` | Get dataset details |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/{id}/generate_pdf/` | Generate PDF report |

## CSV Format

The uploaded CSV should contain these columns:

```csv
Equipment Name,Type,Flowrate,Pressure,Temperature
Pump-A1,Centrifugal Pump,150.5,30.2,65.3
Compressor-C1,Rotary Compressor,200.3,80.0,72.1
```

A sample file (`sample-data.csv`) is included for testing.

## Usage

### Web Interface
1. Open `http://localhost:3000` in your browser
2. Click "Upload" and select a CSV file
3. View the analysis in Summary, Charts, and Data Table tabs
4. Use the dropdown to switch between previous uploads
5. Generate PDF reports as needed

### Desktop Application
1. Launch the application with `python main.py`
2. Click "Upload CSV" and select your file
3. Navigate through tabs to view different visualizations
4. Export data or generate reports

## Scripts

| File | Description |
|------|-------------|
| `start.bat` | Start both servers on Windows |
| `start.sh` | Start both servers on macOS/Linux |
| `run-desktop.bat` | Launch desktop app on Windows |

## Development

### Backend
- Models: `backend/equipment_app/models.py`
- Views: `backend/equipment_app/views.py`
- Auth: `backend/equipment_app/auth_views.py`

### Frontend
- Components: `frontend/web/src/components/`
- Styles: `frontend/web/src/styles/`

## Troubleshooting

**Port already in use:**
```bash
# Backend: use different port
python manage.py runserver 8001

# Frontend: set PORT environment variable
set PORT=3001 && npm start    # Windows
PORT=3001 npm start           # macOS/Linux
```

**CORS errors:**
Ensure your frontend URL is listed in `CORS_ALLOWED_ORIGINS` in `backend/visualizer_config/settings.py`

**Module not found:**
```bash
pip install -r requirements.txt    # Backend
npm install                        # Frontend
```

## License

MIT License — feel free to use this project for learning and development.
