const REGISTRY_URL = '/script-registry.json';

let registryCache = null;

export async function loadScriptRegistry(url = REGISTRY_URL) {
  if (registryCache) return registryCache;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load IvritCode script registry (${response.status})`);
  }

  const registry = await response.json();
  validateRegistry(registry);
  registryCache = registry;
  return registry;
}

export function validateRegistry(registry) {
  if (!registry || registry.schema !== 'ivritcode.script-registry') {
    throw new Error('Invalid IvritCode script registry schema.');
  }
  if (!Array.isArray(registry.letters) || registry.letters.length !== 22) {
    throw new Error('IvritCode registry must contain exactly 22 canonical Hebrew letters.');
  }
  return true;
}

export function findLetter(registry, token) {
  if (!registry || !token) return null;
  const normalized = String(token).toUpperCase();
  return registry.letters.find(letter => letter.machine_token === normalized) ?? null;
}

export function renderLetter(letter, script = 'MODERN', { finalForm = false } = {}) {
  if (!letter?.representations) return '';
  const form = letter.representations[String(script).toUpperCase()] ?? letter.representations.MODERN;
  if (!form) return '';
  if (finalForm && form.final_glyph) return form.final_glyph;
  return form.glyph ?? form.authoring_tag ?? form.glyph_id ?? '';
}

export function availableScripts(letter) {
  if (!letter?.representations) return [];
  return Object.entries(letter.representations).map(([id, form]) => ({ id, ...form }));
}
