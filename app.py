# ============================================================
# StudyFlow - Flask Backend (FIXED VERSION)
# ============================================================

from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
import bcrypt

app = Flask(__name__)
app.secret_key = "studyflow_secret_key_change_in_production"

# ── DATABASE CONFIG ──────────────────────────────────────────
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ── MODELS ──────────────────────────────────────────────────
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True)
    password = db.Column(db.LargeBinary)


class StudySession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(100))
    duration = db.Column(db.Integer)
    mood = db.Column(db.String(50))
    user_id = db.Column(db.Integer)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


# ── LOGIN REQUIRED ───────────────────────────────────────────
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            flash("Please login first", "warning")
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# ── ROUTES ──────────────────────────────────────────────────

@app.route("/")
def index():
    if "user_id" in session:
        return redirect("/dashboard")
    return redirect("/login")


# 🔐 SIGNUP
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        new_user = User(username=username, password=hashed_pw)
        db.session.add(new_user)
        db.session.commit()

        return redirect('/login')

    return render_template('signup.html')


# 🔓 LOGIN
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()

        if user and bcrypt.checkpw(password.encode('utf-8'), user.password):
            session['user_id'] = user.id
            session['username'] = user.username
            return redirect('/dashboard')

        flash("Invalid credentials", "danger")

    return render_template('login.html')


# 🚪 LOGOUT
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


# 🏠 DASHBOARD
@app.route("/dashboard")
@login_required
def dashboard():
    user_id = session["user_id"]
    username = session.get("username", "User")

    sessions = StudySession.query.filter_by(user_id=user_id).all()

    today = datetime.utcnow().date()

    # --- TODAY ---
    today_sessions_list = [
        s for s in sessions if s.timestamp and s.timestamp.date() == today
    ]

    today_minutes = sum(s.duration for s in today_sessions_list)
    today_sessions = len(today_sessions_list)

    # --- TOTAL ---
    total_minutes = sum(s.duration for s in sessions)
    total_sessions = len(sessions)

    # --- STREAK ---
    study_days = {s.timestamp.date() for s in sessions if s.timestamp}

    streak = 0
    current_day = today

    while current_day in study_days:
        streak += 1
        current_day -= timedelta(days=1)

    # --- RECENT ---
    sorted_sessions = sorted(
        sessions,
        key=lambda x: x.timestamp if x.timestamp else datetime.utcnow(),
        reverse=True
    )

    recent = []
    for s in sorted_sessions[:5]:
        recent.append({
            "subject": s.subject,
            "duration": s.duration,
            "mood": s.mood,
            "date": s.timestamp.strftime("%d %b") if s.timestamp else "",
            "time": s.timestamp.strftime("%I:%M %p") if s.timestamp else ""
        })

    # --- STATS ---
    stats = {
        "today_minutes": today_minutes,
        "today_sessions": today_sessions,
        "total_sessions": total_sessions,
        "streak": streak
    }

    return render_template(
        "dashboard.html",
        username=username,
        stats=stats,
        recent=recent
    )


# 📚 TRACKER
@app.route("/tracker")
@login_required
def tracker():
    user_id = session["user_id"]

    sessions = StudySession.query.filter_by(user_id=user_id)\
        .order_by(StudySession.timestamp.desc()).all()

    return render_template("tracker.html",
                           username=session.get("username", "User"),
                           sessions=sessions)


# ➕ ADD SESSION
@app.route('/add', methods=['POST'])
@login_required
def add_session():
    subject = request.form['subject']
    duration = int(request.form['duration'])
    mood = request.form['mood']

    new_session = StudySession(
        subject=subject,
        duration=duration,
        mood=mood,
        user_id=session['user_id']
    )

    db.session.add(new_session)
    db.session.commit()

    return redirect('/tracker')


# ❌ DELETE
@app.route("/delete/<int:session_id>", methods=["POST"])
@login_required
def delete_session(session_id):
    session_obj = StudySession.query.get(session_id)

    if session_obj and session_obj.user_id == session['user_id']:
        db.session.delete(session_obj)
        db.session.commit()

    return redirect('/tracker')


# ⏱ TIMER
@app.route("/timer")
@login_required
def timer():
    return render_template("timer.html", username=session["username"])


# 📊 ANALYTICS
@app.route("/analytics")
@login_required
def analytics():
    user_id = session["user_id"]
    sessions = StudySession.query.filter_by(user_id=user_id).all()

    today = datetime.utcnow().date()

    weekly_labels = []
    weekly_hours = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)

        mins = sum(
            s.duration for s in sessions
            if s.timestamp and s.timestamp.date() == day
        )

        weekly_labels.append(day.strftime("%a"))
        weekly_hours.append(round(mins / 60, 2))

    subject_data = {}
    for s in sessions:
        subject_data[s.subject] = subject_data.get(s.subject, 0) + s.duration

    subj_labels = list(subject_data.keys())
    subj_data = [round(v / 60, 2) for v in subject_data.values()]

    mood_counts = {}
    for s in sessions:
        mood_counts[s.mood] = mood_counts.get(s.mood, 0) + 1

    return render_template(
        "analytics.html",
        weekly_labels=weekly_labels,
        weekly_hours=weekly_hours,
        subj_labels=subj_labels,
        subj_data=subj_data,
        mood_counts=mood_counts,
        total_sessions=len(sessions)
    )


# ── RUN ─────────────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)