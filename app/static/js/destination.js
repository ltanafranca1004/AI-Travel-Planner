// Turtle Trips: Country → City (city-only) → Days
// Countries: RestCountries (no key)
// Cities: Overpass (OSM) per country (place=city|town), cached in localStorage

console.log("TT destination flow loaded (country → city-only, robust Overpass)");

/* ---------- DOM ---------- */
const stepCountry = document.getElementById("step-country");
const stepCity     = document.getElementById("step-city");
const stepDates = document.getElementById("step-dates");

const countryInput = document.getElementById("country");
const cityInput    = document.getElementById("city");
const daysInput    = document.getElementById("days");

const countryPanel = document.getElementById("country-panel");
const cityPanel    = document.getElementById("city-panel");

/* ---------- Utils ---------- */
const debounce = (fn, ms = 250) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }
function clearPanel(panel){ panel.innerHTML = ""; panel.classList.add("hidden"); }
function openPanel(panel){ if (panel.children.length) panel.classList.remove("hidden"); }
function makeItem(text, onPick) {
  const li = document.createElement("li");
  li.className = "ac-item";
  li.textContent = text;
  li.tabIndex = 0;
  li.addEventListener("mousedown", e => { e.preventDefault(); onPick(text); });
  return li;
}
function updateHL(items, idx){
  items.forEach((el,i)=>{
    el.classList.toggle("ac-item-active", i===idx);
    if (i===idx) el.scrollIntoView({ block: "nearest" });
  });
}

/* ---------- Countries (RestCountries) ---------- */
let countries = [];            // [{name, code, capitals: []}]
let selectedCountry = null;    // {name, code, capitals: []}

fetch("https://restcountries.com/v3.1/all?fields=name,cca2,capital")
  .then(r => r.json())
  .then(data => {
    countries = data
      .map(c => ({
        name: c?.name?.common || "",
        code: c?.cca2 || "",
        capitals: Array.isArray(c?.capital) ? c.capital.filter(Boolean) : []
      }))
      .filter(c => c.name && c.code)
      .sort((a,b) => a.name.localeCompare(b.name));
  })
  .catch(err => console.warn("countries fetch failed", err));

function filterCountries(q){
  const qq = q.toLowerCase();
  return countries.filter(c => c.name.toLowerCase().includes(qq)).slice(0, 20);
}

function renderCountrySuggestions(list){
  clearPanel(countryPanel);
  list.forEach(c => {
    countryPanel.appendChild(makeItem(c.name, () => selectCountry(c)));
  });
  openPanel(countryPanel);
}

function selectCountry(c){
  selectedCountry = c;
  localStorage.setItem("tt.country_name", c.name);
  localStorage.setItem("tt.country_code", c.code);

  countryInput.value = c.name;
  clearPanel(countryPanel);

  // Prepare city step
  cityInput.placeholder = `City in ${c.name}…`;
  cityInput.value = "";
  show(stepCity);
  setTimeout(() => cityInput.focus(), 0);

  // Load all cities for this country (from cache or Overpass)
  loadCitiesForCountry(c).then(() => {
    renderCityList("");
  });
}

// keyboard nav for country
let countryHL = -1;
countryInput.addEventListener("keydown", (e) => {
  const items = Array.from(countryPanel.querySelectorAll(".ac-item"));
  if (e.key === "Enter") {
    e.preventDefault();
    if (items.length && countryHL >= 0) {
      items[countryHL].dispatchEvent(new MouseEvent("mousedown"));
      return;
    }
    const match = countries.find(c => c.name.toLowerCase() === countryInput.value.trim().toLowerCase());
    if (match) selectCountry(match);
    return;
  }
  if (!items.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); countryHL = (countryHL + 1) % items.length; updateHL(items, countryHL); }
  else if (e.key === "ArrowUp") { e.preventDefault(); countryHL = (countryHL - 1 + items.length) % items.length; updateHL(items, countryHL); }
  else if (e.key === "Escape") { clearPanel(countryPanel); }
});
countryInput.addEventListener("input", debounce(() => {
  countryHL = -1;
  const q = countryInput.value.trim();
  if (!q) { clearPanel(countryPanel); return; }
  renderCountrySuggestions(filterCountries(q));
}, 200));
countryInput.addEventListener("focus", () => { if (countryPanel.children.length) countryPanel.classList.remove("hidden"); });
document.addEventListener("click", (e) => { if (!countryPanel.contains(e.target) && e.target !== countryInput) clearPanel(countryPanel); });

/* ---------- Cities (Overpass per country) ---------- */
const CITY_TYPES = new Set(["city","town"]); // keep it manageable
let cityList = []; // [{name, place}] for selected country

function renderCityList(filterText){
  clearPanel(cityPanel);
  const q = (filterText || "").trim().toLowerCase();

  const results = cityList
    .filter(x => !q || x.name.toLowerCase().includes(q))
    .slice(0, 80); // show up to 80 for easier browsing

  results.forEach(x => {
    cityPanel.appendChild(makeItem(x.name, selectCity));
  });
  openPanel(cityPanel);
  if (!cityPanel.children.length) clearPanel(cityPanel);
}

function selectCity(name){
  cityInput.value = name; // CITY ONLY
  localStorage.setItem("tt.city", name);
  localStorage.setItem("tt.destination", name); // display city only
  clearPanel(cityPanel);
  show(stepDates);
  setTimeout(() => document.getElementById("drp-start").focus(), 0);  
}

/* ------- Overpass helpers: robust GET + mirror fallback ------- */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter"
];

async function overpassGET(ql) {
  let lastErr;
  for (const base of OVERPASS_ENDPOINTS) {
    const url = `${base}?data=${encodeURIComponent(ql)}`;
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) { lastErr = new Error(`${base} HTTP ${res.status}`); continue; }
      const data = await res.json();
      return data;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All Overpass mirrors failed");
}

/* Build a list from Overpass response */
function extractCities(elements) {
  const seen = new Set();
  const list = [];
  for (const el of (elements || [])) {
    const t = el.tags || {};
    const place = t.place || "";
    if (!CITY_TYPES.has(place)) continue;

    const name = t["name:en"] || t.name || "";
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    list.push({ name, place });
  }
  // Sort: cities first then towns; alpha inside groups
  const weight = { city: 0, town: 1 };
  list.sort((a,b) => (weight[a.place] - weight[b.place]) || a.name.localeCompare(b.name));
  return list;
}

/* Try multiple country area strategies for better coverage */
async function fetchCitiesByCountry(country) {
  const code = country.code;          // ISO alpha-2 (e.g., JP)
  const name = country.name;          // English common name (e.g., Japan)

  // Q1: by ISO3166-1 alpha2 (no admin_level filter)
  const q1 = `
[out:json][timeout:40];
area["ISO3166-1"="${code}"]->.country;
( node["place"~"^(city|town)$"](area.country); );
out tags qt;
`.trim();

  // Q2: by admin boundary name in English
  const q2 = `
[out:json][timeout:40];
area["boundary"="administrative"]["admin_level"="2"]["name:en"="${name}"]->.country;
( node["place"~"^(city|town)$"](area.country); );
out tags qt;
`.trim();

  // Q3: by boundary name (fallback without :en)
  const q3 = `
[out:json][timeout:40];
area["boundary"="administrative"]["admin_level"="2"]["name"="${name}"]->.country;
( node["place"~"^(city|town)$"](area.country); );
out tags qt;
`.trim();

  // Try in order
  for (const ql of [q1, q2, q3]) {
    try {
      const data = await overpassGET(ql);
      const list = extractCities(data.elements);
      if (list.length) return list;
    } catch (e) {
      console.warn("Overpass attempt failed:", e?.message || e);
    }
  }
  return [];
}

async function loadCitiesForCountry(c){
  const cacheKey = `tt.cities.${c.code}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      cityList = JSON.parse(cached);
      if (Array.isArray(cityList) && cityList.length) return;
    } catch {}
  }

  try {
    const list = await fetchCitiesByCountry(c);
    if (list.length) {
      cityList = list;
      localStorage.setItem(cacheKey, JSON.stringify(cityList));
      return;
    }
    // If empty, fall back to capitals only
    console.warn("No cities from Overpass; using capital(s) fallback");
    const caps = (c.capitals || []).map(cap => ({ name: cap, place: "city" }));
    cityList = caps;
  } catch (e) {
    console.warn("Overpass fetch failed completely", e);
    const caps = (c.capitals || []).map(cap => ({ name: cap, place: "city" }));
    cityList = caps;
  }
}

/* City input wiring */
let cityHL = -1;
cityInput.addEventListener("keydown", (e) => {
  const items = Array.from(cityPanel.querySelectorAll(".ac-item"));
  if (e.key === "Enter") {
    e.preventDefault();
    if (items.length && cityHL >= 0) { items[cityHL].dispatchEvent(new MouseEvent("mousedown")); return; }
    const txt = cityInput.value.trim();
    if (txt) selectCity(txt);
    return;
  }
  if (!items.length) return;
  if (e.key === "ArrowDown") { e.preventDefault(); cityHL = (cityHL + 1) % items.length; updateHL(items, cityHL); }
  else if (e.key === "ArrowUp") { e.preventDefault(); cityHL = (cityHL - 1 + items.length) % items.length; updateHL(items, cityHL); }
  else if (e.key === "Escape") { clearPanel(cityPanel); }
});

cityInput.addEventListener("input", debounce(() => {
  cityHL = -1;
  renderCityList(cityInput.value);
}, 160));

cityInput.addEventListener("focus", () => {
  if (!selectedCountry) return;
  if (!cityList.length) {
    loadCitiesForCountry(selectedCountry).then(() => renderCityList(cityInput.value));
    return;
  }
  renderCityList(cityInput.value);
});

document.addEventListener("click", (e) => {
  if (!cityPanel.contains(e.target) && e.target !== cityInput) clearPanel(cityPanel);
});

/* ---------- Days ---------- */
daysInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const n = parseInt(daysInput.value, 10);
    if (Number.isFinite(n) && n > 0) {
      localStorage.setItem("tt.days", String(n));
      daysInput.blur();
      console.log("Saved:", {
        country: localStorage.getItem("tt.country_name"),
        city: localStorage.getItem("tt.city"),
        days: localStorage.getItem("tt.days"),
      });
    }
  }
});

// when dates are confirmed, hide the calendar (we'll show the next step later)
// done button from the calendar fires this:
document.addEventListener("tt:dates-confirmed", (e) => {
    const { start, end, days } = e.detail || {};
  
    if (start) localStorage.setItem("tt.start_date", start);
    if (end)   localStorage.setItem("tt.end_date", end);
    if (Number.isFinite(days)) localStorage.setItem("tt.days", String(days));
  
    // close the calendar
    hide(stepDates);
  
    // (optional) show your next step here
    // show(document.getElementById("step-q"));
    // document.getElementById("pace")?.focus();
  });
  

