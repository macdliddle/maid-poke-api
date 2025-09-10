// Card component: shows state + handles reveal
export default function Card({ card, onReveal }) {
  // block clicks if already revealed/matched/fading
  const handleClick = () => {
    if (card.revealed || card.matched || card.fading) return;
    onReveal();
  };

  return (
    // use <button> for focus + aria support
    <button
      type="button"
      className={
        [
          'card',
          'card-button',
          card.revealed ? 'revealed' : '',
          card.selected ? 'selected' : '',
          card.mismatch ? 'mismatch' : '',
          card.matched ? 'matched' : '',
          card.fading ? 'fading' : '',
        ].join(' ')
      }
      onClick={handleClick}
      // aria - hidden vs revealed for screen readers
      aria-label={
        card.revealed || card.matched
          ? `Revealed card ${card.label ?? ''}`
          : 'Hidden card'
      }
    >
      {/* rotates both faces together */}
      <div className="card-inner">
        {/* front face - hidden side (question mark) */}
        <div className="card-face card-front">?</div>
        {/* back face - image + name if revealed */}
        <div className="card-face card-back">
          {(() => {
            const name = card.label
              ? card.label.charAt(0).toUpperCase() + card.label.slice(1)
              : '';
            return card.img ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                {/* image alt mirrors name for accessibility */}
                <img src={card.img} alt={name} />
                <div>{name}</div>
              </div>
            ) : (
              name
            );
          })()}
        </div>
      </div>
    </button>
  );
}
