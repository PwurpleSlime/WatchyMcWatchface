import {
  clearApiCache,
  createApiCacheKey,
  readCachedResponse,
  saveCachedResponse,
} from './storage.js';

export function getApiBase() {
  return document.querySelector('#apiBase').value.trim().replace(/\/+$/, '');
}

export { clearApiCache };

async function api(path, name) {
  const key = createApiCacheKey(getApiBase(), path, name);
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
