/* -------------------- Small utilities -------------------- */

function el(id) {
  return document.getElementById(id);
}

function money(n) {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function grams(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '';
  // Keep "g" on the same line
  return `${v}${Number.isInteger(v) ? '' : ''}g`;
}

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* -------------------- App state -------------------- */

const state = {
  // which screen is visible (step id like 'step-size')
  step: null,

  size: null,
  style: null,
  video: null,

  // transient: currently picking options for this part
  partPick: null,

  // { [partName]: { name, price, link, weight } }
  picks: {},
};

/* -------------------- Style/Video option logic -------------------- */

const SIZES = ['65mm', '2"', '3"', '3.5"', '5"'];

const STYLES = ['Freestyle', 'Racing', 'Cinematic'];
const VIDEO_SYSTEMS = ['Analog', 'DJI', 'HDZero', 'Walksnail'];

function allowedStylesForSize(size) {
  // You can customize this however you want.
  // For now: all sizes can use all styles.
  return STYLES.slice();
}

function allowedVideosForSize(size) {
  // You can customize this however you want.
  // For now: all sizes can use all video systems.
  return VIDEO_SYSTEMS.slice();
}

/* -------------------- DB helpers -------------------- */
/* This expects window.PARTS_DB from data.js */

/*
Supports either:
A) { size:'5"', style:'Freestyle', video:'Analog', part:'Frame', options:[...] }
B) { sizes:['5"'], styles:['Freestyle','Racing'], videos:['Analog','DJI'], part:'Frame', options:[...] }
*/

function matchesOne(rule, selected) {
  if (rule == null) return false;
  if (rule === 'Any') return true;
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
  const set = new Set(rows.map((r) => r.part));
  return Array.from(set);
}

/* -------------------- Custom parts storage -------------------- */

const CUSTOM_KEY = 'drone_builder_custom_parts_v1';

function loadCustom() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveCustom(arr) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
}

function customMatches(c) {
  // custom part must match the current selection like DB rows do
  return (
    matchesOne(c.size ?? c.sizes, state.size) &&
    matchesOne(c.style ?? c.styles, state.style) &&
    matchesOne(c.video ?? c.videos, state.video)
  );
}

function deleteCustomById(id) {
  const arr = loadCustom().filter((x) => x.id !== id);
  saveCustom(arr);
}

/* -------------------- Progress + Saved builds (localStorage) -------------------- */
// This project is static (GitHub Pages / Netlify). Without a backend, "accounts" aren't possible.
// Instead we persist progress + saved builds locally in the user's browser via localStorage.

const PROGRESS_KEY = 'drone_builder_progress_v1';
const SAVED_BUILDS_KEY = 'drone_builder_saved_builds_v1';

function safeParseJSON(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function persistProgress() {
  // Only store what we need to restore the builder
  const payload = {
    step: state.step || null,
    size: state.size || null,
    style: state.style || null,
    video: state.video || null,
    picks: state.picks || {},
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
}

function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

function restoreProgress() {
  const saved = safeParseJSON(localStorage.getItem(PROGRESS_KEY), null);
  if (!saved || typeof saved !== 'object') return false;

  state.step = saved.step ?? null;
  state.size = saved.size ?? null;
  state.style = saved.style ?? null;
  state.video = saved.video ?? null;
  state.picks = (saved.picks && typeof saved.picks === 'object') ? saved.picks : {};
  return true;
}

function getSavedBuilds() {
  const arr = safeParseJSON(localStorage.getItem(SAVED_BUILDS_KEY), []);
  return Array.isArray(arr) ? arr : [];
}

function setSavedBuilds(arr) {
  localStorage.setItem(SAVED_BUILDS_KEY, JSON.stringify(arr));
}

function computeTotalsFromPicks(picks) {
  let totalPrice = 0;
  let knownWeightSum = 0;
  let hasAnyKnownWeight = false;

  for (const part of Object.keys(picks || {})) {
    const p = picks[part] || {};
    totalPrice += Number(p.price) || 0;

    const w = Number(p.weight);
    if (Number.isFinite(w) && w > 0) {
      knownWeightSum += w;
      hasAnyKnownWeight = true;
    }
  }

  return {
    totalPrice,
    totalWeight: hasAnyKnownWeight ? knownWeightSum : null, // null => unknown
  };
}

function saveCurrentBuild() {
  // "Save" means: take the current state selections + picks and store a snapshot.
  if (!state.size || !state.style || !state.video) return;

  const name = prompt('Name this drone build (ex: "5\\" Freestyle 6S")');
  if (!name) return;

  const totals = computeTotalsFromPicks(state.picks);

  const build = {
    id: newId(),
    name: String(name).trim(),
    createdAt: Date.now(),
    size: state.size,
    style: state.style,
    video: state.video,
    picks: state.picks || {},
    totals,
  };

  const builds = getSavedBuilds();
  builds.unshift(build); // newest first
  setSavedBuilds(builds);

  // If the modal is open, refresh it
  renderSavedBuildsList();
}

function loadBuildById(id) {
  const builds = getSavedBuilds();
  const build = builds.find((b) => b.id === id);
  if (!build) return;

  state.size = build.size ?? null;
  state.style = build.style ?? null;
  state.video = build.video ?? null;
  state.picks = build.picks ?? {};
  state.partPick = null;

  // Re-render everything
  renderSize();
  renderStyle();
  renderVideo();
  renderResults();

  // Jump to results
  show('step-results');
  persistProgress();
}

function deleteBuildById(id) {
  const builds = getSavedBuilds().filter((b) => b.id !== id);
  setSavedBuilds(builds);
  renderSavedBuildsList();
}

// Modal UI
function openSavedBuilds() {
  const modal = el('savedModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderSavedBuildsList();
}

function closeSavedBuilds() {
  const modal = el('savedModal');
  if (!modal) return;
  modal.classList.add('hidden');
}

function renderSavedBuildsList() {
  const list = el('savedList');
  const empty = el('savedEmpty');
  if (!list) return;

  const builds = getSavedBuilds();
  list.innerHTML = '';

  if (empty) {
    empty.style.display = builds.length ? 'none' : 'block';
  }

  for (const b of builds) {
    const row = document.createElement('div');
    row.className = 'savedRow';

    const metaLeft = document.createElement('div');
    metaLeft.className = 'savedMeta';

    const title = document.createElement('div');
    title.className = 'savedTitle';
    title.textContent = b.name || 'Untitled build';

    const sub = document.createElement('div');
    sub.className = 'savedSub';

    const totals = b.totals || {};
    const priceStr = (Number(totals.totalPrice) > 0) ? money(totals.totalPrice) : '';
    const weightStr = Number.isFinite(Number(totals.totalWeight)) ? grams(totals.totalWeight) : 'Unknown';

    sub.textContent = `${b.size || ''} • ${b.style || ''} • ${b.video || ''} • ${priceStr}${priceStr ? ' • ' : ''}${weightStr}`;

    metaLeft.appendChild(title);
    metaLeft.appendChild(sub);

    const actions = document.createElement('div');
    actions.className = 'savedActions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'smallBtn';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => {
      loadBuildById(b.id);
      closeSavedBuilds();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'smallBtn danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
      if (confirm(`Delete saved build "${b.name || 'Untitled'}"?`)) {
        deleteBuildById(b.id);
      }
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);

    row.appendChild(metaLeft);
    row.appendChild(actions);
    list.appendChild(row);
  }
}

/* -------------------- UI helpers -------------------- */

function show(stepId) {
  const steps = ['step-size', 'step-style', 'step-video', 'step-part', 'step-results'];
  for (const id of steps) {
    const node = el(id);
    if (!node) continue;
    node.classList.toggle('hidden', id !== stepId);
  }

  state.step = stepId;
  renderCrumbs();
  persistProgress();
}

function renderCrumbs() {
  const crumbs = el('crumbs');
  if (!crumbs) return;

  const bits = [];
  if (state.size) bits.push(`Size: ${state.size}`);
  if (state.style) bits.push(`Style: ${state.style}`);
  if (state.video) bits.push(`Video: ${state.video}`);

  crumbs.textContent = bits.join(' • ');
}

/* -------------------- Step 1: Size -------------------- */

function renderSize() {
  const wrap = el('step-size');
  if (!wrap) return;

  wrap.innerHTML = `
    <h1>Drone Builder</h1>
    <p class="sub">Pick your size first.</p>
    <div class="panel">
      <h2>Size</h2>
      <div id="sizeBtns"></div>
    </div>
  `;

  const btnWrap = el('sizeBtns');
  for (const s of SIZES) {
    const b = document.createElement('button');
    b.className = 'smallBtn';
    b.type = 'button';
    b.textContent = s;
    b.addEventListener('click', () => {
      state.size = s;

      // when size changes, reset deeper choices
      state.style = null;
      state.video = null;
      state.partPick = null;
      state.picks = {};

      // if only one style exists, set it automatically
      const allowed = allowedStylesForSize(state.size);
      if (allowed.length === 1) state.style = allowed[0];

      renderStyle();
      show('step-style');
    });
    btnWrap.appendChild(b);
  }
}

function renderSizeStep() {
  renderSize();
}

/* -------------------- Step 2: Style -------------------- */

function renderStyle() {
  const wrap = el('step-style');
  if (!wrap) return;

  const allowed = state.size ? allowedStylesForSize(state.size) : STYLES;

  wrap.innerHTML = `
    <h1>Pick Style</h1>
    <p class="sub">Size: <strong>${state.size || ''}</strong></p>
    <div class="panel">
      <h2>Style</h2>
      <div id="styleBtns"></div>
    </div>
    <div class="nav">
      <button class="smallBtn" id="backStyle" type="button">Back</button>
    </div>
  `;

  el('backStyle')?.addEventListener('click', () => show('step-size'));

  const btnWrap = el('styleBtns');
  for (const st of allowed) {
    const b = document.createElement('button');
    b.className = 'smallBtn';
    b.type = 'button';
    b.textContent = st;
    b.addEventListener('click', () => {
      state.style = st;

      // when style changes, reset deeper choice(s)
      state.video = null;
      state.partPick = null;
      state.picks = {};

      renderVideo();
      show('step-video');
    });
    btnWrap.appendChild(b);
  }
}

function renderStyleStep() {
  renderStyle();
}

/* -------------------- Step 3: Video -------------------- */

function renderVideo() {
  const wrap = el('step-video');
  if (!wrap) return;

  const allowed = state.size ? allowedVideosForSize(state.size) : VIDEO_SYSTEMS;

  wrap.innerHTML = `
    <h1>Pick Video</h1>
    <p class="sub">Size: <strong>${state.size || ''}</strong> • Style: <strong>${state.style || ''}</strong></p>
    <div class="panel">
      <h2>Video System</h2>
      <div id="videoBtns"></div>
    </div>
    <div class="nav">
      <button class="smallBtn" id="backVideo" type="button">Back</button>
    </div>
  `;

  el('backVideo')?.addEventListener('click', () => show('step-style'));

  const btnWrap = el('videoBtns');
  for (const v of allowed) {
    const b = document.createElement('button');
    b.className = 'smallBtn';
    b.type = 'button';
    b.textContent = v;
    b.addEventListener('click', () => {
      state.video = v;
      state.partPick = null;
      state.picks = {};

      renderResults();
      show('step-results');
    });
    btnWrap.appendChild(b);
  }
}

function renderVideoStep() {
  renderVideo();
}

/* -------------------- Step 3.5: Part picker -------------------- */
/* The part picker screen shows options for a specific part, plus custom part adding. */

function buildPartOptionsCombined(part) {
  const rows = rowsForCurrentSelection().filter((r) => r.part === part);

  const dbOptions = [];
  for (const row of rows) {
    for (const opt of (row.options || [])) {
      dbOptions.push({
        id: null,
        name: opt.name,
        price: opt.price ?? 0,
        link: opt.link ?? '',
        weight: opt.weight ?? null,
        source: 'db',
      });
    }
  }

  const customOptions = loadCustom()
    .filter((c) => customMatches(c) && c.part === part)
    .map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price ?? 0,
      link: c.link ?? '',
      weight: c.weight ?? null,
      source: 'custom',
    }));

  // custom first so it "wins" on duplicates by name
  const seen = new Set();
  const merged = [];
  for (const opt of [...customOptions, ...dbOptions]) {
    const key = String(opt.name || '').trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(opt);
  }

  merged.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  return merged;
}

function openPartPicker(part) {
  state.partPick = part;
  renderPartPickerOptions();
  show('step-part');
}

function renderPartPickerOptions() {
  const wrap = el('step-part');
  if (!wrap) return;

  const part = state.partPick;
  const opts = buildPartOptionsCombined(part);

  wrap.innerHTML = `
    <h1>Pick ${part}</h1>
    <p class="sub">Options are sorted cheapest-first. Click a card to select it.</p>

    <div class="panel">
      <h2>Options</h2>
      <div id="optionsList" class="list"></div>
    </div>

    <div class="panel">
      <h2>Add a custom part</h2>
      <p class="sub">Add your own part so it shows up as an option next time.</p>

      <div class="formRow">
        <input class="input" id="customName" placeholder='Title (ex: "Quadmula Split 3")' />
        <input class="input" id="customLink" placeholder="Link (https://...)" />
        <input class="input" id="customPrice" placeholder="Price (ex: 79.99)" />
      </div>

      <div class="formRow2">
        <input class="input" id="customWeight" placeholder="Weight (g, ex: 106)" />
      </div>

      <div class="nav" style="justify-content:flex-start;">
        <button class="smallBtn" id="customAdd" type="button">Add Custom Part</button>
        <button class="smallBtn" id="customCancel" type="button">Cancel</button>
      </div>
    </div>
  `;

  el('customCancel')?.addEventListener('click', () => show('step-results'));

  el('customAdd')?.addEventListener('click', () => {
    const name = (el('customName')?.value || '').trim();
    const link = (el('customLink')?.value || '').trim();
    const price = Number(el('customPrice')?.value || 0) || 0;
    const weight = Number(el('customWeight')?.value || 0) || null;

    if (!name) {
      alert('Please enter a title/name.');
      return;
    }

    const arr = loadCustom();
    arr.unshift({
      id: newId(),
      part,
      // store exact current selection for matching
      size: state.size,
      style: state.style,
      video: state.video,

      name,
      link,
      price,
      weight,
    });
    saveCustom(arr);

    renderPartPickerOptions();
  });

  const list = el('optionsList');
  if (!list) return;

  if (!opts.length) {
    list.innerHTML = `<div class="sub">No options found yet. Add entries in <b>data.js</b> or add a custom part below.</div>`;
    return;
  }

  for (const opt of opts) {
    const div = document.createElement('div');
    div.className = 'optionCard';

    const nameHtml = opt.link
      ? `<a class="optionLink" href="${opt.link}" target="_blank" rel="noopener">${opt.name}</a>`
      : `<div style="font-weight:800">${opt.name}</div>`;

    const weightLine = (Number(opt.weight) > 0) ? grams(opt.weight) : '';

    div.innerHTML = `
      <div>
        ${nameHtml}
        <div class="optionMeta">${weightLine}</div>
      </div>
    `;

    const priceDiv = document.createElement('div');
    priceDiv.className = 'price';
    priceDiv.textContent = (Number(opt.price) > 0) ? money(opt.price) : '';
    div.appendChild(priceDiv);

    div.addEventListener('click', () => {
      state.picks[part] = {
        name: opt.name,
        price: opt.price || 0,
        link: opt.link || '',
        weight: opt.weight ?? null,
      };
      state.partPick = null;
      renderResults();
      show('step-results');
    });

    list.appendChild(div);
  }

  persistProgress();
}

/* -------------------- Step 4: Results -------------------- */

function renderResults() {
  const summary = el('summary');
  if (summary) {
    summary.innerHTML = `
      <span class="pill"><strong>Size</strong>: ${state.size ?? ''}</span>
      <span class="pill"><strong>Style</strong>: ${state.style ?? ''}</span>
      <span class="pill"><strong>Video</strong>: ${state.video ?? ''}</span>
    `;
  }

  const container = el('idealList');
  if (!container) return;
  container.innerHTML = '';

  const parts = uniquePartsForSelection();

  // If nothing matches the DB, show a message but don't crash.
  if (parts.length === 0) {
    container.innerHTML = `<div class="sub">No parts found for this combo yet.</div>`;
    const totalEl = el('idealTotal');
    if (totalEl) totalEl.textContent = '';
    persistProgress();
    return;
  }

  let totalPrice = 0;
  let totalWeight = 0;
  let hasKnownWeight = false;

  for (const part of parts) {
    const opts = buildPartOptionsCombined(part);
    if (opts.length === 0) continue;

    // Default pick = cheapest (if user hasn't picked yet)
    if (!state.picks[part]) {
      const first = opts[0];
      state.picks[part] = {
        name: first.name,
        price: first.price || 0,
        link: first.link || '',
        weight: first.weight ?? null,
      };
    }

    const picked = state.picks[part];

    totalPrice += Number(picked.price) || 0;

    const w = Number(picked.weight);
    if (Number.isFinite(w) && w > 0) {
      totalWeight += w;
      hasKnownWeight = true;
    }

    const row = document.createElement('div');
    row.className = 'row';

    const left = document.createElement('div');
    left.className = 'partName';
    left.textContent = part;

    const mid = document.createElement('div');
    mid.className = 'mid';

    const weightText = (Number(picked.weight) > 0) ? grams(picked.weight) : '';

    if (picked.link) {
      mid.innerHTML = `
        <a class="optionLink" href="${picked.link}" target="_blank" rel="noopener">${picked.name}</a>
        <div class="optionMeta">${weightText}</div>
      `;
    } else {
      mid.innerHTML = `
        <div style="font-weight:800">${picked.name || 'Choose a Part:'}</div>
        <div class="optionMeta">${weightText}</div>
      `;
    }

    const right = document.createElement('div');
    right.className = 'right';

    const chooseBtn = document.createElement('button');
    chooseBtn.className = 'smallBtn';
    chooseBtn.type = 'button';
    chooseBtn.textContent = 'Choose';
    chooseBtn.addEventListener('click', () => openPartPicker(part));

    const priceDiv = document.createElement('div');
    priceDiv.className = 'price';
    priceDiv.textContent = (Number(picked.price) > 0) ? money(picked.price) : '';

    right.appendChild(chooseBtn);
    right.appendChild(priceDiv);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);

    container.appendChild(row);
  }

  // Total rows
  const totalEl = el('idealTotal');
  if (totalEl) {
    const weightStr = hasKnownWeight ? `${totalWeight}g` : 'Unknown';
    totalEl.innerHTML = `
      <div class="total">
        <div class="label">Total weight: <span class="value">${weightStr}</span></div>
        <div class="price">${totalPrice > 0 ? money(totalPrice) : ''}</div>
      </div>
    `;
  }

  // Save + view saved builds buttons
  const actions = document.createElement('div');
  actions.className = 'resultsActions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'smallBtn';
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save Drone';
  saveBtn.addEventListener('click', saveCurrentBuild);

  const viewSavedBtn = document.createElement('button');
  viewSavedBtn.className = 'smallBtn';
  viewSavedBtn.type = 'button';
  viewSavedBtn.textContent = 'Saved Drones';
  viewSavedBtn.addEventListener('click', openSavedBuilds);

  actions.appendChild(saveBtn);
  actions.appendChild(viewSavedBtn);
  container.appendChild(actions);

  persistProgress();
}

/* -------------------- Wire up Results nav buttons -------------------- */

function bindResultsNav() {
  const back = el('backResults');
  if (back) back.addEventListener('click', () => show('step-video'));

  const restart = el('restart');
  if (restart) {
    restart.addEventListener('click', () => {
      clearProgress();

      state.size = null;
      state.style = null;
      state.video = null;
      state.partPick = null;
      state.picks = {};

      renderSize();
      renderStyle();
      renderVideo();
      renderResults();
      show('step-size');
    });
  }
}

/* -------------------- Init -------------------- */

document.addEventListener('DOMContentLoaded', () => {
  // Restore in-progress build (so refresh doesn't wipe the user)
  restoreProgress();

  // If a restored size only has 1 allowed style, auto-fill it (matches the normal flow)
  if (state.size && !state.style) {
    const allowed = allowedStylesForSize(state.size);
    if (allowed.length === 1) state.style = allowed[0];
  }

  // Render all screens (they read from state)
  renderSizeStep();
  renderStyleStep();
  renderVideoStep();
  renderResults();

  // Wire up Results nav buttons
  bindResultsNav();

  // Hook up Saved Drones modal/button
  const savedBtn = el('savedBtn');
  if (savedBtn) savedBtn.addEventListener('click', openSavedBuilds);

  const savedClose = el('savedClose');
  if (savedClose) savedClose.addEventListener('click', closeSavedBuilds);

  // click outside modal content closes it
  const savedModal = el('savedModal');
  if (savedModal) {
    savedModal.addEventListener('click', (e) => {
      if (e.target === savedModal) closeSavedBuilds();
    });
  }

  // Decide which step to show after restore
  let step = state.step;

  // sanitize step based on what we actually have
  if (!step) {
    step = (!state.size) ? 'step-size'
      : (!state.style) ? 'step-style'
        : (!state.video) ? 'step-video'
          : 'step-results';
  } else {
    // Don't allow jumping to later steps without prerequisites
    if (step === 'step-style' && !state.size) step = 'step-size';
    if (step === 'step-video' && (!state.size || !state.style)) step = (!state.size) ? 'step-size' : 'step-style';
    if (step === 'step-part') step = 'step-results'; // part picker is transient
    if (step === 'step-results' && (!state.size || !state.style || !state.video)) {
      step = (!state.size) ? 'step-size'
        : (!state.style) ? 'step-style'
          : 'step-video';
    }
  }

  show(step);
});
