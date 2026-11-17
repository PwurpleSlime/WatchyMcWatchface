const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const dotCanvas = $('#dotCanvas');
const dotContext = dotCanvas.getContext('2d');
const dotStrength = $('#dotStrength');
const dotMode = $('#dotMode');
const dotColor = $('#dotColor');
const gradientAngle = $('#gradientAngle');
const darkMode = $('#darkMode');

const LIGHT_PRESETS = {
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

const DARK_PRESETS = {
  classic: {
    '--header': '#263746',
    '--bg': '#151d25',
    '--logo': '#426b91',
    '--tile': '#2d3945',
    '--ink': '#f1f5f9',
    '--field': '#273440',
    '--panel': '#202d38',
    '--side': '#1b2935',
  },
  whimsical: {
    '--header': '#713a56',
    '--bg': '#211b2e',
    '--logo': '#8067d8',
    '--tile': '#40334e',
    '--ink': '#fff0f8',
    '--field': '#352b42',
    '--panel': '#2c3c39',
    '--side': '#493b78',
  },
};

const COLOR_LABELS = {
  '--header': 'Header / gradient start',
  '--bg': 'Background',
  '--logo': 'Logo / gradient end',
  '--tile': 'Tiles',
  '--ink': 'Text',
  '--field': 'Inputs',
  '--panel': 'Popups',
  '--side': 'About sidebar',
};

let pointerX = -1;
let pointerY = -1;
let dotFrame = 0;

function drawDots() {
  if (root.dataset.theme !== 'whimsical' || !dotContext) return;

  const spacing = 48;
  const radius = 4;
  const attractionRange = 190;
  const maxShift = Number(dotStrength.value);
  const direction = dotMode.value === 'repel' ? -1 : 1;

  dotContext.clearRect(0, 0, innerWidth, innerHeight);
  dotContext.fillStyle = dotColor.value;
  dotContext.globalAlpha = 0.5;

  for (let x = 20; x < innerWidth; x += spacing) {
    for (let y = 20; y < innerHeight; y += spacing) {
      let dotX = x;
      let dotY = y;

      if (!reduceMotion.matches && pointerX >= 0) {
        const dx = pointerX - x;
        const dy = pointerY - y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0 && distance < attractionRange) {
          const influence = (1 - distance / attractionRange) ** 2;
          const shift = maxShift * influence;
          dotX += (dx / distance) * shift * direction;
          dotY += (dy / distance) * shift * direction;
        }
      }

      dotContext.beginPath();
      dotContext.arc(dotX, dotY, radius, 0, Math.PI * 2);
      dotContext.fill();
    }
  }
  dotContext.globalAlpha = 1;
}

function resizeDotCanvas() {
  if (!dotContext) return;

  const pixelRatio = window.devicePixelRatio || 1;
  dotCanvas.width = Math.round(innerWidth * pixelRatio);
  dotCanvas.height = Math.round(innerHeight * pixelRatio);
  dotContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  drawDots();
}

function scheduleDotDraw() {
  if (dotFrame) return;
  dotFrame = requestAnimationFrame(() => {
    dotFrame = 0;
    drawDots();
  });
}

function buildColorPickers() {
  const pickers = $('#pickers');
  pickers.innerHTML = '';

  Object.keys(COLOR_LABELS).forEach((property) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'color';
    input.value = getComputedStyle(root).getPropertyValue(property).trim();
    input.oninput = () => root.style.setProperty(property, input.value);
    label.append(COLOR_LABELS[property], input);
    pickers.append(label);
  });
}

function applyPreset(name) {
  root.dataset.theme = name;
  root.dataset.mode = darkMode.checked ? 'dark' : 'light';
  $('#themeSel').value = name;

  const preset = darkMode.checked ? DARK_PRESETS[name] : LIGHT_PRESETS[name];
  Object.entries(preset).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  drawDots();
  buildColorPickers();
}

function togglePanel(selector) {
  $(selector).classList.toggle('open');
}

export function initializeCustomization({ clearApiCache }) {
  addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    scheduleDotDraw();
  });

  addEventListener('resize', resizeDotCanvas);
  reduceMotion.addEventListener('change', scheduleDotDraw);

  gradientAngle.addEventListener('input', () => {
    $('#gradientAngleValue').value = `${gradientAngle.value}°`;
    root.style.setProperty('--whimsical-gradient-angle', `${gradientAngle.value}deg`);
  });
  dotStrength.addEventListener('input', () => {
    $('#dotStrengthValue').value = `${dotStrength.value} px`;
    scheduleDotDraw();
  });
  dotColor.addEventListener('input', scheduleDotDraw);
  dotMode.addEventListener('change', scheduleDotDraw);

  $('#themeSel').onchange = (event) => applyPreset(event.target.value);
  darkMode.onchange = () => applyPreset(root.dataset.theme || 'classic');
  $('#resetC').onclick = () => applyPreset(root.dataset.theme || 'classic');
  $('#clearCache').onclick = clearApiCache;
  $('#fab').onclick = () => togglePanel('#colors');

  resizeDotCanvas();
  applyPreset('classic');
}
