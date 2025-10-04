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


Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

2) Install dependencies
pip install -r requirements.txt

3) Run the app
python run.py

Open: http://127.0.0.1:5000

🧩 Tech Stack

Flask (backend + Jinja2 templating)

Tailwind (CDN) + small custom CSS (app/static/css/styles.css)

Static assets served from app/static/

🖼 Logo & Static Files

Put images in app/static/img/.

The landing page expects app/static/img/placeholder.svg. Replace that file or change the reference:

<img src="{{ url_for('static', filename='img/your-logo.svg') }}" alt="Turtle Trips logo" />

🎨 Global Styles

We keep styles minimal; Tailwind handles most UI.

If you use a .body class, ensure the <body> tag in templates/base.html includes it:

<body class="body min-h-screen">


and define it in app/static/css/styles.css:

.body { background-color: #f0fdf4; }

🛠 Development Notes

Templates live in app/templates/ and are rendered with render_template(...).

Static files are referenced with url_for('static', filename='...').

To add pages, create a new route in app/routes.py and a template in app/templates/.

🗺️ Roadmap (Next)

 Destination form (city, dates, interests)

 Itinerary list + drag-to-reorder

 Map view (Leaflet) & total distance

 Gemini itinerary generation (backend endpoint)

 Save/export/import trips

🧹 Troubleshooting

TemplateNotFound → Ensure home.html is under app/templates/.

Static 404 → Confirm files are under app/static/... and referenced via url_for('static', filename='...').

Nothing changes → Hard refresh (Cmd/Ctrl+Shift+R). Ensure you’re editing the correct files.

Wrong Python → python3 --version should be 3.9+; confirm your venv is activated.