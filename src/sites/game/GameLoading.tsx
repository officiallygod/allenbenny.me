import React from 'react';
import './Wordle.css';

/**
 * Gen-Z loading screen shown while the Wordle chunk loads.
 * Mirrors the parallel site's sticker/spinner aesthetic.
 */
const GameLoading: React.FC = () => (
  <div className="wz-loading" role="status" aria-live="polite" aria-label="Loading Wordle">
    <div className="wz-loading-chip wz-loading-chip-a">📅 Daily word</div>
    <div className="wz-loading-inner">
      <span className="wz-loading-word">WORD</span>
      <span className="wz-loading-word wz-loading-outline">LE</span>
      <div className="wz-loading-spin">🎮</div>
      <p className="wz-loading-sub">spinning up the daily brain snack…</p>
    </div>
    <div className="wz-loading-chip wz-loading-chip-b">🎯 6 tries</div>
    <div className="wz-loading-chip wz-loading-chip-c">📊 Tracking</div>
  </div>
);

export default GameLoading;
