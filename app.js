// -------------------- Config --------------------
const SIZES = [
  { key:'5"', desc:'Freestyle / Racing / Cinematic' },
  { key:'7"', desc:'Cinematic Long Range' },
  { key:'3"', desc:'Freestyle / Racing / Cinematic' },
  { key:'Tinywhoop (prebuilt)', desc:'Prebuilt Freestyle / Racing' },
  { key:'Cinewhoop (prebuilt)', desc:'Prebuilt Cinematic' },
];

const ALL_STYLES = ['Freestyle','Racing','Cinematic'];

const VIDEO_SYSTEMS = [
  { key:'Analog', desc:'Good for entry level and long range' },
  { key:'HDZero', desc:'Best Low Latency HD' },
  { key:'DJI', desc:'4K Best Image Quality' },
  { key:'Other', desc:'Walksnail, Etc.' },

];

function allowedStylesForSize(size){
  if(size === '7"') return ['Cinematic'];
  if(size === 'Tinywhoop (prebuilt)') return ['Freestyle','Racing']; // no long range
  if(size === 'Cinewhoop (prebuilt)') return ['Cinematic'];
  return ALL_STYLES;
}

// -------------------- State --------------------
const state = {
  size: null,
  style: null,
  video: null,

  // picks[part] = { name, price, link, weight }
  picks: {},

  // current part picking context
  partPick: null, // { part: 'Frame' }
};

// -------------------- Custom parts storage --------------------
const CUSTOM_KEY = 'drone_builder_custom_parts_v2';

function loadCustom(){
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); }
  catch { return []; }
}
function saveCustom(arr){
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
}
function customMatches(c){
  return c.size === state.size && c.style === state.style && c.video === state.video;
}
function newId(){
  return (crypto?.randomUUID)
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);
}
function deleteCustomById(id){
  const arr = loadCustom();
  saveCustom(arr.filter(x => x.id !== id));
}

// -------------------- UI helpers --------------------
function el(id){ return document.getElementById(id); }

function money(n){
  const num = Number(n);
  if(!Number.isFinite(num) || num <= 0) return ''; // hide $0.00
  return num.toLocaleString(undefined,{style:'currency',currency:'USD'});
}
function grams(g){
  const n = Number(g);
  return Number.isFinite(n) ? `${n} g` : '';
}

// crumbs (top right)
function renderCrumbs(){
  const parts = [];
  if(state.size) parts.push(`Size: ${state.size}`);
  if(state.style) parts.push(`Style: ${state.style}`);
  if(state.video) parts.push(`Video: ${state.video}`);
  const c = el('crumbs');
  if(c) c.textContent = parts.join('  •  ');
}

// One single show() (no duplicates)
function show(stepId){
  const steps = ['step-size','step-style','step-video','step-part','step-results'];
  for(const id of steps){
    const node = el(id);
    if(!node) continue;
    node.classList.toggle('hidden', id !== stepId);
  }
  renderCrumbs();
}

function tile(title, desc, onClick){
  const div = document.createElement('div');
  div.className = 'tile';
  div.innerHTML = `<div class="title">${title}</div><div class="desc">${desc}</div>`;
  div.addEventListener('click', onClick);
  return div;
}

// -------------------- DB helpers --------------------
// Supports either:
//  A) { size:'5"', style:'Freestyle', video:'Analog', part:'Frame', options:[...] }
//  B) { sizes:['5"'], styles:['Freestyle','Racing'], videos:['Analog','DJI'], part:'Frame', options:[...] }

function matchesOne(rule, selected){
  // rule can be: undefined, 'Any', string, or array
  if(rule == null) return false;
  if(rule === 'Any') return true;
  if(Array.isArray(rule)) return rule.includes(selected);
  return rule === selected;
}

function rowMatchesState(row){
  const sizesRule  = row.sizes  ?? row.size;
  const stylesRule = row.styles ?? row.style;
  const videosRule = row.videos ?? row.video;

  return (
    matchesOne(sizesRule, state.size) &&
    matchesOne(stylesRule, state.style) &&
    matchesOne(videosRule, state.video)
  );
}

function rowsForCurrentSelection(){
  return (window.PARTS_DB || []).filter(rowMatchesState);
}

function uniquePartsForSelection(){
  const rows = rowsForCurrentSelection();
  const set = new Set(rows.map(r => r.part));
  return Array.from(set);
}

// Merge DB + Custom for a part, cheapest first
function buildPartOptionsCombined(part){
  const rows = rowsForCurrentSelection().filter(r => r.part === part);

  const dbOptions = [];
  for(const row of rows){
    for(const opt of (row.options || [])){
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
    .filter(c => customMatches(c) && c.part === part)
    .map(c => ({
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
  for(const opt of [...customOptions, ...dbOptions]){
    const key = String(opt.name || '').trim().toLowerCase();
    if(!key) continue;
    if(seen.has(key)) continue;
    seen.add(key);
    merged.push(opt);
  }

  merged.sort((a,b) => (Number(a.price)||0) - (Number(b.price)||0));
  return merged;
}

// -------------------- Results rendering --------------------
function renderResults(){
  // summary pills (if present)
  const summary = el('summary');
  if(summary){
    summary.innerHTML = `
      <span class="pill"><strong>Size</strong>: ${state.size ?? ''}</span>
      <span class="pill"><strong>Style</strong>: ${state.style ?? ''}</span>
      <span class="pill"><strong>Video</strong>: ${state.video ?? ''}</span>
    `;
  }

  const container = el('idealList') || el('partsList');
  if(!container) return;
  container.innerHTML = '';

  const parts = uniquePartsForSelection();
  if(parts.length === 0){
    container.innerHTML = `<div class="sub">No parts found for this combo yet.</div>`;
    const totalEl = el('idealTotal') || el('total');
    if(totalEl) totalEl.textContent = '';
    return;
  }

  let totalPrice = 0;
  let totalWeight = 0;

  for(const part of parts){
    const opts = buildPartOptionsCombined(part);
    if(opts.length === 0) continue;

    // default pick = cheapest
    if(!state.picks[part]){
      const first = opts[0];
      state.picks[part] = {
        name: first.name,
        price: first.price || 0,
        link: first.link || '',
        weight: first.weight ?? null
      };
    }

    const picked = state.picks[part];

    totalPrice += Number(picked.price) || 0;
    if (Number.isFinite(Number(picked.weight)) && picked.weight > 0) {
      totalWeight += Number(picked.weight);
    }
    const row = document.createElement('div');
    row.className = 'row';

    const left = document.createElement('div');
    left.className = 'partName';
    left.textContent = part;

    const mid = document.createElement('div');
    const w = Number(picked.weight);
    const weightText = (Number.isFinite(w) && w > 0) ? grams(w) : '';

    const nameLine = document.createElement(picked.link ? 'a' : 'div');

    if (picked.link) {
      nameLine.href = picked.link;
      nameLine.target = '_blank';
      nameLine.rel = 'noopener';
      nameLine.className = 'optionLink';
    }

    nameLine.textContent = picked.name;
    nameLine.style.fontWeight = '700';
    nameLine.classList.add('pickedName');


    const meta = document.createElement('div');
    meta.className = 'optionMeta';
    meta.textContent = weightText;

    mid.appendChild(nameLine);
    mid.appendChild(meta);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '10px';

    const chooseBtn = document.createElement('button');
    chooseBtn.className = 'smallBtn';
    chooseBtn.textContent = 'Choose';
    chooseBtn.addEventListener('click', () => openPartPicker(part));

    const priceDiv = document.createElement('div');
    priceDiv.className = 'price';
    priceDiv.textContent = money(picked.price || 0);

    right.appendChild(chooseBtn);
    right.appendChild(priceDiv);

    row.appendChild(left);
    row.appendChild(mid);
    row.appendChild(right);

    container.appendChild(row);
  }

  // Footer totals row INSIDE the card so it looks nice + right-aligned price in price color
  const footer = document.createElement('div');
  footer.style.marginTop = '14px';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.alignItems = 'baseline';
  footer.innerHTML = `
    <div class="sub">Total weight: <b>${totalWeight ? grams(totalWeight) : 'Unknown'}</b></div>
    <div class="price" style="font-size:20px; font-weight:800;">${money(totalPrice)}</div>
  `;
  container.appendChild(footer);

}

// -------------------- Part Picker page --------------------
function openPartPicker(part){
  state.partPick = { part };



  const title = el('partTitle');
  if(title) title.textContent = `Pick ${part}`;

  const sub = el('partSub');
  if(sub) sub.textContent = `Size: ${state.size} • Style: ${state.style} • Video: ${state.video}`;

  const cn = el('customName'); if(cn) cn.value = '';
  const cl = el('customLink'); if(cl) cl.value = '';
  const cp = el('customPrice'); if(cp) cp.value = '';
  const cw = el('customWeight'); if(cw) cw.value = '';

  renderPartPickerOptions();
  show('step-part');
}

function renderPartPickerOptions(){
  const wrap = el('partOptions');
  if(!wrap) return;

  wrap.innerHTML = '';

  const part = state.partPick?.part;
  if(!part) return;

  const opts = buildPartOptionsCombined(part);

  if(opts.length === 0){
    wrap.innerHTML = `<div class="sub">No options found yet. Add entries in <b>data.js</b> or add a custom part below.</div>`;
    return;
  }

  for(const opt of opts){
    const div = document.createElement('div');
    div.className = 'optionCard';

    const weightText = Number.isFinite(Number(opt.weight)) ? grams(opt.weight) : 'Weight unknown';
    const hasLink = !!opt.link;

    const nameHtml = opt.link
      ? `<a class="optionLink" href="${opt.link}" target="_blank" rel="noopener">${opt.name}</a>`
      : `<div style="font-weight:800">${opt.name}</div>`;

    div.innerHTML = `
      <div>
        ${nameHtml}
        <div class="optionMeta">${opt.weight ? grams(opt.weight) : ''}</div>
      </div>
      <div class="price">${money(opt.price || 0)}</div>
    `;

    div.addEventListener('click', (e) => {
      // If they clicked the Open link, do NOT auto-select
      if(e.target && e.target.matches('a[data-open="1"]')) return;

      // Delete custom option
      if(e.target && e.target.matches('button[data-del="1"]')){
        e.preventDefault();
        e.stopPropagation();

        if(confirm(`Delete custom part "${opt.name}"?`)){
          deleteCustomById(opt.id);

          const current = state.picks[part];
          if(current && current.name === opt.name && (current.link || '') === (opt.link || '')){
            delete state.picks[part];
          }

          renderPartPickerOptions();
          renderResults();
        }
        return;
      }

      // Select option
      state.picks[part] = {
        name: opt.name,
        price: opt.price || 0,
        link: opt.link || '',
        weight: opt.weight ?? null
      };
      renderResults();
      show('step-results');
    });

    wrap.appendChild(div);
  }
}

// -------------------- Step renderers --------------------
function renderSizeStep(){
  const grid = el('sizeGrid');
  if(!grid) return;

  grid.innerHTML = '';
  for(const s of SIZES){
    grid.appendChild(tile(s.key, s.desc, () => {
      state.size = s.key;
      state.style = null;
      state.video = null;
      state.picks = {};
      state.partPick = null;

      const allowed = allowedStylesForSize(state.size);

      if(allowed.length === 1){
        state.style = allowed[0];
        renderVideoStep();
        show('step-video');
      } else {
        renderStyleStep();
        show('step-style');
      }
    }));
  }
}

function renderStyleStep(){
  const grid = el('styleGrid');
  if(!grid) return;

  grid.innerHTML = '';
  const allowed = allowedStylesForSize(state.size);

  for(const st of allowed){
    const desc =
      (st === 'Freestyle') ? 'General ripping / tricks' :
      (st === 'Racing') ? 'Fast & light' :
      (st === 'Long Range') ? 'Efficiency / distance' :
      'Smooth footage / stability';

    grid.appendChild(tile(st, desc, () => {
      state.style = st;
      state.video = null;
      state.picks = {};
      state.partPick = null;

      renderVideoStep();
      show('step-video');
    }));
  }
}

function renderVideoStep(){
  const grid = el('videoGrid');
  if(!grid) return;

  grid.innerHTML = '';
  for(const v of VIDEO_SYSTEMS){
    grid.appendChild(tile(v.key, v.desc, () => {
      state.video = v.key;
      state.picks = {};
      state.partPick = null;

      renderResults();
      show('step-results');
    }));
  }
}

// -------------------- Buttons --------------------
const backToSize = el('backToSize');
if(backToSize){
  backToSize.addEventListener('click', () => {
    state.size = null;
    state.style = null;
    state.video = null;
    state.picks = {};
    state.partPick = null;
    show('step-size');
  });
}

const backToStyle = el('backToStyle');
if(backToStyle){
  backToStyle.addEventListener('click', () => {
    // from video -> style (or size if style was auto-skipped)
    state.video = null;
    state.picks = {};
    state.partPick = null;

    const allowed = allowedStylesForSize(state.size);
    if(allowed.length === 1){
      state.size = null;
      state.style = null;
      show('step-size');
    } else {
      show('step-style');
    }
  });
}

const backToVideo = el('backToVideo');
if(backToVideo){
  backToVideo.addEventListener('click', () => {
    // from results -> video
    state.video = null;
    state.picks = {};
    state.partPick = null;
    show('step-video');
  });
}

const restart = el('restart');
if(restart){
  restart.addEventListener('click', () => {
    state.size = null;
    state.style = null;
    state.video = null;
    state.picks = {};
    state.partPick = null;
    show('step-size');
  });
}

// Part Picker buttons
const cancelPartPick = el('cancelPartPick');
if(cancelPartPick){
  cancelPartPick.addEventListener('click', () => show('step-results'));
}

const addCustom = el('addCustom');
if(addCustom){
  addCustom.addEventListener('click', () => {
    const part = state.partPick?.part;
    if(!part) return;

    const name = (el('customName')?.value || '').trim();
    const link = (el('customLink')?.value || '').trim();
    const priceRaw = (el('customPrice')?.value || '').trim();
    const weightRaw = (el('customWeight')?.value || '').trim();

    const price = Number(priceRaw);
    const weight = (weightRaw === '') ? null : Number(weightRaw);

    if(!name || !Number.isFinite(price)){
      alert('Please enter a Title and a valid Price (number).');
      return;
    }
    if(link && !/^https?:\/\//i.test(link)){
      alert('Link must start with http:// or https://');
      return;
    }
    if(weightRaw !== '' && !Number.isFinite(weight)){
      alert('Weight must be a number (grams) or left blank.');
      return;
    }

    const custom = loadCustom();
    custom.unshift({
      id: newId(),
      size: state.size,
      style: state.style,
      video: state.video,
      part,
      name,
      link,
      price,
      weight
    });
    saveCustom(custom);

    // auto-select
    state.picks[part] = { name, link, price, weight };
    renderResults();
    show('step-results');
  });
}

// -------------------- Boot --------------------
renderSizeStep();
show('step-size');

