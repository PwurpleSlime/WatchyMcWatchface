const CACHE_PREFIX = 'watchymcwatchface:api-cache:';
const CACHE_TTL = 24 * 60 * 60 * 1000;

export function getApiBase() {
  return document.querySelector('#apiBase').value.trim().replace(/\/+$/, '');
}

function cacheKey(path, name) {
  return `${CACHE_PREFIX}${getApiBase()}${path}?name=${encodeURIComponent(name)}`;
}

function showCacheStatus(message) {
  document.querySelector('#cacheStatus').textContent = message;
}

function readCachedResponse(key) {
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return { hit: false };

    const entry = JSON.parse(stored);
    if (
      !entry ||
      typeof entry.savedAt !== 'number' ||
      !Object.prototype.hasOwnProperty.call(entry, 'data')
    ) {
      localStorage.removeItem(key);
      return { hit: false };
    }

    const expired = Date.now() - entry.savedAt >= CACHE_TTL;
    return { hit: !expired, staleData: entry.data };
  } catch (error) {
    console.error('Unable to read the saved movie data cache.', error);
    showCacheStatus('Local cache unavailable; results will be fetched from the API.');
    return { hit: false };
  }
}

function saveCachedResponse(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch (error) {
    console.error('Unable to save movie data to the local cache.', error);
    showCacheStatus('Could not save movie data locally; API results are still available.');
  }
}

export function clearApiCache() {
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
    showCacheStatus('Saved movie data cleared.');
  } catch (error) {
    console.error('Unable to clear the saved movie data cache.', error);
    showCacheStatus('Could not clear saved movie data. See the browser console for details.');
  }
}

async function api(path, name) {
  const key = cacheKey(path, name);
  const cached = readCachedResponse(key);
  if (cached.hit) return cached.staleData;

  try {
    const response = await fetch(`${getApiBase()}${path}?name=${encodeURIComponent(name)}`);
    if (!response.ok) {
      const error = new Error(response.status);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    saveCachedResponse(key, data);
    return data;
  } catch (error) {
    if (
      Object.prototype.hasOwnProperty.call(cached, 'staleData') &&
      (!error.status || error.status >= 500)
    ) {
      error.cachedData = cached.staleData;
    }
    throw error;
  }
}

export function searchForItem(name) {
  return api('/searchForItem', name);
}

export function getItemInformation(name) {
  return api('/getItemInformation', name);
}
