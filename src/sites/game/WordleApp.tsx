import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Wordle.css';
import { ANSWER_LIST, VALID_GUESSES } from './words';

/* ================================================================
   OFFICIAL WORDLE WORD LISTS (offline, no API needed)
   - ANSWER_LIST: 2,315 official NYT Wordle daily solutions
   - VALID_GUESSES: 12,972 unique valid 5-letter words (answers + accepted)
   Deterministic daily word: seeded by UTC date → same word globally
   ================================================================ */

/* ---------- helpers ---------- */
function getDailyWord(): string {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD UTC
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  return ANSWER_LIST[hash % ANSWER_LIST.length];
}

function checkGuess(guess: string, target: string): ('correct' | 'present' | 'absent')[] {
  const result: ('correct' | 'present' | 'absent')[] = Array(5).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');

  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      targetChars[i] = '#';
      guessChars[i] = '*';
    }
  }
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] !== '*') {
      const idx = targetChars.indexOf(guessChars[i]);
      if (idx >= 0) {
        result[i] = 'present';
        targetChars[idx] = '#';
      }
    }
  }
  return result;
}

const KEY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','BACK'],
];

const INSTRUCTIONS = [
  'Guess the WORDLE in 6 tries.',
  'Each guess must be a valid 5-letter word.',
  'Hit ENTER to submit.',
  'After each guess, tiles show how close you are:',
];

const TILE_MEANINGS = [
  { label: 'Green', desc: 'Right letter, right spot' },
  { label: 'Yellow', desc: 'Right letter, wrong spot' },
  { label: 'Gray', desc: 'Letter not in word' },
];

export const WordleApp: React.FC = () => {
  const [target] = useState(() => getDailyWord());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showInstructions, setShowInstructions] = useState(true);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  const [keyStates, setKeyStates] = useState<Record<string, 'correct' | 'present' | 'absent'>>({});
  const [animatingRow, setAnimatingRow] = useState(-1);
  const [shakeRow, setShakeRow] = useState(-1);
  const [popKey, setPopKey] = useState<string | null>(null);
  const [flipTiles, setFlipTiles] = useState<number[]>([]);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-game-theme', dark ? 'dark' : 'light');
    if (dark) document.body.classList.add('wz-dark'); else document.body.classList.remove('wz-dark');
  }, [dark]);

  const handleKey = useCallback((key: string) => {
    if (gameState !== 'playing') return;

    if (key === 'ENTER') {
      if (currentGuess.length !== 5) {
        setShakeRow(guesses.length);
        setTimeout(() => setShakeRow(-1), 400);
        return;
      }
      if (!VALID_GUESSES.includes(currentGuess)) {
        setShakeRow(guesses.length);
        setTimeout(() => setShakeRow(-1), 400);
        return;
      }

      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      setAnimatingRow(newGuesses.length - 1);

      const delays = [0, 150, 300, 450, 600];
      delays.forEach((d) => {
        setTimeout(() => {
          setFlipTiles(prev => [...prev, newGuesses.length - 1]);
        }, d);
      });

      const result = checkGuess(currentGuess, target);
      setTimeout(() => {
        if (currentGuess === target) {
          setGameState('won');
        } else if (newGuesses.length >= 6) {
          setGameState('lost');
        }
      }, 800);

      setKeyStates(prev => {
        const next = { ...prev };
        result.forEach((r, i) => {
          const letter = currentGuess[i];
          const current = next[letter];
          if (r === 'correct' || (r === 'present' && current !== 'correct') || (r === 'absent' && !current)) {
            next[letter] = r;
          }
        });
        return next;
      });

      setCurrentGuess('');
      setAnimatingRow(-1);
      setTimeout(() => setFlipTiles(prev => prev.filter(r => r !== newGuesses.length - 1)), 1000);
      return;
    }

    if (key === 'BACK') {
      setCurrentGuess(prev => prev.slice(0, -1));
      return;
    }

    if (currentGuess.length < 5 && /^[A-Z]$/.test(key)) {
      setCurrentGuess(prev => prev + key);
      setPopKey(key);
      setTimeout(() => setPopKey(null), 120);
    }
  }, [currentGuess, guesses.length, target, gameState]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleKey('ENTER');
      else if (e.key === 'Backspace') handleKey('BACK');
      else if (/^[a-z]$/i.test(e.key)) handleKey(e.key.toUpperCase());
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [handleKey]);

  const tileClass = (row: number, col: number): string => {
    if (row >= guesses.length) return 'wz-tile';
    if (row === animatingRow) return 'wz-tile wz-flipping';
    if (flipTiles.includes(row)) {
      const result = checkGuess(guesses[row], target);
      return `wz-tile wz-flipped wz-${result[col]}`;
    }
    const result = checkGuess(guesses[row], target);
    return `wz-tile wz-${result[col]}`;
  };

  const keyClass = (key: string): string => {
    const state = keyStates[key];
    if (popKey === key) return 'wz-key wz-pop';
    if (state) return `wz-key wz-key-${state}`;
    return 'wz-key';
  };

  const shareResult = () => {
    const emojiMap: Record<string, string> = { correct: '🟩', present: '🟨', absent: '⬜' };
    let text = `Wordle ${guesses.length}/6\n\n`;
    guesses.forEach(g => {
      const r = checkGuess(g, target);
      text += r.map(x => emojiMap[x]).join('') + '\n';
    });
    navigator.clipboard?.writeText(text);
  };

  return (
    <div className={`wz-root ${dark ? 'wz-dark' : 'wz-light'}`}>
      {/* background splashes + grain */}
      <div className="wz-splash wz-sp1" aria-hidden="true" />
      <div className="wz-splash wz-sp2" aria-hidden="true" />
      <div className="wz-splash wz-sp3" aria-hidden="true" />
      <div className="wz-grain" aria-hidden="true" />

      {/* floating controls: home, theme, instructions */}
      <div className="wz-controls">
        <a className="wz-pill" href="#/" aria-label="Back to main site" title="Back to main site">🏠</a>
        <button className="wz-pill" onClick={() => { setDark(d => !d); }} aria-label="Toggle theme">
          {dark ? '☀️ Light' : '🌙 Dark'}
        </button>
        <button className="wz-pill" onClick={() => setShowInstructions(true)} aria-label="Instructions">❓</button>
      </div>

      <main className="wz-main" role="main">
        {/* header - SMALLER */}
        <header className="wz-header">
          <h1 className="wz-title">
            <span className="wz-title-word">WORD</span>
            <span className="wz-title-word wz-outline">LE</span>
          </h1>
          <p className="wz-subtitle">A fresh word every day. Zero cookies. Just vibes.</p>
          <div className="wz-chips">
            <span className="wz-chip">📅 Daily word</span>
            <span className="wz-chip">🎯 6 tries</span>
            <span className="wz-chip">📊 Tracking</span>
          </div>
        </header>

        {/* board */}
        <div className="wz-board" role="region" aria-label="Wordle board">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className={`wz-row ${row === shakeRow ? 'wz-shake' : ''}`} role="row">
              {Array.from({ length: 5 }).map((_, col) => (
                <div
                  key={col}
                  ref={el => { tileRefs.current[row * 5 + col] = el; }}
                  className={tileClass(row, col)}
                  role="gridcell"
                  aria-label={row < guesses.length ? `${guesses[row][col]}, ${checkGuess(guesses[row], target)[col]}` : 'Empty'}
                >
                  {row < guesses.length
                    ? guesses[row][col]
                    : row === guesses.length
                      ? (currentGuess[col] ?? '')
                      : ''}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* keyboard - fully responsive */}
        <div className="wz-keyboard" role="region" aria-label="Keyboard">
          {KEY_ROWS.map((row, ri) => (
            <div key={ri} className="wz-key-row">
              {row.map((key, ki) => (
                <button
                  key={key}
                  className={keyClass(key)}
                  onClick={() => handleKey(key)}
                  disabled={gameState !== 'playing'}
                  aria-label={key === 'ENTER' ? 'Submit' : key === 'BACK' ? 'Delete' : key}
                  data-wide={key === 'ENTER' || key === 'BACK'}
                >
                  {key === 'ENTER' ? '⏎' : key === 'BACK' ? '⌫' : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* game over */}
        {(gameState === 'won' || gameState === 'lost') && (
          <div className="wz-overlay" role="alert">
            <div className="wz-overlay-box">
              <h2 className={gameState === 'won' ? 'wz-win' : 'wz-lose'}>
                {gameState === 'won' ? '🎉 GOT IT!' : '💀 NOPE'}
              </h2>
              <p className="wz-answer">The word was <strong>{target}</strong></p>

              {/* meaning chips — what each tile color means */}
              <div className="wz-legend wz-legend-overlay">
                {TILE_MEANINGS.map((m, i) => (
                  <div key={i} className="wz-legend-item">
                    <span className={`wz-legend-tile wz-${m.label.toLowerCase()}`} />
                    <span>{m.desc}</span>
                  </div>
                ))}
              </div>

              <p className="wz-stats">Solved in {guesses.length}/6</p>
              <div className="wz-overlay-actions">
                <button className="wz-btn wz-btn-main" onClick={shareResult}>📋 Share</button>
                <button className="wz-btn" onClick={() => window.location.reload()}>🔄 New Game</button>
              </div>
              <p className="wz-tomorrow">New word drops at midnight 🌙</p>
            </div>
          </div>
        )}

        {/* instructions modal */}
        {showInstructions && (
          <div className="wz-modal" role="dialog" aria-modal="true" onClick={() => setShowInstructions(false)}>
            <div className="wz-modal-box" onClick={e => e.stopPropagation()}>
              <button className="wz-modal-close" onClick={() => setShowInstructions(false)} aria-label="Close">✕</button>
              <h3 className="wz-modal-title">HOW TO PLAY</h3>
              <ul className="wz-instructions">
                {INSTRUCTIONS.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <div className="wz-legend">
                {TILE_MEANINGS.map((m, i) => (
                  <div key={i} className="wz-legend-item">
                    <span className={`wz-legend-tile wz-${m.label.toLowerCase()}`} />
                    <span>{m.desc}</span>
                  </div>
                ))}
              </div>
              <button className="wz-btn wz-btn-main wz-modal-go" onClick={() => setShowInstructions(false)}>LET'S GO ✦</button>
            </div>
          </div>
        )}
      </main>

      <footer className="wz-footer">
        <span>🏠 <a href="#/" className="wz-link">Back to allenbenny.me</a></span>
        <span className="wz-fine">/wordle · the daily brain snack</span>
      </footer>
    </div>
  );
};

export default WordleApp;