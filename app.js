/* Drone Builder (app.js)
   - Single parts list (no Ideal/Budget split)
   - Saved drones + reload persistence
   - Custom parts stored locally
*/

const LS_STATE_KEY = "db_state_v1";
const LS_CUSTOM_KEY = "db_custom_v1";
const LS_SAVED_KEY = "db_saved_v1";

const SIZES = [
  { id: '5"', title: '5"', sub: "Freestyle / Racing / Cinematic" },
  { id: '7"', title: '7"', sub: "Cinematic Long Range" },
  { id: '3"', title: '3"', sub: "Freestyle / Racing / Cinematic" },
  { id: 'Tinywhoop (prebuilt)', title: "Tinywhoop (prebuilt)", sub: "Prebuilt Freestyle / Racing" },
  { id: 'Cinewhoop (prebuilt)', title: "Cinewhoop (prebuilt)", sub: "Prebuilt Cinematic" },
];

function stylesForSize(size) {
  if (!size) return [];
  if (String(size).includes("Tinywhoop")) return ["Freestyle", "Racing"];
  if (String(size).includes("Cinewhoop")) return ["Cinematic"];
  if (size === '7"') return ["Cinematic", "Long Range"];
  return ["Freestyle", "Racing", "Cinematic"];
}

function videosFor(size, style) {
  // Keep broad options unless you want to narrow later
  return ["Analog", "DJI", "Walksnail", "HDZero"];
}

const state = {
  step: "step-size",
  size: null,
  style: null,
  video: null,
  picks: {},      // { [partName]: { name, price, link, weight } }
  activePart: null
};

// ---------- DOM helpers ----------
const el = (id) => document.getElementById(id);

function show(stepId) {
  for (const s of document.querySelectorAll(".step")) s.classList.add("hidden");
  el(stepId).classList.remove("hidden");
  state.step = stepId;
  renderTopInfo();
  saveProgress();
}

function renderTopInfo() {
  const top = el("topInfo");
  const bits = [];
  if (state.size) bits.push(`Size: ${state.size}`);
  if (state.style) bits.push(`Style: ${state.style}`);
  if (state.video) bits.push(`Video: ${state.video}`);
  top.textContent = bits.join(" • ");
}

function money(n) {
  const v = Number(n || 0);
  return `$${v.toFixed(2)}`;
}
function grams(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  // keep on one line
  return `${v} g`;
}

// ---------- Custom Parts storage ----------
function loadCustom() {
  try { return JSON.parse(localStorage.getItem(LS_CUSTOM_KEY) || "[]"); }
  catch { return []; }
}
function saveCustom(list) {
  localStorage.setItem(LS_CUSTOM_KEY, JSON.stringify(list || []));
}
function uuid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

// Match custom parts against current selection (size/style/video)
function customMatches(c) {
  const sizeOk = c.size ? c.size === state.size : true;
  const styleOk = c.style ? c.style === state.style : true;
  const videoOk = c.video ? c.video === state.video : true;
  return sizeOk && styleOk && videoOk;
}

// ---------- DB helpers (supports both row formats) ----------
function matchesOne(rule, selected) {
  if (rule == null) return false;
  if (rule === "Any") return true;
  if (Array.isArray(rule)) return rule.includes(selected);
  return rule === selected;
}

function rowMatchesState(row) {
  const sizesRule = row.sizes ?? row.size;
  const stylesRule = row.styles ?? row.style;
  const videosRule = row.videos ?? row.video;
  return (
    matchesOne(sizesRule, state.size) &&
    matchesOne(stylesRule, state.style) &&
    matchesOne(videosRule, state.video)
  );
}

function rowsForCurrentSelection() {
  return (window.PARTS_DB || []).filter(rowMatchesState);
}

function uniquePartsForSelection() {
  const rows = rowsForCurrentSelection();
  const set = new Set(rows.map(r => r.part));
  return Array.from(set);
}

// Merge DB + Custom for a part, cheapest first
function buildPartOptionsCombined(part) {
  const rows = rowsForCurrentSelection().filter(r => r.part === part);

  const dbOptions = [];
  for (const row of rows) {
    for (const opt of (row.options || [])) {
      dbOptions.push({
        id: null,
        name: opt.name,
        price: opt.price ?? 0,
        link: opt.link ?? "",
        weight: opt.weight ?? null,
        source: "db",
      });
    }
  }

  const customOptions = loadCustom()
    .filter(c => customMatches(c) && c.part === part)
    .map(c => ({
      id: c.id,
      name: c.name,
      price: c.price ?? 0,
      link: c.link ?? "",
      weight: c.weight ?? null,
      source: "custom",
    }));

  // custom first so it wins on duplicates by name
  const seen = new Set();
  const merged = [];
  for (const opt of [...customOptions, ...dbOptions]) {
    const key = String(opt.name || "").trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(opt);
  }

  merged.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  return merged;
}

// ---------- Progress persistence ----------
function saveProgress() {
  const snapshot = {
    step: state.step,
    size: state.size,
    style: state.style,
    video: state.video,
    picks: state.picks
  };
  localStorage.setItem(LS_STATE_KEY, JSON.stringify(snapshot));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || typeof s !== "object") return false;

    state.step = s.step || "step-size";
    state.size = s.size ?? null;
    state.style = s.style ?? null;
    state.video = s.video ?? null;
    state.picks = s.picks || {};
    return true;
  } catch {
    return false;
  }
}

function clearProgress() {
  localStorage.removeItem(LS_STATE_KEY);
}

// ---------- UI builders ----------
function makeChoiceCard({ title, sub, onClick }) {
  const div = document.createElement("div");
  div.className = "choice";
  div.addEventListener("click", onClick);
  div.innerHTML = `
    <div class="choiceTitle">${title}</div>
    <div class="choiceSub">${sub || ""}</div>
  `;
  return div;
}

function renderSizeStep() {
  const grid = el("sizeGrid");
  grid.innerHTML = "";
  for (const s of SIZES) {
    grid.appendChild(makeChoiceCard({
      title: s.title,
      sub: s.sub,
      onClick: () => {
        state.size = s.id;
        state.style = null;
        state.video = null;
        state.picks = {};
        renderStyleStep();
        show("step-style");
      }
    }));
  }
}

function renderStyleStep() {
  const grid = el("styleGrid");
  grid.innerHTML = "";
  const styles = stylesForSize(state.size);
  styles.forEach(st => {
    grid.appendChild(makeChoiceCard({
      title: st,
      sub: "",
      onClick: () => {
        state.style = st;
        state.video = null;
        state.picks = {};
        renderVideoStep();
        show("step-video");
      }
    }));
  });
}

function renderVideoStep() {
  const grid = el("videoGrid");
  grid.innerHTML = "";
  const vids = videosFor(state.size, state.style);
  vids.forEach(v => {
    grid.appendChild(makeChoiceCard({
      title: v,
      sub: "",
      onClick: () => {
        state.video = v;
        state.picks = {};
        renderResults();
        show("step-results");
      }
    }));
  });
}

// ---------- Results list (ONE section) ----------
function renderSummaryPills() {
  const summary = el("summary");
  summary.innerHTML = `
    <span class="pill"><strong>Size</strong>: ${state.size || ""}</span>
    <span class="pill"><strong>Style</strong>: ${state.style || ""}</span>
    <span class="pill"><strong>Video</strong>: ${state.video || ""}</span>
  `;
}

function renderResults() {
  renderSummaryPills();

  const parts = uniquePartsForSelection();
  const list = el("partsList");
  list.innerHTML = "";

  let totalPrice = 0;
  let weightKnownCount = 0;
  let totalWeight = 0;

  for (const part of parts) {
    const opts = buildPartOptionsCombined(part);
    if (!opts.length) continue;

    // default pick = cheapest option
    if (!state.picks[part]) {
      const first = opts[0];
      state.picks[part] = {
        name: first.name,
        price: first.price ?? 0,
        link: first.link ?? "",
        weight: first.weight ?? null
      };
    }

    const picked = state.picks[part];
    totalPrice += Number(picked.price || 0);

    const w = Number(picked.weight);
    if (Number.isFinite(w) && w > 0) {
      totalWeight += w;
      weightKnownCount++;
    }

    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.className = "partName";
    left.textContent = part;

    const mid = document.createElement("div");
    mid.className = "pickCol";

    const pickTitle = picked.link
      ? `<a class="pickTitle" href="${picked.link}" target="_blank" rel="noopener">${picked.name}</a>`
      : `<div class="pickTitle">${picked.name || "Choose a Part:"}</div>`;

    const pickMeta = (Number.isFinite(w) && w > 0) ? grams(w) : "";
    mid.innerHTML = `
      ${pickTitle}
      <div class="pickMeta">${pickMeta}</div>
    `;

    const right = document.createElement("div");
    right.className = "rightCol";

    const chooseBtn = document.createElement("button");
    chooseBtn.className = "smallBtn";
    chooseBtn.type = "button";
    chooseBtn.textContent = "Choose";
    chooseBtn.addEventListener("click", () => openPartPicker(part));

    const priceDiv = document.createElement("div");
    priceDiv.className = "price";
    priceDiv.textContent = Number(picked.price || 0) > 0 ? money(picked.price) : "";

    right.appendChild(chooseBtn);
    right.appendChild(priceDiv);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);

    list.appendChild(row);
  }

  // totals
  el("totalPrice").textContent = totalPrice > 0 ? money(totalPrice) : "";
  el("totalWeight").textContent = (weightKnownCount > 0) ? grams(totalWeight) : "Unknown";

  saveProgress();
}

// ---------- Part picker modal ----------
function openPartPicker(part) {
  state.activePart = part;

  el("pickerTitle").textContent = `Pick ${part}`;
  el("pickerSub").textContent = `Size: ${state.size} • Style: ${state.style} • Video: ${state.video}`;

  const opts = buildPartOptionsCombined(part);
  const wrap = el("pickerOptions");
  wrap.innerHTML = "";

  if (!opts.length) {
    wrap.innerHTML = `<div class="sub">No options found yet. Add entries in <b>data.js</b> or add a custom part below.</div>`;
  } else {
    for (const opt of opts) {
      const card = document.createElement("div");
      card.className = "row";

      const left = document.createElement("div");
      left.className = "pickCol";
      left.innerHTML = opt.link
        ? `<a class="pickTitle" href="${opt.link}" target="_blank" rel="noopener">${opt.name}</a>`
        : `<div class="pickTitle">${opt.name}</div>`;

      const meta = document.createElement("div");
      meta.className = "pickMeta";
      meta.textContent = (Number(opt.weight) > 0) ? grams(Number(opt.weight)) : "";

      const leftWrap = document.createElement("div");
      leftWrap.className = "pickCol";
      leftWrap.appendChild(left);
      leftWrap.appendChild(meta);

      const blank = document.createElement("div");
      blank.className = "pickCol";
      blank.textContent = "";

      const right = document.createElement("div");
      right.className = "rightCol";

      const pickBtn = document.createElement("button");
      pickBtn.className = "smallBtn";
      pickBtn.type = "button";
      pickBtn.textContent = "Select";
      pickBtn.addEventListener("click", () => {
        state.picks[part] = {
          name: opt.name,
          price: opt.price ?? 0,
          link: opt.link ?? "",
          weight: opt.weight ?? null
        };
        closePartPicker();
        renderResults();
      });

      const price = document.createElement("div");
      price.className = "price";
      price.textContent = Number(opt.price || 0) > 0 ? money(opt.price) : "";

      right.appendChild(pickBtn);
      right.appendChild(price);

      card.appendChild(document.createElement("div")); // placeholder for alignment
      card.appendChild(leftWrap);
      card.appendChild(right);

      wrap.appendChild(card);
    }
  }

  // clear custom inputs
  el("customTitle").value = "";
  el("customLink").value = "";
  el("customPrice").value = "";
  el("customWeight").value = "";

  el("pickerModal").classList.remove("hidden");
  el("pickerModal").setAttribute("aria-hidden", "false");
}

function closePartPicker() {
  el("pickerModal").classList.add("hidden");
  el("pickerModal").setAttribute("aria-hidden", "true");
  state.activePart = null;
}

function addCustomPart() {
  const part = state.activePart;
  if (!part) return;

  const name = el("customTitle").value.trim();
  const link = el("customLink").value.trim();
  const price = Number(el("customPrice").value);
  const weight = Number(el("customWeight").value);

  if (!name) {
    alert("Please enter a title for the custom part.");
    return;
  }

  const custom = loadCustom();
  custom.unshift({
    id: uuid(),
    part,
    name,
    link: link || "",
    price: Number.isFinite(price) ? price : 0,
    weight: Number.isFinite(weight) ? weight : null,

    // lock custom item to current combo so it doesn't appear everywhere
    size: state.size,
    style: state.style,
    video: state.video
  });

  saveCustom(custom);

  // re-open picker list
  openPartPicker(part);
}

// ---------- Saved drones ----------
function loadSavedDrones() {
  try { return JSON.parse(localStorage.getItem(LS_SAVED_KEY) || "[]"); }
  catch { return []; }
}
function saveSavedDrones(list) {
  localStorage.setItem(LS_SAVED_KEY, JSON.stringify(list || []));
}

function openSavedModal() {
  renderSavedModal();
  el("savedModal").classList.remove("hidden");
  el("savedModal").setAttribute("aria-hidden", "false");
}
function closeSavedModal() {
  el("savedModal").classList.add("hidden");
  el("savedModal").setAttribute("aria-hidden", "true");
}

function renderSavedModal() {
  const wrap = el("savedList");
  wrap.innerHTML = "";

  const saved = loadSavedDrones();
  if (!saved.length) {
    wrap.innerHTML = `<div class="sub">No saved drones yet.</div>`;
    return;
  }

  saved.forEach(item => {
    const row = document.createElement("div");
    row.className = "row";

    const left = document.createElement("div");
    left.className = "partName";
    left.textContent = item.name || "Saved Drone";

    const mid = document.createElement("div");
    mid.className = "pickCol";
    const meta = [];
    if (item.state?.size) meta.push(`Size: ${item.state.size}`);
    if (item.state?.style) meta.push(`Style: ${item.state.style}`);
    if (item.state?.video) meta.push(`Video: ${item.state.video}`);
    mid.innerHTML = `<div class="pickMeta">${meta.join(" • ")}</div>`;

    const right = document.createElement("div");
    right.className = "rightCol";

    const loadBtn = document.createElement("button");
    loadBtn.className = "smallBtn";
    loadBtn.type = "button";
    loadBtn.textContent = "Load";
    loadBtn.addEventListener("click", () => {
      if (!item.state) return;
      state.size = item.state.size ?? null;
      state.style = item.state.style ?? null;
      state.video = item.state.video ?? null;
      state.picks = item.state.picks || {};
      renderStyleStep();
      renderVideoStep();
      renderResults();
      show(item.state.step || "step-results");
      closeSavedModal();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "smallBtn";
    delBtn.type = "button";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      if (!confirm("Delete this saved drone?")) return;
      const next = loadSavedDrones().filter(x => x.id !== item.id);
      saveSavedDrones(next);
      renderSavedModal();
    });

    right.appendChild(loadBtn);
    right.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);

    wrap.appendChild(row);
  });
}

function saveCurrentDroneSnapshot() {
  if (!state.size || !state.style || !state.video) {
    alert("Finish choosing Size / Style / Video before saving.");
    return;
  }

  const name = prompt("Name this drone build:", `${state.size} ${state.style} ${state.video}`) || "";
  if (!name.trim()) return;

  const saved = loadSavedDrones();
  saved.unshift({
    id: uuid(),
    name: name.trim(),
    createdAt: Date.now(),
    state: {
      step: "step-results",
      size: state.size,
      style: state.style,
      video: state.video,
      picks: state.picks
    }
  });
  saveSavedDrones(saved);
  alert("Saved!");
}

// ---------- Wire up events ----------
function bindEvents() {
  // Back buttons
  el("backToSize").addEventListener("click", () => show("step-size"));
  el("backToStyle").addEventListener("click", () => show("step-style"));
  el("backToVideo").addEventListener("click", () => show("step-video"));

  // Start over
  el("startOver").addEventListener("click", () => {
    if (!confirm("Start over? This clears your current progress (saved drones stay).")) return;
    state.size = null;
    state.style = null;
    state.video = null;
    state.picks = {};
    clearProgress();
    renderSizeStep();
    show("step-size");
  });

  // Picker modal controls
  el("closePicker").addEventListener("click", closePartPicker);
  el("customCancel").addEventListener("click", closePartPicker);
  el("customAdd").addEventListener("click", addCustomPart);

  // Clicking backdrop closes picker modal
  el("pickerModal").addEventListener("click", (e) => {
    if (e.target === el("pickerModal")) closePartPicker();
  });

  // Saved drones buttons
  el("openSavedBtn").addEventListener("click", openSavedModal);
  el("closeSaved").addEventListener("click", closeSavedModal);
  el("closeSaved2").addEventListener("click", closeSavedModal);
  el("savedModal").addEventListener("click", (e) => {
    if (e.target === el("savedModal")) closeSavedModal();
  });

  // Save drone button on build page
  el("saveDroneBtn").addEventListener("click", saveCurrentDroneSnapshot);
}

// ---------- Init ----------
function init() {
  renderSizeStep();

  // Restore progress if present
  const had = loadProgress();

  // Build intermediate grids so back navigation doesn't show blank
  renderStyleStep();
  renderVideoStep();

  if (had) {
    if (state.step === "step-results") renderResults();
    show(state.step || "step-size");
  } else {
    show("step-size");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  init();
});
