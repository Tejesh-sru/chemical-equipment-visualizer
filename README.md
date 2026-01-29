# Chemical Equipment Visualizer

Full-stack app for uploading and visualizing chemical equipment data.

## Tech Stack

- **Backend:** Django REST Framework
- **Frontend:** React.js + Chart.js  
- **Desktop:** PyQt5 + Matplotlib
- **Database:** SQLite

## Project Structure

```
visualizer/
├── backend/                 # Django API
│   ├── equipment_app/       # Main app (models, views, urls)
│   └── visualizer_config/   # Settings
├── frontend/
│   ├── web/src/             # React app
│   │   ├── components/      # UI components
│   │   ├── App.js           # Main component
│   │   └── App.css          # Styles
│   └── desktop/             # PyQt5 app
├── sample-data.csv          # Test data
└── README.md
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Server runs at http://localhost:8000

### Frontend

```bash
cd frontend/web
npm install
npm start
```

App opens at http://localhost:3000

## CSV Format

```csv
Equipment Name,Type,Flowrate,Pressure,Temperature
Pump-A1,Centrifugal Pump,150.5,30.2,65.3
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/datasets/upload/` | POST | Upload CSV |
| `/api/datasets/summary/` | GET | Get summaries |
| `/api/datasets/{id}/details/` | GET | Get details |
| `/api/reports/{id}/generate_pdf/` | GET | Generate PDF |

## License

MIT
