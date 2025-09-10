import { useState, useRef, useEffect } from 'react';
import { fetchDeckBase } from '../api/pokeapi';

// max strikes before game ends (7th fails)
const MAX_STRIKES = 6;

// Fisher–Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// make deck: duplicate each Pokémon, add flags
function buildDeck(base) {
  const pairs = base.flatMap((poke) => [
    {
      uid: `${poke.id}-a`,
      key: poke.id,
      label: poke.name,
      img: poke.img,
      revealed: false,
      matched: false,
      fading: false,
      selected: false,
      mismatch: false,
    },
    {
      uid: `${poke.id}-b`,
      key: poke.id,
      label: poke.name,
      img: poke.img,
      revealed: false,
      matched: false,
      fading: false,
      selected: false,
      mismatch: false,
    },
  ]);
  return shuffle(pairs);
}

// wait until flip animation finishes
function waitForFlip(index, flipMs = 400) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelectorAll('.card .card-inner')[index];
        if (!el) return resolve();
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            resolve();
          }
        }, flipMs + 100);
        const onEnd = (e) => {
          if (e.propertyName !== 'transform') return;
          if (done) return;
          done = true;
          clearTimeout(timer);
          el.removeEventListener('transitionend', onEnd);
          resolve();
        };
        el.addEventListener('transitionend', onEnd, { once: true });
      });
    });
  });
}

export default function useGame() {
  // deck state + ref (for sync reads in timeouts)
  const [deck, setDeck] = useState([]);
  const deckRef = useRef(deck);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  // counters
  const [moves, setMoves] = useState(0);
  const [strikes, setStrikes] = useState(0);

  // overlay/game result
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  // selection state
  const [phase, setPhase] = useState('idle');
  const [firstIndex, setFirstIndex] = useState(null);
  const [secondIndex, setSecondIndex] = useState(null);

  // input lock during resolution
  const resolvingRef = useRef(false);

  // motion prefs (shorter times if reduce-motion)
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const HIGHLIGHT_MS = prefersReducedMotion ? 0 : 1000;
  const FADE_MS = prefersReducedMotion ? 0 : 1000;
  const FLIP_MS = prefersReducedMotion ? 0 : 400;

  const reveal = async (index) => {
    console.debug('reveal', { phase, firstIndex, secondIndex, index });
    if (gameOver || resolvingRef.current) return;

    const card = deckRef.current[index];
    if (card.matched || card.revealed) return;

    if (phase === 'idle') {
      setDeck((prev) => {
        const next = prev.slice();
        next[index] = { ...next[index], revealed: true, selected: true };
        return next;
      });
      setFirstIndex(index);
      setPhase('firstSelected');
    } else if (phase === 'firstSelected') {
      if (index === firstIndex) return;

      setDeck((prev) => {
        const next = prev.slice();
        next[index] = { ...next[index], revealed: true };
        return next;
      });

      const fi = firstIndex;
      const si = index;
      setSecondIndex(si);
      setPhase('resolving');
      resolvingRef.current = true;

      // wait for flip before resolving
      await waitForFlip(si, FLIP_MS);
      resolvePair(fi, si);
    }
  };

  const resolvePair = (firstIdx, secondIdx) => {
    const first = deckRef.current[firstIdx];
    const second = deckRef.current[secondIdx];
    const isMatch = first.key === second.key;
    console.debug('resolve', { firstIdx, secondIdx, result: isMatch });

    if (isMatch) {
      // match path
      setDeck((prev) => {
        const next = prev.slice();
        next[firstIdx] = { ...next[firstIdx], matched: true };
        next[secondIdx] = { ...next[secondIdx], matched: true };
        return next;
      });

      setTimeout(() => {
        setDeck((prev) => {
          const next = prev.slice();
          next[firstIdx] = { ...next[firstIdx], fading: true };
          next[secondIdx] = { ...next[secondIdx], fading: true };
          return next;
        });

        setTimeout(() => {
          setDeck((prev) => {
            const next = prev.slice();
            next[firstIdx] = { ...next[firstIdx], selected: false };
            next[secondIdx] = { ...next[secondIdx], selected: false };
            return next;
          });

          setMoves((m) => m + 1);
          setFirstIndex(null);
          setSecondIndex(null);
          setPhase('idle');
          resolvingRef.current = false;

          const allMatched = deckRef.current.every((c) => c.matched);
          if (allMatched) {
            setGameOver(true);
            setGameResult('victory');
          }
        }, FADE_MS);
      }, HIGHLIGHT_MS);
    } else {
      // mismatch path
      setDeck((prev) => {
        const next = prev.slice();
        next[firstIdx] = { ...next[firstIdx], mismatch: true, selected: false };
        next[secondIdx] = { ...next[secondIdx], mismatch: true };
        return next;
      });

      setTimeout(() => {
        setDeck((prev) => {
          const next = prev.slice();
          next[firstIdx] = { ...next[firstIdx], mismatch: false, revealed: false };
          next[secondIdx] = { ...next[secondIdx], mismatch: false, revealed: false };
          return next;
        });

        setMoves((m) => m + 1);
        setFirstIndex(null);
        setSecondIndex(null);
        setPhase('idle');
        resolvingRef.current = false;

        setStrikes((s) => {
          const next = Math.min(s + 1, MAX_STRIKES);
          if (s + 1 > MAX_STRIKES) {
            setGameOver(true);
            setGameResult('failure');
          }
          return next;
        });
      }, HIGHLIGHT_MS);
    }
  };

  // build deck on mount
  useEffect(() => {
    async function init() {
      resolvingRef.current = true;
      const base = await fetchDeckBase();
      setDeck(buildDeck(base));
      resolvingRef.current = false;
    }
    init();
  }, []);

  const reset = async () => {
    resolvingRef.current = true;
    const base = await fetchDeckBase();
    setDeck(buildDeck(base));
    setMoves(0);
    setStrikes(0);
    setGameOver(false);
    setGameResult(null);
    setPhase('idle');
    setFirstIndex(null);
    setSecondIndex(null);
    resolvingRef.current = false;
  };

  return {
    deck,
    moves,
    strikes,
    gameOver,
    gameResult,
    phase,
    reveal,
    reset,
  };
}
