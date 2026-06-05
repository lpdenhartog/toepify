import type React from "react";

const bills = Array.from({ length: 42 }, (_, index) => {
  const lane = (index * 37) % 100;
  const drift = ((index % 9) - 4) * 9;
  const delay = (index % 14) * 0.22;
  const duration = 2.8 + (index % 6) * 0.16;
  const size = 24 + (index % 5) * 4;
  const spin = index % 2 === 0 ? 1 : -1;

  return {
    id: index,
    style: {
      "--bill-left": `${lane}%`,
      "--bill-drift": `${drift}px`,
      "--bill-delay": `${delay}s`,
      "--bill-duration": `${duration}s`,
      "--bill-size": `${size}px`,
      "--bill-spin": spin,
    } as React.CSSProperties,
  };
});

export default function BuyInRainOverlay() {
  return (
    <div className="buyin-rain-overlay" aria-hidden="true">
      <div className="buyin-rain-glow" />
      {bills.map((bill) => (
        <span key={bill.id} className="buyin-rain-bill" style={bill.style}>
          💵
        </span>
      ))}
    </div>
  );
}
