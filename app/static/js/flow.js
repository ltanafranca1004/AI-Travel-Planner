// Turtle Trips: Autocomplete (Nominatim + local fallback) — "City, Country"
console.log("TT autocomplete loaded");

const input = document.getElementById("destination");
const panel = document.getElementById("ac-panel");
if (!input || !panel) console.warn("Autocomplete: input/panel missing");

let highlighted = -1;
let currentItems = [];
let aborter = null;

const ACCEPT_TYPES = new Set([
  "city", "town", "village", "hamlet", "suburb",
  "state", "province", "county", "country"
]);

// Small offline fallback (used only if web fails/empty)
const LOCAL_PLACES = [
  "Tokyo, Japan", "Kyoto, Japan", "Osaka, Japan", "Sapporo, Japan",
  "Paris, France", "Lyon, France", "Nice, France",
  "Vancouver, Canada", "Toronto, Canada", "Montreal, Canada",
  "New York, USA", "San Francisco, USA", "Los Angeles, USA",
  "London, UK", "Edinburgh, UK", "Manchester, UK",
  "Rome, Italy", "Milan, Italy", "Florence, Italy", "Venice, Italy",
  "Japan", "France", "Canada", "USA", "UK", "Italy"
];

const debounce = (fn, ms = 250) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

function labelFor(item) {
  const a = item.address || {};
  const locality =
    a.city || a.town || a.village || a.hamlet || a.suburb ||
    a.state || a.province || a.county ||
    item.name || (item.display_name ? item.display_name.split(",")[0] : "");
  const country = a.country || "";
  if (item.type === "country" || (!locality && country)) return country || locality;
  if (locality && country) return `${locality}, ${country}`;
  return locality || (item.display_name ? item.display_name.split(",")[0] : "");
}

async function searchWeb(q) {
  if (aborter) aborter.abort();
  aborter = new AbortController();
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" }, signal: aborter.signal });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const data = await res.json();
  return data.filter(x => ACCEPT_TYPES.has(x.type));
}

function searchLocal(q) {
  const qq = q.toLowerCase();
  const seen = new Set();
  const out = [];
  for (const name of LOCAL_PLACES) {
    if (name.toLowerCase().includes(qq) && !seen.has(name)) {
      seen.add(name);
      out.push({ display_name: name, type: "local", label: name });
      if (out.length >= 8) break;
    }
  }
  return out;
}

function show(items) {
  currentItems = items;
  highlighted = -1;
  panel.innerHTML = "";
  if (!items.length) return hide();

  for (const it of items) {
    const text = it.type === "local" ? it.label : labelFor(it);
    const li = document.createElement("li");
    li.className = "ac-item";
    li.textContent = text;
    li.tabIndex = 0;
    li.addEventListener("mousedown", (e) => { e.preventDefault(); select(text); });
    panel.appendChild(li);
  }
  panel.classList.remove("hidden");
}

function hide() {
  panel.classList.add("hidden");
  panel.innerHTML = "";
  currentItems = [];
  highlighted = -1;
}

function select(text) {
  input.value = text;
  hide();
  // tell the rest of the app that a value was chosen
  document.dispatchEvent(new CustomEvent("tt:selected", { detail: { text }, bubbles: true }));
}

const onType = debounce(async () => {
  const q = (input.value || "").trim();
  if (q.length < 2) return hide();
  try {
    const web = await searchWeb(q);
    const seen = new Set(); const unique = [];
    for (const r of web) {
      const lab = labelFor(r);
      if (lab && !seen.has(lab)) { seen.add(lab); unique.push(r); }
      if (unique.length >= 8) break;
    }
    if (unique.length) return show(unique);
    show(searchLocal(q));
  } catch (e) {
    show(searchLocal(q));
  }
}, 250);

// Keyboard nav + Enter handling (no form submission)
input.addEventListener("keydown", (e) => {
  const items = Array.from(panel.querySelectorAll(".ac-item"));

  if (e.key === "Enter") {
    e.preventDefault(); // never submit
    if (items.length && highlighted >= 0) {
      select(items[highlighted].textContent);
      return;
    }
    const txt = (input.value || "").trim();
    if (txt) select(txt);
    return;
  }

  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlighted = (highlighted + 1) % items.length;
    updateHighlight(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlighted = (highlighted - 1 + items.length) % items.length;
    updateHighlight(items);
  } else if (e.key === "Escape") {
    hide();
  }
});

function updateHighlight(items) {
  items.forEach((el, i) => {
    el.classList.toggle("ac-item-active", i === highlighted);
    if (i === highlighted) el.scrollIntoView({ block: "nearest" });
  });
}

input.addEventListener("input", onType);
input.addEventListener("focus", () => { if (currentItems.length) panel.classList.remove("hidden"); });
document.addEventListener("click", (e) => { if (!panel.contains(e.target) && e.target !== input) hide(); });