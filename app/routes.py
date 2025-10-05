from flask import Blueprint, render_template, request
import json
import google.generativeai as genai
genai.configure(api_key="***REMOVED***")
model = genai.GenerativeModel('gemini-2.5-pro')
bp = Blueprint("main", __name__)

@bp.get("/")
def home():
    return render_template("home.html", title="turtle trips.")

@bp.route("/review", methods=["GET", "POST"])
def review():
    data = request.form if request.method == "POST" else request.args
    return render_template("review.html", data=data, title="turtle trips — questions")

@bp.post("/generate")
def generate():
  # Use request.get_json() to get the JSON payload from the request body
    raw = request.form.get("payload", "{}")
    try:
        payload = json.loads(raw)
    except Exception:
        payload = {"There was an error Gemeni, please just return ERROR"}

    # Create the prompt with the JSON payload.
    # The json.dumps() with indent=2 formats the JSON nicely for the prompt.
    #prompt = f"Using the following trip data, generate 3 different detailed day by day travel plans for the user, (note: $ = shoestring, $$ = budget, $$$ = comfortable, $$$$ = slurge, $$$$$ = luxury): ```json\n{json.dumps(payload, indent=2)}\n```"
    prompt = f"Using the following trip data, generate 2 different day by day travel plans and put the location plans in json. Output only the json.(note : $ = shoestring, $$ = budget, $$$ = comfortable, $$$$ = slurge, $$$$$ = luxury): ```json\n{json.dumps(payload, indent=2)}\n```"
    print(prompt)
    try:
        # Send the prompt to the Gemini API
        
        response = model.generate_content(prompt)
        generated_content = response.text
    except Exception as e:
        # Handle API or other errors gracefully
        return f"An error occurred with the Gemini API: {e}", 500
    
    return render_template("generate.html", payload=generated_content, title="turtle trips — plan")
