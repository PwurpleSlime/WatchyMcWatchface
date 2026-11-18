const $ = (selector) => document.querySelector(selector);

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

function getEditDistance(left, right, maxDistance) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost
      );
      current.push(distance);
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }
    previous = current;
  }

  return previous[right.length];
}

export function matchesServiceFilter(serviceName, filter) {
  const service = String(serviceName ?? '').toLowerCase();
  const query = String(filter ?? '').trim().toLowerCase();
  if (!service || !query) return false;
  if (service.includes(query)) return true;
  if (query.length < 4) return false;

  const maxDistance = 2;
  const minWindowLength = Math.max(1, query.length - maxDistance);
  const maxWindowLength = Math.min(service.length, query.length + maxDistance);

  for (let start = 0; start < service.length; start += 1) {
    for (
      let length = minWindowLength;
      length <= maxWindowLength && start + length <= service.length;
      length += 1
    ) {
      if (
        getEditDistance(
          query,
          service.slice(start, start + length),
          maxDistance
        ) <= maxDistance
      ) {
        return true;
      }
    }
  }

  return false;
}

export function initializeFilterMenu(onChange) {
  const drawServices = () => {
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
        onChange();
      };
      label.append(service, checkbox);
      serviceList.append(label);
    });
  };

  const setFilterMenuOpen = (open) => {
    $('#filters').classList.toggle('open', open);
  };

  $('#filterBtn').onclick = () => {
    $('#filters').classList.toggle('open');
  };
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('#filters, #filterBtn')) return;
    setFilterMenuOpen(false);
  });
  $('#svcOther').onkeydown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const service = event.target.value.trim();
    if (!service) return;

    services.add(service);
    active.add(service);
    event.target.value = '';
    drawServices();
    onChange();
  };
  $('#clearF').onclick = () => {
    active.clear();
    drawServices();
    onChange();
  };
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setFilterMenuOpen(false);
  });

  drawServices();
  return () => [...active];
}
