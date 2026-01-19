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