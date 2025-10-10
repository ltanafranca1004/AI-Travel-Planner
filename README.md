# Turtle Trips — AI Travel Planner (StormHacks 2025)

Minimal Flask app for **Turtle Trips**.  
Current scope: a clean landing page with a centered logo and the prompt **“Where would you like to go?”**.  
(We’ll add destination form, itinerary UI, and Gemini later.)

---
## 🚀 Quick Start

### 1) Create & activate a virtual environment
**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell)**
```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**2) Install dependencies**
```bash
pip install -r requirements.txt
```
**3) Enviornment Variables**

We keep our own API keys locally in a .env file (not committed to git). The app loads them with python-dotenv.

Create a file named .env in the project root:
```bash
# Gemini (Google Generative AI)
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_js_api_key
```
**4) Google Cloud: enable required Maps APIs**
```bash
Your Google API key must have these APIs enabled in Google Cloud Console → APIs & Services → Library:
	•	Maps JavaScript API
	•	Places API (New)  (a.k.a. Places API)
	•	Directions API
	•	Geocoding API (needed for address → lat/lng lookups used by the app)
    
    Steps
	1.	Create or select a GCP project and enable billing.
	2.	Enable the four APIs above.
	3.	Create an API key (or reuse one), then API restrictions → restrict to just those APIs.
	4.	Application restrictions: set to HTTP referrers and add:
	    •	http://localhost:5000/*
	    •	your deployed domain(s)
	5.	Put the key in .env as:
        GOOGLE_MAPS_API_KEY=your_google_maps_js_api_key
```
**5) Run the app**
```bash
python run.py
-- or --
flask run
```
**Open:**
```bash
http://127.0.0.1:5000
```
