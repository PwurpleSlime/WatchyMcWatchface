const CACHE_PREFIX = 'watchymcwatchface:api-cache:';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const ABOUT_SHOWN_KEY = 'watchymcwatchface:about-shown';

function showCacheStatus(message) {
  document.querySelector('#cacheStatus').textContent = message;
}

export function createApiCacheKey(apiBase, path, name) {
  return `${CACHE_PREFIX}${apiBase}${path}?name=${encodeURIComponent(name)}`;
}

export function readCachedResponse(key) {
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

export function saveCachedResponse(key, data) {
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

export function shouldShowAboutPopup() {
  try {
    if (localStorage.getItem(ABOUT_SHOWN_KEY) === 'true') return false;
    localStorage.setItem(ABOUT_SHOWN_KEY, 'true');
    return true;
  } catch (error) {
    console.error('Unable to check whether the About popup was previously shown.', error);
    return true;
  }
}
