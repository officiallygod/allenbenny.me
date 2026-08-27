import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import WORDS, { WordEntry } from './words';
import './Game.css';

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

/* Keyboard layout */
const KEYBOARD_ROWS: string[][] = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

/* Letter status */
type LetterStatus = 'correct' | 'present' | 'absent' | 'empty';

const GAME_INSTRUCTIONS = [
  { icon: '🎯', text: 'Guess the hidden 5-letter word in 6 tries' },
  { icon: '🟢', text: 'Green = letter is correct & in the right spot' },
  { icon: '🟡', text: 'Yellow = letter is in the word but wrong spot' },
  { icon: '⚫', text: 'Grey = letter is not in the word' },
  { icon: '⌨️', text: 'Type on your keyboard or click the on-screen keys' },
];

function getRandomWord(): WordEntry {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

/** Compute tile statuses for a completed guess using standard Wordle algorithm */
function computeStatuses(guess: string, target: string): LetterStatus[] {
  const result: LetterStatus[] = new Array(WORD_LENGTH).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');
  const used: boolean[] = new Array(WORD_LENGTH).fill(false);

  // Pass 1: mark correct (green)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Pass 2: mark present (yellow) — letter exists in target but not yet used
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const letter = guessChars[i];
    for (let j = 0; j < WORD_LENGTH; j++) {
      if (!used[j] && targetChars[j] === letter) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

/** Derive keyboard key statuses from all submitted guesses */
function computeKeyboardStatuses(guesses: string[], target: string): Record<string, LetterStatus> {
  const statuses: Record<string, LetterStatus> = {};
  for (const guess of guesses) {
    const rowStatuses = computeStatuses(guess, target);
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = guess[i].toUpperCase();
      const current = rowStatuses[i];
      // Don't downgrade: correct > present > absent
      if (!statuses[letter]) {
        statuses[letter] = current;
      } else if (statuses[letter] === 'absent' && current !== 'absent') {
        statuses[letter] = current;
      } else if (statuses[letter] === 'present' && current === 'correct') {
        statuses[letter] = current;
      }
    }
  }
  return statuses;
}

const WordleApp: React.FC = () => {
  const [targetEntry, setTargetEntry] = useState<WordEntry | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [shake, setShake] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showWordMeaning, setShowWordMeaning] = useState(false);

  const target = targetEntry?.word ?? '';
  const targetUpper = target.toUpperCase();

  // Refs to avoid stale closures in keyboard handler
  const gameStatusRef = useRef(gameStatus);
  const currentGuessRef = useRef(currentGuess);
  const guessesRef = useRef(guesses);
  const targetUpperRef = useRef(targetUpper);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    currentGuessRef.current = currentGuess;
  }, [currentGuess]);

  useEffect(() => {
    guessesRef.current = guesses;
  }, [guesses]);

  useEffect(() => {
    targetUpperRef.current = targetUpper;
  }, [targetUpper]);

  // Pick a fresh random word on mount
  useEffect(() => {
    setTargetEntry(getRandomWord());
  }, []);

  // Keyboard status
  const keyboardStatus = useMemo(
    () => computeKeyboardStatuses(guesses, targetUpper),
    [guesses, targetUpper]
  );

  // Submit guess handler with refs to avoid stale closure
  const submitGuess = useCallback(() => {
    if (currentGuessRef.current.length < WORD_LENGTH) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    const guessUpper = currentGuessRef.current.toUpperCase();
    const newGuesses = [...guessesRef.current, guessUpper];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (guessUpper === targetUpperRef.current) {
      setGameStatus('won');
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameStatus('lost');
    }
  }, []);

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatusRef.current !== 'playing') return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        setCurrentGuess(g => g.slice(0, -1));
      } else if (e.key === 'Enter' || e.key === '↵') {
        e.preventDefault();
        submitGuess();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        setCurrentGuess(g => {
          if (g.length < WORD_LENGTH) return g + e.key.toUpperCase();
          return g;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitGuess]);

  const resetGame = () => {
    setTargetEntry(getRandomWord());
    setGuesses([]);
    setCurrentGuess('');
    setGameStatus('playing');
    setShowWordMeaning(false);
  };

  const currentRowIndex = guesses.length;

  return (
    <div className="w-root">
      {/* Funky background */}
      <div className="w-bg" aria-hidden="true" />

      {/* Header */}
      <div className="w-header">
        <h1 className="w-title">
          <span className="w-logo-dot">●</span>WÖRDLE
        </h1>
        <div className="w-header-controls">
          <button
            className="w-ctrl-btn w-info-btn"
            onClick={() => setShowInstructions(true)}
            aria-label="How to play"
            title="How to play"
          >
            ⓘ
          </button>
          <span className="w-counter">{`${guesses.length}/${MAX_ATTEMPTS}`}</span>
        </div>
      </div>

      {/* Game board */}
      <div className="w-board">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, rowIndex) => {
          const guess = guesses[rowIndex] ?? (rowIndex === currentRowIndex ? currentGuess : '');
          const rowStatus = guesses[rowIndex]
            ? computeStatuses(guesses[rowIndex].toUpperCase(), targetUpper)
            : null;
          const isCurrentRow = rowIndex === currentRowIndex && gameStatus === 'playing';

          return (
            <div
              key={rowIndex}
              className={`w-row ${isCurrentRow ? 'w-row-current' : ''} ${shake && isCurrentRow ? 'w-shake' : ''}`}
            >
              {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                const letter = guess[colIndex] || '';
                let status: LetterStatus = 'empty';
                if (rowStatus && colIndex < WORD_LENGTH) {
                  status = rowStatus[colIndex];
                }
                let tileClass = '';
                if (status === 'correct') tileClass = 'w-tile-correct';
                else if (status === 'present') tileClass = 'w-tile-present';
                else if (status === 'absent') tileClass = 'w-tile-absent';

                return (
                  <div key={colIndex} className={`w-tile ${tileClass}`}>
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Keyboard */}
      <div className="w-keyboard">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="w-key-row">
            {row.map(key => {
              const status = keyboardStatus[key];
              let statusClass = '';
              if (status === 'correct') statusClass = 'w-key-correct';
              else if (status === 'present') statusClass = 'w-key-present';
              else if (status === 'absent') statusClass = 'w-key-absent';

              const isWide = key === 'ENTER' || key === 'BACK';
              const label = key === 'BACK' ? '⌫' : key === 'ENTER' ? '↵' : key;

              return (
                <button
                  key={key}
                  className={`w-key ${statusClass} ${isWide ? 'w-key-wide' : ''}`}
                  onClick={() => {
                    if (gameStatus !== 'playing') return;
                    if (key === 'BACK') {
                      setCurrentGuess(g => g.slice(0, -1));
                    } else if (key === 'ENTER') {
                      submitGuess();
                    } else {
                      setCurrentGuess(g => {
                        if (g.length < WORD_LENGTH) return g + key;
                        return g;
                      });
                    }
                  }}
                  aria-label={key === 'BACK' ? 'Backspace' : key === 'ENTER' ? 'Enter' : key}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Game over overlay */}
      {gameStatus !== 'playing' && targetEntry && (
        <div className="w-overlay">
          <div className="w-gameover">
            <h2 className={gameStatus === 'won' ? 'w-won' : 'w-lost'}>
              {gameStatus === 'won' ? '🔓 Nailed it!' : '💀 Game over'}
            </h2>
            <p className="w-word-reveal">
              The word was: <span className="w-word">{targetUpper}</span>
            </p>
            <button className="w-meaning-btn" onClick={() => setShowWordMeaning(true)}>
              Show meaning
            </button>
            <button className="w-restart" onClick={resetGame}>
              {gameStatus === 'won' ? '🎉 Play again' : '🔄 Try again'}
            </button>
          </div>
        </div>
      )}

      {/* Word meaning modal */}
      {showWordMeaning && targetEntry && (
        <div className="w-meaning-overlay" onClick={() => setShowWordMeaning(false)}>
          <div className="w-meaning-modal" onClick={e => e.stopPropagation()}>
            <h3>The word: {targetUpper}</h3>
            <p className="w-meaning-text">"{targetEntry.meaning}"</p>
            <button className="w-meaning-close" onClick={() => setShowWordMeaning(false)}>
              Got it ✓
            </button>
          </div>
        </div>
      )}

      {/* Instructions modal */}
      {showInstructions && (
        <div className="w-instructions-overlay" onClick={() => setShowInstructions(false)}>
          <div className="w-instructions-modal" onClick={e => e.stopPropagation()}>
            <button className="w-instr-close" onClick={() => setShowInstructions(false)} aria-label="Close">
              ×
            </button>
            <h2 className="w-instr-title">Wie spielt man? 🎮</h2>
            <p className="w-instr-sub">Wordle but make it funky ✨</p>
            <ul className="w-instr-list">
              {GAME_INSTRUCTIONS.map((instr, i) => (
                <li key={i} className="w-instr-item">
                  <span className="w-instr-icon">{instr.icon}</span>
                  <span>{instr.text}</span>
                </li>
              ))}
            </ul>
            <div className="w-keyboard-hint">
              <kbd>Q W E R T Y U I O P</kbd>
              <br />
              <kbd>A S D F G H J K L</kbd>
              <br />
              <kbd>↵ Z X C V B N M ⌫</kbd>
              <p className="w-keyboard-note">Your physical keyboard works too! Just start typing.</p>
            </div>
            <button className="w-instr-start" onClick={() => setShowInstructions(false)}>
              Got it, let's play!
            </button>
          </div>
        </div>
      )}

      {/* Back link — "go up" with a smooth transition */}
      <a
        href="#/"
        className="w-back-link"
        aria-label="Back to site"
        onClick={(e) => {
          // Smooth "go up" animation: fade + scroll up
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => { window.location.hash = '#/'; }, 600);
        }}
      >
        <span className="w-back-arrow">↑</span>
        <span className="w-back-text">back to site</span>
      </a>
    </div>
  );
};

export default WordleApp;
