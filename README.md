# StudyFlow — Flask Web App

A multi-page study tracking app with user authentication,
Pomodoro timer, session logging, and analytics charts.

## Quickstart

### 1. Install dependencies
```bash
pip install flask
```

### 2. Run the app
```bash
python app.py
```

### 3. Open in your browser
```
http://127.0.0.1:5000
```

## Project Structure
```
studyflow/
├── app.py                  ← Flask routes & logic
├── requirements.txt
├── README.md
├── templates/
│   ├── base.html           ← Shared layout + navbar
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── tracker.html
│   ├── timer.html
│   └── analytics.html
└── static/
    ├── style.css           ← All styles
    └── script.js           ← Mood buttons + Pomodoro timer
```

## Notes
- User data is stored **in-memory** (resets on restart).
  For persistence, replace `users_db` / `sessions_db` in app.py
  with SQLite using `flask-sqlalchemy`.
- Passwords are stored as plain text for simplicity.
  In production use `bcrypt`: `pip install flask-bcrypt`.
