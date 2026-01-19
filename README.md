# Temporal Authentication System (TAS)

## Copyright Notice
© 2024 PAdmesh. All rights reserved.

This software and associated documentation files (the "Software") are protected by copyright law and international treaties. Unauthorized reproduction or distribution of this Software, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.

## Project Structure & Components

### File Overview
```
pendulum-main/
├── app.py              # Flask backend server
├── requirements.txt    # Python dependencies
├── users.json         # User data storage
└── static/
    ├── index.html     # Frontend interface
    ├── script.js      # Keystroke timing logic
    └── style.css      # Minimal black/white styling
```

## Component Breakdown

### 1. Backend Server (`app.py`)
**Role**: Core authentication engine and API endpoints

```python
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import bcrypt

app = Flask(__name__, static_folder="static")
CORS(app)

DATA_FILE = 'users.json'

def load_data():
    """Load user data from JSON file"""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading data: {e}")
    return {}

def save_data(data):
    """Save user data to JSON file"""
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

def validate_input(data):
    """Validate input data"""
    if not data:
        return False, "No data provided"
    
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    times = data.get("times", [])
    
    if not username:
        return False, "Username is required"
    if not password:
        return False, "Password is required"
    if not isinstance(times, list):
        return False, "Invalid timing data"
    
    return True, {"username": username, "password": password, "times": times}

@app.route("/api/register", methods=["POST"])
def register_user():
    """Register a new user with keystroke timing"""
    try:
        data = request.get_json()
        print(f"Registration attempt: {data.get('username') if data else 'No data'}")
        
        # Validate input
        valid, result = validate_input(data)
        if not valid:
            return jsonify({"ok": False, "message": result}), 400
        
        username = result["username"]
        password = result["password"]
        times = result["times"]
        
        # Load existing users
        users = load_data()
        user_key = f"auth:user:{username}"
        
        # Check if user already exists
        if user_key in users:
            return jsonify({"ok": False, "message": "User already exists"}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Store user data
        users[user_key] = {
            "id": username,
            "pass": hashed_password,
            "timings": times
        }
        
        # Save to file
        if save_data(users):
            print(f"User {username} registered successfully")
            return jsonify({"ok": True, "message": "Signup successful"})
        else:
            return jsonify({"ok": False, "message": "Failed to save user data"}), 500
            
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"ok": False, "message": "Registration failed"}), 500

@app.route("/api/login", methods=["POST"])
def login_user():
    """Authenticate user login with keystroke timing"""
    try:
        data = request.get_json()
        print(f"Login attempt: {data.get('username') if data else 'No data'}")
        
        # Validate input
        valid, result = validate_input(data)
        if not valid:
            return jsonify({"ok": False, "message": result}), 400
        
        username = result["username"]
        password = result["password"]
        times = result["times"]
        
        # Load users
        users = load_data()
        user_key = f"auth:user:{username}"
        
        # Check if user exists
        if user_key not in users:
            return jsonify({"ok": False, "message": "User not found"}), 404
        
        user_data = users[user_key]
        
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user_data["pass"].encode('utf-8')):
            return jsonify({"ok": False, "message": "Invalid password"}), 401
        
        # Strict keystroke timing validation
        stored_times = user_data["timings"]
        
        if not stored_times or not times:
            return jsonify({"ok": False, "message": "No timing data"}), 401
        
        # Both arrays must have same length (same password length)
        if len(stored_times) != len(times):
            return jsonify({"ok": False, "message": "Typing rhythm does not match"}), 401
        
        # Check each keystroke timing with 0.60 threshold
        THRESHOLD = 0.60
        for i in range(len(stored_times)):
            time_diff = abs(stored_times[i] - times[i])
            if time_diff > THRESHOLD:
                print(f"Keystroke {i}: stored={stored_times[i]}, input={times[i]}, diff={time_diff}")
                return jsonify({"ok": False, "message": "Typing rhythm does not match"}), 401
        
        print(f"User {username} logged in successfully - all keystrokes matched")
        return jsonify({"ok": True, "message": "Authentication successful"})
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"ok": False, "message": "Login failed"}), 500

@app.route("/")
def serve_index():
    """Serve the main page"""
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:filename>")
def serve_static_files(filename):
    """Serve static files"""
    try:
        return send_from_directory(app.static_folder, filename)
    except Exception:
        return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    return jsonify({"ok": False, "message": "Server error"}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_ENV", "development") == "development"
    print(f"Starting server on port {port}, debug={debug_mode}")
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
```

**What it does:**
- Handles user registration with keystroke timing storage
- Validates login with 0.60 second timing threshold per keystroke
- Uses bcrypt for secure password hashing
- Stores user data in JSON format
- Provides REST API endpoints for frontend

### 2. Dependencies (`requirements.txt`)
**Role**: Python package dependencies

```
flask==2.3.3
flask-cors==4.0.0
bcrypt==4.0.1
python-dotenv==1.0.0
gunicorn==21.2.0
```

**What each does:**
- `flask`: Web framework for backend server
- `flask-cors`: Cross-origin resource sharing support
- `bcrypt`: Secure password hashing
- `python-dotenv`: Environment variable management
- `gunicorn`: Production WSGI server

### 3. User Storage (`users.json`)
**Role**: Database for user credentials and timing patterns

```json
{
  "auth:user:testuser": {
    "id": "testuser",
    "pass": "$2b$12$hashed_password_here",
    "timings": [0, 0.148, 0.285, 0.404, 0.542, 0.668, 0.799, 0.91]
  }
}
```

**What it stores:**
- User ID and hashed password
- Keystroke timing array (milliseconds per character)
- Unique key format: `auth:user:{username}`

### 4. Frontend Interface (`static/index.html`)
**Role**: User interface for login/registration

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Temporal Authentication System</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="terminal">
    <div class="terminal-header">
      <div class="terminal-controls">
        <span class="control"></span>
        <span class="control"></span>
        <span class="control"></span>
      </div>
      <div class="terminal-title">Temporal Authentication System</div>
    </div>
    
    <div class="terminal-body">
      <h1 class="title">
        <span>TAS</span>
        <div class="subtitle">Neural Pattern Recognition System</div>
      </h1>

      <div class="mode-selector">
        <div class="mode-toggle">
          <input type="radio" name="mode" value="login" id="login" checked />
          <label for="login" class="mode-btn">
            <span>ACCESS</span>
          </label>
          
          <input type="radio" name="mode" value="register" id="register" />
          <label for="register" class="mode-btn">
            <span>REGISTER</span>
          </label>
        </div>
      </div>

      <form id="authForm" class="auth-form">
        <div class="input-group">
          <div class="input-wrapper">
            <input id="username" type="text" placeholder="" required />
            <label class="floating-label">USER_ID</label>
          </div>
        </div>
        
        <div class="input-group">
          <div class="input-wrapper password-container">
            <input id="password" type="password" placeholder="" required autocomplete="new-password" />
            <label class="floating-label">NEURAL_KEY</label>
            <div class="timer-display">
              <span class="timer-label">TEMPORAL_SYNC</span>
              <span id="timer" class="timer">0.000s</span>
            </div>
          </div>
        </div>
        
        <div class="input-group" id="confirmGroup" style="display: none;">
          <div class="input-wrapper password-container">
            <input id="confirmPassword" type="password" placeholder="" required />
            <label class="floating-label">CONFIRM_KEY</label>
            <div class="timer-display">
              <span class="timer-label">TEMPORAL_SYNC</span>
              <span id="confirmTimer" class="timer">0.000s</span>
            </div>
          </div>
        </div>
        
        <div class="retry-container">
          <button id="retryBtn" type="button" class="retry-btn" title="Reset Timing">
            RETRY
          </button>
        </div>
        
        <button id="submitBtn" type="submit" class="cyber-btn">
          <span class="btn-text">EXECUTE</span>
        </button>
      </form>
      
      <div id="passwordDisplay" class="password-display" style="display: none;">
        <div class="display-title">PASSWORD ANALYSIS</div>
        <div class="password-text" id="displayedPassword"></div>
        <div class="timing-graph" id="timingGraph"></div>
      </div>

      <div class="status-panel">
        <p id="hint" class="hint">Biometric keystroke analysis active (15s limit)</p>
        <p id="result" class="result"></p>
      </div>
    </div>
  </main>

  <div id="homePage" class="home-page" style="display: none;">
    <div class="terminal-header">
      <div class="terminal-controls">
        <span class="control"></span>
        <span class="control"></span>
        <span class="control"></span>
      </div>
      <div class="terminal-title">Temporal Authentication System - Dashboard</div>
      <button id="logoutBtn" class="logout-btn" title="Logout">LOGOUT</button>
    </div>
    
    <div class="terminal-body">
      <div class="access-granted">
        <h1>ACCESS GRANTED</h1>
      </div>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>
```

**What it provides:**
- Login/Register mode toggle
- Username and password input fields
- Real-time timing display
- Password analysis visualization
- Success page with "ACCESS GRANTED"

### 5. Keystroke Logic (`static/script.js`)
**Role**: Captures and processes keystroke timing

```javascript
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("authForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const confirmGroup = document.getElementById("confirmGroup");
    const submitButton = document.getElementById("submitBtn");
    const retryButton = document.getElementById("retryBtn");
    const resultEl = document.getElementById("result");
    const timerEl = document.getElementById("timer");
    const confirmTimerEl = document.getElementById("confirmTimer");
    const modeInputs = document.querySelectorAll("input[name='mode']");
    const passwordDisplay = document.getElementById("passwordDisplay");
    const displayedPassword = document.getElementById("displayedPassword");
    const timingGraph = document.getElementById("timingGraph");
    const homePage = document.getElementById("homePage");
    const logoutBtn = document.getElementById("logoutBtn");
    const terminal = document.querySelector(".terminal");

    let startTime = null;
    let confirmStartTime = null;
    let times = [];
    let confirmTimes = [];
    let pressedKeys = new Set();
    let confirmPressedKeys = new Set();
    let timerInterval = null;
    let confirmTimerInterval = null;
    const MAX_TIME = 15000;

    function navigateTo(path) {
        history.pushState(null, null, path);
        handleRoute();
    }
    
    function handleRoute() {
        const path = window.location.pathname;
        
        if (path === '/register') {
            document.querySelector("input[value='register']").checked = true;
            updateForm();
        } else if (path === '/home' || path === '/dashboard') {
            if (sessionStorage.getItem('loggedIn')) {
                const username = sessionStorage.getItem('username');
                const password = sessionStorage.getItem('password');
                showHomePage(username, password);
            } else {
                navigateTo('/login');
            }
        } else {
            document.querySelector("input[value='login']").checked = true;
            updateForm();
        }
    }
    
    window.addEventListener('popstate', handleRoute);
    handleRoute();
    
    function showHomePage(username, password) {
        terminal.style.display = 'none';
        homePage.style.display = 'block';
        
        sessionStorage.setItem('loggedIn', 'true');
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('password', password);
    }
    
    logoutBtn.addEventListener('click', () => {
        homePage.style.display = 'none';
        terminal.style.display = 'block';
        resetSystem();
        resultEl.textContent = '';
        resultEl.className = 'result';
        sessionStorage.clear();
        navigateTo('/login');
    });

    retryButton.addEventListener("click", () => {
        resetSystem();
        resultEl.textContent = "SYSTEM RESET - READY FOR NEW ATTEMPT";
        resultEl.className = "result";
        passwordDisplay.style.display = "none";
    });

    function showLoadingAnimation() {
        const btnText = submitButton.querySelector('.btn-text');
        btnText.textContent = 'PROCESSING...';
    }

    function hideLoadingAnimation() {
        const btnText = submitButton.querySelector('.btn-text');
        btnText.textContent = 'EXECUTE';
    }

    function stopTimers() {
        clearInterval(timerInterval);
        clearInterval(confirmTimerInterval);
    }

    function resetSystem() {
        stopTimers();
        startTime = null;
        confirmStartTime = null;
        times = [];
        confirmTimes = [];
        passwordInput.value = "";
        confirmPasswordInput.value = "";
        updateTimer();
        updateConfirmTimer();
        pressedKeys.clear();
        confirmPressedKeys.clear();
    }

    function createTimingGraph(avgTimes) {
        timingGraph.innerHTML = "";
        if (avgTimes.length === 0) return;
        
        const maxTime = Math.max(...avgTimes);
        
        avgTimes.forEach((time, index) => {
            const container = document.createElement("div");
            container.className = "timing-bar-container";
            
            const bar = document.createElement("div");
            bar.className = "timing-bar";
            const height = (time / maxTime) * 160 + 20;
            bar.style.height = `${height}px`;
            bar.title = `Keystroke ${index + 1}: ${time}s`;
            
            const label = document.createElement("div");
            label.className = "timing-label";
            label.textContent = `${time}s`;
            
            container.appendChild(bar);
            container.appendChild(label);
            timingGraph.appendChild(container);
        });
    }

    function updateTimer() {
        if (startTime === null) {
            timerEl.textContent = "0.000s";
            return;
        }
        const elapsed = performance.now() - startTime;
        if (elapsed >= MAX_TIME) {
            stopTimers();
            timerEl.textContent = "15.000s";
            resultEl.textContent = "TIME LIMIT REACHED - USE RETRY";
            resultEl.className = "result error";
            return;
        }
        timerEl.textContent = `${(elapsed / 1000).toFixed(3)}s`;
    }

    function updateConfirmTimer() {
        if (confirmStartTime === null) {
            confirmTimerEl.textContent = "0.000s";
            return;
        }
        const elapsed = performance.now() - confirmStartTime;
        if (elapsed >= MAX_TIME) {
            stopTimers();
            confirmTimerEl.textContent = "15.000s";
            resultEl.textContent = "TIME LIMIT REACHED - USE RETRY";
            resultEl.className = "result error";
            return;
        }
        confirmTimerEl.textContent = `${(elapsed / 1000).toFixed(3)}s`;
    }

    function updateForm() {
        const mode = document.querySelector("input[name='mode']:checked").value;
        const btnText = submitButton.querySelector('.btn-text');
        
        if (mode === "register") {
            confirmGroup.style.display = "block";
            btnText.textContent = "REGISTER";
        } else {
            confirmGroup.style.display = "none";
            btnText.textContent = "LOGIN";
        }
        
        resetSystem();
        passwordDisplay.style.display = "none";
        resultEl.textContent = "";
        resultEl.className = "result";
    }

    modeInputs.forEach(input => input.addEventListener("change", () => {
        if (input.value === 'login') {
            navigateTo('/login');
        } else {
            navigateTo('/register');
        }
        updateForm();
    }));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && (passwordInput === document.activeElement || confirmPasswordInput === document.activeElement)) {
            event.preventDefault();
            stopTimers();
            form.dispatchEvent(new Event('submit'));
        }
    });

    passwordInput.addEventListener("keydown", (event) => {
        if (event.key.length > 1) return;
        if (pressedKeys.has(event.key)) return;
        pressedKeys.add(event.key);

        if (startTime === null) {
            startTime = performance.now();
            timerInterval = setInterval(updateTimer, 50);
        }

        const elapsed = performance.now() - startTime;
        if (elapsed < MAX_TIME) {
            times.push(Number((elapsed / 1000).toFixed(3)));
            updateTimer();
        }
    });

    passwordInput.addEventListener("keyup", (event) => {
        pressedKeys.delete(event.key);
    });

    confirmPasswordInput.addEventListener("keydown", (event) => {
        if (event.key.length > 1) return;
        if (confirmPressedKeys.has(event.key)) return;
        confirmPressedKeys.add(event.key);

        if (confirmStartTime === null) {
            confirmStartTime = performance.now();
            confirmTimerInterval = setInterval(updateConfirmTimer, 50);
        }

        const elapsed = performance.now() - confirmStartTime;
        if (elapsed < MAX_TIME) {
            confirmTimes.push(Number((elapsed / 1000).toFixed(3)));
            updateConfirmTimer();
        }
    });

    confirmPasswordInput.addEventListener("keyup", (event) => {
        confirmPressedKeys.delete(event.key);
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        
        const mode = document.querySelector("input[name='mode']:checked").value;
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        stopTimers();

        if (!username || !password) {
            resultEl.textContent = "USERNAME AND PASSWORD REQUIRED";
            resultEl.className = "result error";
            return;
        }

        if (mode === "register") {
            if (password !== confirmPassword) {
                resultEl.textContent = "PASSWORDS DO NOT MATCH";
                resultEl.className = "result error";
                return;
            }
        }

        let finalTimes = times;
        
        if (mode === "register" && confirmTimes.length > 0) {
            if (times.length !== confirmTimes.length) {
                resultEl.textContent = "TIMING MISMATCH - RETYPE PASSWORDS";
                resultEl.className = "result error";
                return;
            }
            finalTimes = [];
            for (let i = 0; i < times.length; i++) {
                finalTimes.push(Number(((times[i] + confirmTimes[i]) / 2).toFixed(3)));
            }
        }
        
        if (finalTimes.length !== password.length) {
            resultEl.textContent = "INVALID TIMING DATA - RETRY";
            resultEl.className = "result error";
            return;
        }

        if (password && finalTimes.length > 0) {
            displayedPassword.textContent = password;
            createTimingGraph(finalTimes);
            passwordDisplay.style.display = "block";
        }

        showLoadingAnimation();
        resultEl.textContent = "";
        resultEl.className = "result";

        const endpoint = `/api/${mode}`;
        const requestData = {
            username: username,
            password: password,
            times: finalTimes
        };

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(requestData)
            });
            
            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error('Invalid server response');
            }
            
            hideLoadingAnimation();
            
            if (result.ok) {
                if (result.message === "Signup successful") {
                    resultEl.textContent = "REGISTRATION SUCCESSFUL";
                    resultEl.className = "result success";
                    setTimeout(() => {
                        document.querySelector("input[value='login']").checked = true;
                        updateForm();
                        resultEl.textContent = "NOW YOU CAN LOGIN";
                    }, 2000);
                } else if (result.message === "Authentication successful") {
                    resultEl.textContent = "LOGIN SUCCESSFUL - REDIRECTING...";
                    resultEl.className = "result success";
                    setTimeout(() => {
                        navigateTo('/home');
                        showHomePage(username, password);
                    }, 1500);
                } else {
                    resultEl.textContent = result.message.toUpperCase();
                    resultEl.className = "result success";
                }
            } else {
                let errorMessage = result.message || 'Unknown error';
                if (errorMessage.includes('User not found')) {
                    resultEl.textContent = "USER NOT FOUND - PLEASE REGISTER FIRST";
                } else if (errorMessage.includes('Invalid password')) {
                    resultEl.textContent = "INCORRECT PASSWORD";
                } else if (errorMessage.includes('User already exists')) {
                    resultEl.textContent = "USERNAME ALREADY TAKEN";
                } else if (errorMessage.includes('Typing rhythm')) {
                    resultEl.textContent = "TYPING PATTERN MISMATCH - TRY AGAIN";
                } else {
                    resultEl.textContent = errorMessage.toUpperCase();
                }
                resultEl.className = "result error";
            }
            
        } catch (err) {
            hideLoadingAnimation();
            
            if (err.message.includes('Failed to fetch')) {
                resultEl.textContent = "CONNECTION ERROR - CHECK SERVER";
            } else {
                resultEl.textContent = `ERROR: ${err.message.toUpperCase()}`;
            }
            
            resultEl.className = "result error";
        }

        setTimeout(() => {
            resetSystem();
        }, 1000);
    });

    submitButton.addEventListener("click", (event) => {
        event.preventDefault();
        form.dispatchEvent(new Event('submit'));
    });
});
```

**What it does:**
- Captures millisecond-precise keystroke timing for each character
- Manages login/register form switching and validation
- Sends timing data to backend for authentication
- Displays real-time timing feedback and password analysis
- Handles navigation between login and success pages

### 6. Styling (`static/style.css`)
**Role**: Minimal black and white terminal aesthetic

```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Orbitron', monospace;
  background: #000;
  color: #fff;
  min-height: 100vh;
}

.terminal {
  max-width: 800px;
  margin: 30px auto;
  background: #111;
  border: 2px solid #333;
  border-radius: 8px;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #222;
  border-bottom: 1px solid #333;
  border-radius: 6px 6px 0 0;
}

.terminal-controls {
  display: flex;
  gap: 8px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #666;
}

.terminal-title {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.terminal-body {
  padding: 40px;
}

.title {
  text-align: center;
  margin-bottom: 30px;
}

.title span {
  font-size: 36px;
  font-weight: 900;
  color: #fff;
}

.subtitle {
  font-size: 14px;
  color: #999;
  margin-top: 8px;
  font-weight: 400;
}

.mode-selector {
  margin-bottom: 25px;
}

.mode-toggle {
  display: flex;
  background: #222;
  border-radius: 8px;
  padding: 4px;
  border: 1px solid #333;
}

.mode-toggle input {
  display: none;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 700;
  color: #999;
}

.mode-btn:hover {
  background: #333;
  color: #fff;
}

input:checked + .mode-btn {
  background: #fff;
  color: #000;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 25px;
}

.input-group {
  position: relative;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  padding: 18px 15px 10px;
  background: #222;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-family: 'Orbitron', monospace;
  font-size: 16px;
  transition: all 0.3s ease;
}

.input-wrapper input:focus {
  outline: none;
  border-color: #fff;
}

.floating-label {
  position: absolute;
  top: 15px;
  left: 12px;
  color: #999;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.3s ease;
  pointer-events: none;
}

.input-wrapper input:focus + .floating-label,
.input-wrapper input:not(:placeholder-shown) + .floating-label {
  top: 4px;
  font-size: 10px;
  color: #fff;
}

.timer-display {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.timer-label {
  font-size: 8px;
  color: #999;
  font-weight: 700;
}

.timer {
  font-size: 12px;
  color: #fff;
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.retry-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
}

.retry-btn {
  padding: 10px 20px;
  background: #333;
  border: 1px solid #666;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Orbitron', monospace;
}

.retry-btn:hover {
  background: #666;
}

.cyber-btn {
  padding: 18px 40px;
  background: #fff;
  border: none;
  border-radius: 8px;
  color: #000;
  font-family: 'Orbitron', monospace;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cyber-btn:hover {
  background: #ddd;
}

.password-display {
  margin-top: 25px;
  padding: 20px;
  background: #222;
  border: 1px solid #333;
  border-radius: 8px;
  text-align: center;
}

.display-title {
  font-size: 12px;
  color: #fff;
  font-weight: 700;
  margin-bottom: 15px;
}

.password-text {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  color: #fff;
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.timing-graph {
  display: flex;
  justify-content: center;
  align-items: end;
  gap: 8px;
  height: 200px;
  margin-top: 20px;
  padding: 0 20px;
}

.timing-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.timing-bar {
  background: #fff;
  width: 16px;
  border-radius: 4px;
  transition: all 0.3s ease;
  min-height: 20px;
}

.timing-label {
  font-size: 10px;
  color: #fff;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  text-align: center;
  min-width: 40px;
}

.status-panel {
  text-align: center;
}

.hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
}

.result {
  font-size: 14px;
  font-weight: 700;
  min-height: 20px;
  transition: all 0.3s ease;
}

.result.success {
  color: #fff;
}

.result.error {
  color: #fff;
}

.home-page {
  max-width: 800px;
  margin: 30px auto;
  background: #111;
  border: 2px solid #333;
  border-radius: 8px;
}

.logout-btn {
  background: #333;
  border: 1px solid #666;
  color: #fff;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.3s ease;
  font-family: 'Orbitron', monospace;
}

.logout-btn:hover {
  background: #666;
}

.access-granted {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.access-granted h1 {
  font-size: 72px;
  font-weight: 900;
  color: #fff;
  text-align: center;
  font-family: 'Orbitron', monospace;
}

@media (max-width: 850px) {
  .terminal, .home-page {
    margin: 20px;
    max-width: none;
  }
  
  .terminal-body {
    padding: 25px;
  }
  
  .title span {
    font-size: 28px;
  }
  
  .timing-graph {
    height: 150px;
    gap: 6px;
    padding: 0 10px;
  }
  
  .timing-bar {
    width: 12px;
  }
  
  .timing-label {
    font-size: 8px;
    min-width: 30px;
  }
  
  .access-granted h1 {
    font-size: 48px;
  }
}
```

**What it provides:**
- Black background (#000) with white text (#fff)
- Terminal-style interface with gray borders
- Clean, professional appearance without animations
- Responsive design for mobile devices
- Orbitron monospace font for technical aesthetic

## How Components Work Together

1. **User Registration Flow:**
   - HTML form captures username/password
   - JavaScript records keystroke timing
   - Data sent to Flask `/api/register` endpoint
   - Backend hashes password and stores timing pattern
   - User data saved to `users.json`

2. **User Login Flow:**
   - HTML form captures credentials
   - JavaScript records live keystroke timing
   - Data sent to Flask `/api/login` endpoint
   - Backend validates password and timing (0.60s threshold)
   - Success redirects to "ACCESS GRANTED" page

3. **Security Validation:**
   - Each keystroke must match stored timing within 0.60 seconds
   - Password must be correct (bcrypt verification)
   - Both conditions required for access

This system provides military-grade biometric authentication using behavioral patterns unique to each individual.