import Card from './Card';

export default function GameBoard({ deck, onReveal }) {
  return (
    <div className="game-grid">
      {deck.map((card, index) => (
        <Card key={card.uid} card={card} onReveal={() => onReveal(index)} />
      ))}
    </div>
  );
}
