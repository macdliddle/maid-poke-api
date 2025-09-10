// Gen 1 max (151 pokemon, the generation I grew up with)
export const POKE_GEN_MAX = 151;

// number of pairs (duplicated later)
export const PAIR_COUNT = 8;

// unique random IDs in range 1..max
export function randomIds(n, max = POKE_GEN_MAX) {
  const ids = new Set();
  while (ids.size < n) {
    ids.add(1 + Math.floor(Math.random() * max));
  }
  return [...ids];
}

// fetch one Pokémon (prefer official artwork, fallback to sprite/number)
// retry once on failure
export async function fetchPokemon(id) {
  const url = `https://pokeapi.co/api/v2/pokemon/${id}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const img =
        data.sprites?.other?.['official-artwork']?.front_default ||
        data.sprites?.front_default ||
        null;

      // preload image for smoother flips
      if (img) {
        const pre = new Image();
        pre.src = img;
      }

      return { id, name: data.name, img };
    } catch (err) {
      if (attempt === 0) continue;
      console.warn(`fetchPokemon: fallback to number label for ${id}`, err);
    }
  }

  // final fallback - numeric label only
  return { id, name: String(id), img: null };
}

// fetch base deck (8 Pokémon), cache in sessionStorage
export async function fetchDeckBase() {
  const CACHE_KEY = 'deck-base';

  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // ignore cache errors
  }

  const ids = randomIds(PAIR_COUNT);
  const pokes = await Promise.all(ids.map((id) => fetchPokemon(id)));

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(pokes));
  } catch {
    // ignore cache write errors
  }

  return pokes;
}
