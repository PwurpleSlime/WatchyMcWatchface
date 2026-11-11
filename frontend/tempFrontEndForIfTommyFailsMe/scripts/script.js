// ISSUE: Native live-color picker prompts reopen when selecting the same option instead of closing.
import { getApiBase, getItemInformation, searchForItem, clearApiCache } from './api.js';
import { initializeCustomization } from './customization.js';

const $ = (selector) => document.querySelector(selector);
const view = $('#view');
const root = document.documentElement;
const dog = (id, width = 300, height = 300) =>
  `https://placedog.net/${width}/${height}?id=${id}`;
const ABOUT_SHOWN_KEY = 'watchymcwatchface:about-shown';

const toggle = (selector, force) => {
  const panel = $(selector);
  if (force === undefined) {
    panel.classList.toggle('open');
  } else {
    panel.classList.toggle('open', force);
  }
};

$('#filterBtn').onclick = () => toggle('#filters');
$('#aboutBtn').onclick = () => toggle('#about', true);
$('#closeAbout').onclick = () => toggle('#about', false);
$('#about').onclick = (event) => {
  if (event.target.id === 'about') toggle('#about', false);
};

addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    toggle('#about', false);
    toggle('#filters', false);
    toggle('#colors', false);
  }
});

const services = new Set([
  'Netflix',
  'Hulu',
  'Disney+',
  'Max',
  'Prime Video',
  'fuboTV',
  'Crunchyroll',
]);
const active = new Set();

function drawServices() {
  const serviceList = $('#svcList');
  serviceList.innerHTML = '';

  services.forEach((service) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = active.has(service);
    checkbox.onchange = () => {
      if (checkbox.checked) {
        active.add(service);
      } else {
        active.delete(service);
      }
      rerun();
    };
    label.append(service, checkbox);
    serviceList.append(label);
  });
}

$('#svcOther').onkeydown = (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();

  const service = event.target.value.trim();
  if (!service) return;

  services.add(service);
  active.add(service);
  event.target.value = '';
  drawServices();
  rerun();
};

$('#clearF').onclick = () => {
  active.clear();
  drawServices();
  rerun();
};

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>\"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[character]);

const SAMPLE = {
  'Recently Popular': [
    'Planes, Trains and Automobiles',
    'Watch Dogs',
    'Home for the Holidays',
    'Hotel Transylvania',
    'Pieces of April',
    'Isle of Dogs',
  ],
  'Staff Recommendation': [
    'Dutch',
    'Up',
    'A Charlie Brown Thanksgiving',
    'Cowboy Bebop',
  ],
  Comedy: [
    'Planes, Trains and Automobiles',
    'Groundhog Day',
    'Dutch',
    'Ghostbusters',
    'The Princess Bride',
  ],
  Drama: [
    'Home for the Holidays',
    'The Shawshank Redemption',
    'Pieces of April',
    'Little Women',
    'The Truman Show',
  ],
  Family: [
    'A Charlie Brown Thanksgiving',
    'The Iron Giant',
    'The Parent Trap',
    'The Sandlot',
  ],
};

const SUPPORTED_MOVIES = new Set([
  'Planes, Trains and Automobiles',
  'Home for the Holidays',
  'Pieces of April',
  'Dutch',
  'A Charlie Brown Thanksgiving',
]);

function showHome() {
  let imageId = 1;
  view.innerHTML = Object.entries(SAMPLE)
    .map(
      ([heading, titles]) =>
        `<h2>${heading}</h2><div class="row">${titles
          .map((title) => {
            const isSupported = SUPPORTED_MOVIES.has(title);
            const unavailableClass = isSupported ? '' : ' unavailable';
            const status = isSupported ? '' : ' Not yet available.';
            const unavailableBanner = isSupported
              ? ''
              : '<span class="availability-banner" aria-hidden="true">Not yet available</span>';
            const disabledAttribute = isSupported ? '' : ' disabled';

            return `<button class="tile${unavailableClass}" data-name="${escapeHtml(title)}" aria-label="${escapeHtml(title + status)}" title="${escapeHtml(title + status)}"${disabledAttribute}><img src="${dog(imageId++)}" alt="" loading="lazy"><span>${escapeHtml(title)}</span>${unavailableBanner}</button>`;
          })
          .join('')}</div>`
    )
    .join('');

  view.querySelectorAll('.tile:not(:disabled)').forEach((button) => {
    button.onclick = () => showItem(button.dataset.name);
  });
}

let lastQuery = '';

async function runSearch(query) {
  lastQuery = query;
  query = query.trim();

  if (query.length < 3) {
    view.innerHTML = '<p class="note err">Type at least 3 characters to search.</p>';
    return;
  }

  view.innerHTML = '<p class="note">Searching…</p>';

  let results;
  let note = '';

  try {
    results = await searchForItem(query);
  } catch (error) {
    if (error.status === 400) {
      view.innerHTML = '<p class="note err">Type at least 3 characters to search.</p>';
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(error, 'cachedData')) {
      view.innerHTML = `<p class="note err">The webpage failed to reach the server at ${escapeHtml(getApiBase())}.</p>`;
      return;
    }

    results = error.cachedData;
    note = `<p class="note err">The webpage failed to reach the server at ${escapeHtml(getApiBase())}. Showing saved results.</p>`;
  }

  if (active.size) {
    const itemDetails = await Promise.all(
      results.map((result) => getItemInformation(result.name).catch(() => null))
    );
    results = results.filter(
      (result, index) =>
        itemDetails[index] &&
        (itemDetails[index].services || []).some((service) => active.has(service.serviceName))
    );
    note += `<p class="note">Showing titles on: ${[...active]
      .map((service) => `<span class="pill">${escapeHtml(service)}</span>`)
      .join('')}</p>`;
  }

  if (!results.length) {
    view.innerHTML = note + '<p class="note">No matches. Try a different name or clear your subscription filters.</p>';
    return;
  }

  view.innerHTML = `${note}<h2>Results</h2><div class="row">${results
    .map(
      (result, index) =>
        `<button class="tile" data-name="${escapeHtml(result.name)}"><img src="${escapeHtml(result.imgURL) || dog(index + 20)}" alt="" onerror="this.src='${dog(index + 20)}'"><span>${escapeHtml(result.name)}</span></button>`
    )
    .join('')}</div>`;

  view.querySelectorAll('.tile').forEach((button) => {
    button.onclick = () => showItem(button.dataset.name);
  });
}

async function showItem(name) {
  view.innerHTML = '<p class="note">Loading…</p>';

  let item;
  let note = '';

  try {
    item = await getItemInformation(name);
  } catch (error) {
    if (Object.prototype.hasOwnProperty.call(error, 'cachedData')) {
      item = error.cachedData;
      note = `<p class="note err">The webpage failed to reach the server at ${escapeHtml(getApiBase())}. Showing saved information.</p>`;
    } else if (error.status === 404) {
      view.innerHTML = '<p class="note err">No title found with that name.</p>';
      return;
    } else {
      view.innerHTML = `<p class="note err">The webpage failed to reach the server at ${escapeHtml(getApiBase())}.</p>`;
      return;
    }
  }

  const titleServices = item.services || [];
  const uniqueLanguages = (key) => [
    ...new Set(titleServices.flatMap((service) => service[key] || [])),
  ];
  const renderPills = (values) =>
    values.length
      ? values.map((value) => `<span class="pill">${escapeHtml(value)}</span>`).join('')
      : 'None listed';

  view.innerHTML = `${note}<button class="linkbtn back" id="back">&larr; Back</button>
  <div class="detail"><dl>
    <div><dt>Movie Name</dt><dd>${escapeHtml(item.name)}</dd></div>
    <div><dt>Synopsis</dt><dd>${escapeHtml(item.synopsis)}</dd></div>
    <div><dt>Genre</dt><dd>${escapeHtml(item.genre)}</dd></div>
    <div><dt>Hosted On</dt><dd>${renderPills(titleServices.map((service) => service.serviceName))}</dd></div>
    <div><dt>Languages (Dub)</dt><dd>${renderPills(uniqueLanguages('DUB'))}</dd></div>
    <div><dt>Languages (Sub)</dt><dd>${renderPills(uniqueLanguages('SUB'))}</dd></div>
  </dl><div class="thumb"><img src="${escapeHtml(item.imgURL) || dog(7, 400, 320)}" alt="${escapeHtml(item.name)} thumbnail" onerror="this.src='${dog(7, 400, 320)}'"></div></div>`;

  $('#back').onclick = () => (lastQuery ? runSearch(lastQuery) : showHome());
}

function rerun() {
  const hasResults = view.querySelector('.row');
  const hasDemoImage = view.querySelector('.tile img[src*="placedog"]:not([onerror])');
  if (hasResults && lastQuery && !hasDemoImage) runSearch(lastQuery);
}

$('#searchForm').onsubmit = (event) => {
  event.preventDefault();
  runSearch($('#q').value);
};

$('#home').onclick = () => {
  lastQuery = '';
  $('#q').value = '';
  showHome();
};

initializeCustomization({ clearApiCache });
drawServices();
showHome();

try {
  if (localStorage.getItem(ABOUT_SHOWN_KEY) !== 'true') {
    localStorage.setItem(ABOUT_SHOWN_KEY, 'true');
    toggle('#about', true);
  }
} catch (error) {
  console.error('Unable to check whether the About popup was previously shown.', error);
  toggle('#about', true);
}
