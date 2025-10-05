// Turtle Trips: inline date-range picker (Wanderlog-style)
(() => {
    const grid = document.getElementById("drp-grid");
    const monthLabel = document.getElementById("drp-monthLabel");
    const prevBtn = document.getElementById("drp-prev");
    const nextBtn = document.getElementById("drp-next");
    const startEl = document.getElementById("drp-start");
    const endEl = document.getElementById("drp-end");
    const clearBtn = document.getElementById("drp-clear");
  
    if (!grid) return; // not on this page
  
    // --- helpers ---
    const pad = (n) => String(n).padStart(2, "0");
    const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m = 0..11
    const toDateParts = (s) => {
      const [Y, M, D] = (s || "").split("-").map(Number);
      if (!Y || !M || !D) return null;
      return { y: Y, m: M - 1, d: D };
    };
    const toDate = (s) => {
      const p = toDateParts(s);
      return p ? new Date(p.y, p.m, p.d) : null;
    };
    const fmtHuman = (s) =>
      s ? new Date(s + "T00:00:00").toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "";
  
    const diffDaysInclusive = (aISO, bISO) => {
      if (!aISO || !bISO) return 0;
      const a = toDate(aISO), b = toDate(bISO);
      const ms = (b - a);
      return Math.round(ms / 86400000) + 1;
    };
  
    // --- state ---
    let view = new Date(); view.setDate(1);
    let start = localStorage.getItem("tt.start_date") || null;
    let end   = localStorage.getItem("tt.end_date") || null;
  
    // --- core ---
    function inRange(dayISO) {
      if (!start || !end) return false;
      return (dayISO >= start && dayISO <= end);
    }
    function isSame(aISO, bISO) { return aISO && bISO && aISO === bISO; }
  
    function render() {
      const y = view.getFullYear();
      const m = view.getMonth();
      monthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(view);
  
      const firstDow = new Date(y, m, 1).getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
  
      grid.innerHTML = "";
  
      // leading blanks
      for (let i = 0; i < firstDow; i++) {
        const blank = document.createElement("div");
        blank.className = "h-9";
        grid.appendChild(blank);
      }
  
      // days
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("button");
        const dayISO = iso(y, m, d);
        cell.type = "button";
        cell.dataset.date = dayISO;
  
        // base style
        cell.className = "h-9 rounded-lg text-sm hover:bg-emerald-50 cursor-pointer select-none";
  
        // styles for range
        if (isSame(dayISO, start) || isSame(dayISO, end)) {
          cell.className += " bg-emerald-600 text-white font-semibold";
        } else if (inRange(dayISO)) {
          cell.className += " bg-emerald-100";
        }
  
        // today ring
        const today = new Date();
        if (y === today.getFullYear() && m === today.getMonth() && d === today.getDate()) {
          cell.className += " ring-1 ring-emerald-400";
        }
  
        cell.textContent = String(d);
        cell.addEventListener("click", () => onPick(dayISO));
        grid.appendChild(cell);
      }
  
      // update inputs
      startEl.value = fmtHuman(start) || "";
      endEl.value   = fmtHuman(end)   || "";
  
      // store days count when complete
      if (start && end) {
        const days = diffDaysInclusive(start, end);
        localStorage.setItem("tt.days", String(days));
      }
    }
  
    function onPick(dayISO) {
      // no start yet, or already have a range → start over
      if (!start || (start && end)) {
        start = dayISO;
        end = null;
      } else {
        // picking end; normalize order if user clicked earlier date
        if (dayISO < start) {
          end = start;
          start = dayISO;
        } else {
          end = dayISO;
        }
      }
      localStorage.setItem("tt.start_date", start || "");
      localStorage.setItem("tt.end_date",   end   || "");
      render();
    }
  
    function clearAll() {
      start = null; end = null;
      localStorage.removeItem("tt.start_date");
      localStorage.removeItem("tt.end_date");
      localStorage.removeItem("tt.days");
      render();
    }
  
    // navigation
    prevBtn.addEventListener("click", () => { view.setMonth(view.getMonth() - 1); render(); });
    nextBtn.addEventListener("click", () => { view.setMonth(view.getMonth() + 1); render(); });
    clearBtn.addEventListener("click", clearAll);
  
    // initial
    render();
  })();
  