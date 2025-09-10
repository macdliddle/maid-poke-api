import GameBoard from './components/GameBoard';
import useGame from './hooks/useGame';
import './App.css';

export default function App() {
  const { deck, moves, strikes, gameResult, reveal, reset } = useGame();

  // strikes
  const strikeIcons = '✖'.repeat(strikes);

  return (
    <div className="game-container">
      {/* Header - strikes, moves, restart */}
      <header className="game-header">
        <div className="strikes" aria-live="polite">
          Strikes: <span>{strikeIcons}</span>
        </div>
        <div className="moves" aria-live="polite">
          Moves: {moves}
        </div>
        <button type="button" onClick={reset} className="restart-btn">
          Restart
        </button>
      </header>

      <GameBoard deck={deck} onReveal={reveal} />

      {/* overlay on win/lose */}
      {gameResult && (
        <div className="overlay" role="alert">
          <div className="overlay-content" tabIndex={-1}>
            {gameResult === 'victory' ? 'Victory!' : 'Game Over'}
            <div>
              <button
                type="button"
                onClick={reset}
                autoFocus
                className="restart-btn"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
