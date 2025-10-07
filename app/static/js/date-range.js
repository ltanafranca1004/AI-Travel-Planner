// turtle trips: inline date-range picker (wanderlog-style)
(() => {
    const grid      = document.getElementById("drp-grid");
    const monthLabel= document.getElementById("drp-monthLabel");
    const prevBtn   = document.getElementById("drp-prev");
    const nextBtn   = document.getElementById("drp-next");
    const startEl   = document.getElementById("drp-start");
    const endEl     = document.getElementById("drp-end");
    const clearBtn  = document.getElementById("drp-clear");
    const doneBtn   = document.getElementById("drp-done");
    const stepDates = document.getElementById("step-dates");
    if (!grid) return;
  
    // --- always reset saved dates on page load ---
    ["tt.start_date","tt.end_date","tt.days"].forEach(k => localStorage.removeItem(k));
  
    // --- helpers ---
    const pad = (n) => String(n).padStart(2, "0");
    const iso = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
    const parts = (s)=>{ const [Y,M,D]=(s||"").split("-").map(Number); return (Y&&M&&D)?{y:Y,m:M-1,d:D}:null; };
    const toDate=(s)=>{ const p=parts(s); return p?new Date(p.y,p.m,p.d):null; };
    const fmtHuman=(s)=> s ? new Date(s+"T00:00:00").toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"}).toLowerCase() : "";
    const diffDaysInclusive=(aISO,bISO)=> !aISO||!bISO ? 0 : Math.round((toDate(bISO)-toDate(aISO))/86400000)+1;
  
    // --- state (start fresh every time) ---
    let view = new Date(); view.setDate(1);
    let start = null;
    let end   = null;
  
    const inRange = (d)=> !!(start && end && d>=start && d<=end);
    const isSame  = (a,b)=> a && b && a===b;
    const setDoneEnabled = ()=> { doneBtn.disabled = !(start && end); };
  
    function render(){
      const y = view.getFullYear(), m = view.getMonth();
      monthLabel.textContent = new Intl.DateTimeFormat(undefined,{month:"long",year:"numeric"}).format(view).toLowerCase();
  
      const firstDow = new Date(y,m,1).getDay();
      const daysInMonth = new Date(y,m+1,0).getDate();
  
      grid.innerHTML = "";
  
      for (let i=0;i<firstDow;i++) {
        const blank=document.createElement("div");
        blank.className="h-9";
        grid.appendChild(blank);
      }
  
      for (let d=1; d<=daysInMonth; d++){
        const btn = document.createElement("button");
        const dayISO = iso(y,m,d);
        btn.type="button";
        btn.dataset.date=dayISO;
        btn.className="h-9 rounded-lg text-sm hover:bg-emerald-50 cursor-pointer select-none";
  
        if (isSame(dayISO,start) || isSame(dayISO,end)) btn.className += " bg-emerald-600 text-white font-semibold";
        else if (inRange(dayISO)) btn.className += " bg-emerald-100";
  
        const today=new Date();
        if (y===today.getFullYear() && m===today.getMonth() && d===today.getDate()) btn.className += " ring-1 ring-emerald-400";
  
        btn.textContent=String(d);
        btn.addEventListener("click",()=>onPick(dayISO));
        grid.appendChild(btn);
      }
  
      startEl.value = fmtHuman(start) || "";
      endEl.value   = fmtHuman(end)   || "";
  
      if (start && end) {
        const days = diffDaysInclusive(start,end);
        localStorage.setItem("tt.days", String(days));
      }
      setDoneEnabled();
    }
  
    function onPick(dayISO){
      if (!start || (start && end)) { start=dayISO; end=null; }
      else { end = (dayISO < start) ? ( [start, start=dayISO][0] , start ) : dayISO; }
      // keep local copy for days count + json preview later
      localStorage.setItem("tt.start_date", start || "");
      localStorage.setItem("tt.end_date",   end   || "");
      render();
    }
  
    function clearAll(){
      start=null; end=null;
      ["tt.start_date","tt.end_date","tt.days"].forEach(k => localStorage.removeItem(k));
      render();
    }
  
    // finish → POST payload to /review (now a questionnaire page)
    function finishIfReady(){
      if (!(start && end)) return;
  
      const days = diffDaysInclusive(start, end);
      const payload = {
        country:      localStorage.getItem("tt.country_name") || "",
        city:         localStorage.getItem("tt.city") || "",
        start_date:   start,
        end_date:     end,
        days:         String(days)
      };
      
  
      // optional: keep a copy for the client
      localStorage.setItem("tt.payload", JSON.stringify(payload));
  
      // notify any listeners
      document.dispatchEvent(new CustomEvent("tt:dates-confirmed", { detail: { ...payload } }));
  
      // POST directly to generate (skip questionnaire)
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/generate";  // skip questionnaire, go directly to generate
  
      for (const [k,v] of Object.entries(payload)) {
        const input = document.createElement("input");
        input.type = "hidden"; input.name = k; input.value = v;
        form.appendChild(input);
      }
  
      const jsonInput = document.createElement("input");
      jsonInput.type = "hidden"; jsonInput.name = "trip_json"; jsonInput.value = JSON.stringify(payload);
      form.appendChild(jsonInput);
  
      document.body.appendChild(form);
      form.submit();
    }
  
    // controls
    prevBtn.addEventListener("click",()=>{ view.setMonth(view.getMonth()-1); render(); });
    nextBtn.addEventListener("click",()=>{ view.setMonth(view.getMonth()+1); render(); });
    clearBtn.addEventListener("click", clearAll);
    doneBtn.addEventListener("click", finishIfReady);
    document.addEventListener("keydown",(e)=>{ if(e.key==="Enter" && !stepDates.classList.contains("hidden")) finishIfReady(); });
  
    render();
  })();
  