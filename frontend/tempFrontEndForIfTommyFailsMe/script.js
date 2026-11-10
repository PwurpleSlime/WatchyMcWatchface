const $ = (s) => document.querySelector(s);
const view = $('#view');
const root = document.documentElement;
const dog = (id, w = 300, h = 300) => `https://placedog.net/${w}/${h}?id=${id}`;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

addEventListener('pointermove', (event) => {
  if (root.dataset.theme !== 'whimsical' || event.pointerType !== 'mouse' || reduceMotion.matches) {
    return;
  }

  const offsetX = ((event.clientX / innerWidth) - 0.5) * 24;
  const offsetY = ((event.clientY / innerHeight) - 0.5) * 24;
  root.style.setProperty('--dot-offset-x', `${offsetX}px`);
  root.style.setProperty('--dot-offset-y', `${offsetY}px`);
});

const PRESETS = {
  classic: {
    '--header': '#566f7b',
    '--bg': '#c5d6de',
    '--logo': '#2f5f86',
    '--tile': '#d9d9d9',
    '--ink': '#111111',
    '--field': '#dfe8f0',
    '--panel': '#c5d6de',
    '--side': '#566f7b',
  },
  whimsical: {
    '--header': '#ff8fb1',
    '--bg': '#fff1c9',
    '--logo': '#7b5cff',
    '--tile': '#ffd6e8',
    '--ink': '#2b1b4d',
    '--field': '#ffffff',
    '--panel': '#d8f5e9',
    '--side': '#7b5cff',
  },
};

const LABELS = {
  '--header': 'Header',
  '--bg': 'Background',
  '--logo': 'Logo pill',
  '--tile': 'Tiles',
  '--ink': 'Text',
  '--field': 'Inputs',
  '--panel': 'Popups',
  '--side': 'About sidebar',
};

function applyPreset(name) {
  root.dataset.theme = name;
  $('#themeSel').value = name;
  Object.entries(PRESETS[name]).forEach(([k, v]) => root.style.setProperty(k, v));
  buildPickers();
}

function buildPickers() {
  $('#pickers').innerHTML = '';
  Object.keys(LABELS).forEach((k) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'color';
    input.value = getComputedStyle(root).getPropertyValue(k).trim();
    input.oninput = () => root.style.setProperty(k, input.value);
    label.append(LABELS[k], input);
    $('#pickers').append(label);
  });
}

$('#themeSel').onchange = (e) => applyPreset(e.target.value);
$('#resetC').onclick = () => applyPreset(root.dataset.theme || 'classic');

const toggle = (id, force) => $(id).classList.toggle('open', force);
$('#fab').onclick = () => toggle('#colors');
$('#filterBtn').onclick = () => toggle('#filters');
$('#aboutBtn').onclick = () => toggle('#about', true);
$('#closeAbout').onclick = () => toggle('#about', false);
$('#about').onclick = (e) => {
  if (e.target.id === 'about') toggle('#about', false);
};

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    toggle('#about', false);
    toggle('#filters', false);
    toggle('#colors', false);
  }
});

const services = new Set();
const active = new Set();
['Netflix', 'Hulu', 'Disney+', 'Max', 'Prime Video', 'fuboTV', 'Crunchyroll'].forEach((s) => services.add(s));

function drawServices() {
  $('#svcList').innerHTML = '';
  services.forEach((s) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = active.has(s);
    checkbox.onchange = () => {
      if (checkbox.checked) {
        active.add(s);
      } else {
        active.delete(s);
      }
      rerun();
    };
    label.append(s, checkbox);
    $('#svcList').append(label);
  });
}

$('#svcOther').onkeydown = (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const v = e.target.value.trim();
  if (v) {
    services.add(v);
    active.add(v);
    e.target.value = '';
    drawServices();
    rerun();
  }
};

$('#clearF').onclick = () => {
  active.clear();
  drawServices();
  rerun();
};

const base = () => $('#apiBase').value.trim().replace(/\/+$/, '');

async function api(path, name) {
  const res = await fetch(`${base()}${path}?name=${encodeURIComponent(name)}`);
  if (!res.ok) {
    const e = new Error(res.status);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

const searchForItem = (n) => api('/searchForItem', n);
const getItemInformation = (n) => api('/getItemInformation', n);

const demoItem = (name) => ({
  id: 'demo',
  name,
  imgURL: '',
  synopsis: 'Demo data: start your Nest server and set the API URL in the 🎨 panel.',
  genre: 'Comedy',
  services: [
    { serviceName: 'fuboTV', DUB: ['English', 'Spanish'], SUB: ['English', 'French'] },
    { serviceName: 'Netflix', DUB: ['English'], SUB: ['German'] },
  ],
});

const esc = (s) =>
  String(s ?? '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SAMPLE = {
  'Recently Popular': ['Planes Trains and Automobiles', 'Watch Dogs', 'Hotel Transylvania', 'Isle of Dogs', 'Up', 'Cowboy Bebop'],
  'Staff Recommendation': ['Lady and the Tramp', 'Beethoven', 'Marley and Me', 'Bolt', 'Turner and Hooch', 'Hachi'],
};

function showHome() {
  let n = 1;
  view.innerHTML = Object.entries(SAMPLE)
    .map(
      ([h, names]) =>
        `<h2>${h}</h2><div class="row">${names
          .map(
            (t) =>
              `<button class="tile" data-name="${esc(t)}" aria-label="${esc(t)}"><img src="${dog(n++)}" alt="" loading="lazy"><span>${esc(t)}</span></button>`
          )
          .join('')}</div>`
    )
    .join('');
  view.querySelectorAll('.tile').forEach((b) => {
    b.onclick = () => showItem(b.dataset.name);
  });
}

let lastQuery = '';

async function runSearch(q) {
  lastQuery = q;
  q = q.trim();

  if (q.length < 3) {
    view.innerHTML = '<p class="note err">Type at least 3 characters to search.</p>';
    return;
  }

  view.innerHTML = '<p class="note">Searching…</p>';

  let results;
  let note = '';

  try {
    results = await searchForItem(q);
  } catch (e) {
    if (e.status === 400) {
      view.innerHTML = '<p class="note err">Type at least 3 characters to search.</p>';
      return;
    }
    results = [{ name: q, imgURL: '' }];
    note = `<p class="note err">Couldn't reach the API at ${esc(base())} (${esc(e.message)}). Showing demo data.</p>`;
  }

  if (active.size && !note) {
    const infos = await Promise.all(results.map((r) => getItemInformation(r.name).catch(() => null)));
    results = results.filter((r, i) => infos[i] && (infos[i].services || []).some((s) => active.has(s.serviceName)));
    note = `<p class="note">Showing titles on: ${[...active].map((s) => `<span class="pill">${esc(s)}</span>`).join('')}</p>`;
  }

  if (!results.length) {
    view.innerHTML = note + '<p class="note">No matches. Try a different name or clear your subscription filters.</p>';
    return;
  }

  view.innerHTML = `${note}<h2>Results</h2><div class="row">${results
    .map(
      (r, i) =>
        `<button class="tile" data-name="${esc(r.name)}"><img src="${esc(r.imgURL) || dog(i + 20)}" alt="" onerror="this.src='${dog(i + 20)}'"><span>${esc(r.name)}</span></button>`
    )
    .join('')}</div>`;

  view.querySelectorAll('.tile').forEach((b) => {
    b.onclick = () => showItem(b.dataset.name);
  });
}

async function showItem(name) {
  view.innerHTML = '<p class="note">Loading…</p>';

  let item;
  let note = '';

  try {
    item = await getItemInformation(name);
  } catch (e) {
    if (e.status === 404) {
      view.innerHTML = '<p class="note err">No title found with that name.</p>';
      return;
    }
    item = demoItem(name);
    note = `<p class="note err">Couldn't reach the API at ${esc(base())}. Showing demo data.</p>`;
  }

  const svc = item.services || [];
  const uniq = (k) => [...new Set(svc.flatMap((s) => s[k] || []))];
  const pills = (a) => (a.length ? a.map((x) => `<span class="pill">${esc(x)}</span>`).join('') : 'None listed');

  view.innerHTML = `${note}<button class="linkbtn back" id="back">&larr; Back</button>
  <div class="detail"><dl>
    <div><dt>Movie Name</dt><dd>${esc(item.name)}</dd></div>
    <div><dt>Synopsis</dt><dd>${esc(item.synopsis)}</dd></div>
    <div><dt>Genre</dt><dd>${esc(item.genre)}</dd></div>
    <div><dt>Hosted On</dt><dd>${pills(svc.map((s) => s.serviceName))}</dd></div>
    <div><dt>Languages (Dub)</dt><dd>${pills(uniq('DUB'))}</dd></div>
    <div><dt>Languages (Sub)</dt><dd>${pills(uniq('SUB'))}</dd></div>
  </dl><div class="thumb"><img src="${esc(item.imgURL) || dog(7, 400, 320)}" alt="${esc(item.name)} thumbnail" onerror="this.src='${dog(7, 400, 320)}'"></div></div>`;

  $('#back').onclick = () => (lastQuery ? runSearch(lastQuery) : showHome());
}

const rerun = () => {
  if (view.querySelector('.row') && lastQuery && !view.querySelector('.tile img[src*="placedog"]:not([onerror])')) {
    runSearch(lastQuery);
  }
};

$('#searchForm').onsubmit = (e) => {
  e.preventDefault();
  runSearch($('#q').value);
};

$('#home').onclick = () => {
  lastQuery = '';
  $('#q').value = '';
  showHome();
};

applyPreset('classic');
drawServices();
showHome();
toggle('#about', true);
