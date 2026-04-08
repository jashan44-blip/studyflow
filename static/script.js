/* ============================================================
   StudyFlow — Main JavaScript
   static/script.js

   Contains:
   1. Flash message auto-dismiss
   2. initMoodButtons() — reusable mood selector
   3. initPomodoroTimer() — pomodoro countdown timer
============================================================ */


/* ── 1. Auto-dismiss flash messages after 4 seconds ─────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  const flashes = document.querySelectorAll(".flash");
  flashes.forEach(function (el) {
    setTimeout(function () {
      el.style.transition = "opacity .5s";
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 500);
    }, 4000);
  });
});


/* ── 2. Mood Buttons ─────────────────────────────────────────────────────── */
/*
  Call this function from a page's {% block scripts %} to activate
  the mood button group on that page.

  gridId   — id of the container div that holds the .mood-btn elements
  inputId  — id of the hidden <input> that stores the selected mood value
*/
function initMoodButtons(gridId, inputId) {
  var grid  = document.getElementById(gridId);
  var input = document.getElementById(inputId);
  if (!grid || !input) return;

  var selected = null;   // track which button is currently active

  grid.querySelectorAll(".mood-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      // If the same button is clicked again, deselect it
      if (selected === btn) {
        btn.classList.remove(btn.dataset.cls);
        selected = null;
        input.value = "Neutral";
        return;
      }

      // Deselect the previously selected button
      if (selected) {
        selected.classList.remove(selected.dataset.cls);
      }

      // Select this button
      btn.classList.add(btn.dataset.cls);
      selected = btn;
      input.value = btn.dataset.mood;   // update hidden input for form submit
    });
  });
}


/* ── 3. Pomodoro Timer ───────────────────────────────────────────────────── */
/*
  Call this function from timer.html's {% block scripts %}.
  Reads preset buttons from #presets, animates the SVG ring,
  and counts down work/break sessions.
*/
function initPomodoroTimer() {

  /* DOM references */
  var ring         = document.getElementById("ringFg");
  var display      = document.getElementById("timerDisplay");
  var modeLabel    = document.getElementById("timerMode");
  var startBtn     = document.getElementById("startBtn");
  var resetBtn     = document.getElementById("resetBtn");
  var breakLabel   = document.getElementById("breakLabel");
  var countLabel   = document.getElementById("pomodoroCount");
  var presetBtns   = document.querySelectorAll("#presets .preset-btn");
  var workLabel    = document.getElementById("presetWorkLabel");
  var brkLabel2    = document.getElementById("presetBreakLabel");

  /* SVG ring circumference: 2 * π * r = 2 * π * 88 ≈ 553 */
  var CIRCUMFERENCE = 553;

  /* State */
  var workMins   = 25;
  var breakMins  = 5;
  var totalSecs  = 0;
  var remaining  = 0;
  var interval   = null;
  var running    = false;
  var onBreak    = false;
  var completed  = 0;    // work sessions completed

  /* ── Helpers ── */

  /* Zero-pad a number: 5 → "05" */
  function pad(n) {
    return String(n).padStart(2, "0");
  }

  /* Update the SVG ring fill based on time remaining */
  function updateRing() {
    var fraction = remaining / totalSecs;           // 1.0 → 0.0
    var offset   = CIRCUMFERENCE * (1 - fraction);  // 0 → full circumference
    ring.style.strokeDashoffset = offset;

    /* Switch gradient colour during break */
    ring.style.stroke = onBreak ? "url(#breakGrad)" : "url(#workGrad)";
  }

  /* Update the clock display "MM:SS" */
  function updateDisplay() {
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    display.textContent = pad(m) + ":" + pad(s);
  }

  /* Start a new session (work=true) or a break (work=false) */
  function startSession(isWork) {
    onBreak   = !isWork;
    totalSecs = (isWork ? workMins : breakMins) * 60;
    remaining = totalSecs;
    modeLabel.textContent = isWork ? "Work Session" : "Break Time";
    updateDisplay();
    updateRing();
  }

  /* Reset to initial work state */
  function resetTimer() {
    clearInterval(interval);
    interval = null;
    running  = false;
    startBtn.textContent = "Start";
    startSession(true);
  }

  /* Called every second while the timer is running */
  function tick() {
    if (remaining <= 0) {
      /* Session finished */
      clearInterval(interval);
      interval = null;
      running  = false;
      startBtn.textContent = "Start";

      if (!onBreak) {
        /* Work session ended → increment counter, start break */
        completed++;
        countLabel.textContent = completed;
        showNotification("🎉 Work session done! Take a break.");
        startSession(false);
      } else {
        /* Break ended → start new work session */
        showNotification("☕ Break over! Time to focus.");
        startSession(true);
      }
      return;
    }
    remaining--;
    updateDisplay();
    updateRing();
  }

  /* ── Preset buttons ── */
  presetBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      /* Update active state */
      presetBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");

      /* Apply new durations */
      workMins  = parseInt(btn.dataset.work,  10);
      breakMins = parseInt(btn.dataset.break, 10);

      /* Update the tips sidebar */
      if (workLabel)  workLabel.textContent  = workMins;
      if (brkLabel2)  brkLabel2.textContent  = breakMins;
      if (breakLabel) breakLabel.textContent  = breakMins + " min";

      resetTimer();
    });
  });

  /* ── Start / Pause button ── */
  startBtn.addEventListener("click", function () {
    if (!running) {
      interval = setInterval(tick, 1000);
      running  = true;
      startBtn.textContent = "Pause";
    } else {
      clearInterval(interval);
      interval = null;
      running  = false;
      startBtn.textContent = "Resume";
    }
  });

  /* ── Reset button ── */
  resetBtn.addEventListener("click", resetTimer);

  /* ── Initialise display ── */
  resetTimer();
}


/* ── 4. Simple toast / notification ─────────────────────────────────────── */
/*
  Shows a small banner at the bottom-right of the screen.
  Used by the Pomodoro timer to signal session end.
*/
function showNotification(message) {
  /* Create toast element if it doesn't exist */
  var toast = document.getElementById("sf-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "sf-toast";
    toast.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "background:rgba(20,15,36,.95)",
      "border:1px solid rgba(139,92,246,.45)",
      "border-radius:10px",
      "padding:12px 20px",
      "font-size:14px",
      "color:#f1f0ff",
      "z-index:999",
      "pointer-events:none",
      "opacity:0",
      "transform:translateY(20px)",
      "transition:all .35s cubic-bezier(.175,.885,.32,1.275)"
    ].join(";");
    document.body.appendChild(toast);
  }

  toast.textContent = message;

  /* Show */
  requestAnimationFrame(function () {
    toast.style.opacity   = "1";
    toast.style.transform = "translateY(0)";
  });

  /* Hide after 3.5 seconds */
  setTimeout(function () {
    toast.style.opacity   = "0";
    toast.style.transform = "translateY(20px)";
  }, 3500);
}
