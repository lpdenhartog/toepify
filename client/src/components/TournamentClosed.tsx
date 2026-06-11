import { Link } from "react-router-dom";
import type { SettlementData } from "../api/tournaments";

interface TournamentClosedProps {
  settlementData: SettlementData;
  tournamentId: string;
}

export default function TournamentClosed({ settlementData, tournamentId }: TournamentClosedProps) {
  const { name, balances, settlements } = settlementData;

  const sortedBalances = [...balances].sort((a, b) => b.balance - a.balance);

  const formatEuro = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2).replace(".", ",");
    if (amount >= 0) return `+\u20AC${formatted}`;
    return `-\u20AC${formatted}`;
  };

  return (
    <div className="tournament-closed">
      <div className="tournament-closed-header">
        <h1>
          <Link to={`/t/${tournamentId}/history`}>{name}</Link>
        </h1>
        <span className="tournament-closed-badge">Afgesloten</span>
      </div>

      {/* Leaderboard */}
      <div className="tournament-closed-section">
        <table className="player-summary-table">
          <thead>
            <tr>
              <th className="pos-col">#</th>
              <th>Speler</th>
              <th>Balans</th>
            </tr>
          </thead>
          <tbody>
            {sortedBalances.map((bal, index) => (
              <tr key={bal.player_id}>
                <td className="pos-col">{index + 1}</td>
                <td>{bal.player_name}</td>
                <td
                  className={
                    bal.balance > 0
                      ? "balance-positive"
                      : bal.balance < 0
                      ? "balance-negative"
                      : ""
                  }
                >
                  {formatEuro(bal.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Settlement */}
      {settlements.length > 0 && (
        <div className="tournament-closed-section">
          <h2 className="settlement-title">Afrekening</h2>
          <table className="settlement-table">
            <thead>
              <tr>
                <th>Van</th>
                <th>Aan</th>
                <th>Bedrag</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s, i) => (
                <tr key={i}>
                  <td>{s.from_name}</td>
                  <td>{s.to_name}</td>
                  <td>{"\u20AC"}{s.amount.toFixed(2).replace(".", ",")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
