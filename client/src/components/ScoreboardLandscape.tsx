import { Link } from "react-router-dom";
import {
  BuyInSection,
  HeroNumber,
  ModeBadge,
  PlayerHead,
  RoundActions,
  Suits,
  TapButton,
} from "./scoreboard/scoreboardView";
import {
  displayScore,
  formatEuro,
  formatPot,
  type ScoreboardView,
} from "./scoreboard/scoreboardHelpers";

export default function ScoreboardLandscape({
  view,
}: {
  view: ScoreboardView;
}) {
  const {
    tournament,
    players,
    rounds,
    pot,
    meta,
    abbreviations,
    historyScores,
    currentScores,
    sortedBalances,
    canWrite,
    isActive,
    showPlayerSelection,
    excludedPlayers,
    pendingPenalties,
    popped,
    bumped,
    penaltiesValid,
    finishingRound,
    undoingRound,
    buyingIn,
    scrollRef,
    colStyle,
    celebration,
    qrOverlay,
  } = view;

  return (
    <div className="scoreboard tp pal-chalk tp-land-wrap" style={colStyle}>
      {celebration}
      <div className="tp-land">
        <div className="tp-land-top">
          <div className="tp-brand">
            <h2 className="tp-wordmark">toepify</h2>
            <Suits />
          </div>
          <div className="tp-land-topmeta">
            <Link
              className="tp-land-tname tp-tourney-link"
              to={`/t/${tournament.id}/history`}
            >
              {tournament.name}
            </Link>
            <span className="tp-land-tmeta">{meta}</span>
            <ModeBadge canWrite={canWrite} />
          </div>
        </div>

        <div className="tp-land-main">
          <div className="tp-land-board">
            <div className="tp-lrow tp-lhead">
              {players.map((p) => (
                <div className="tp-cell" key={p.player_id}>
                  <PlayerHead
                    player={p}
                    abbreviation={abbreviations.get(p.player_name)}
                    showSelection={showPlayerSelection}
                    excluded={excludedPlayers.has(p.player_id)}
                    onToggle={view.onTogglePlayer}
                  />
                </div>
              ))}
            </div>

            {historyScores.length > 0 && (
              <div className="tp-lhist" ref={scrollRef}>
                {historyScores.map((scores, i) => (
                  <div className="tp-lrow" key={i}>
                    {players.map((p) => {
                      const val = scores[p.player_id] || 0;
                      const c =
                        val >= 15
                          ? "score-out"
                          : val === 14
                            ? "score-pelt"
                            : "";
                      return (
                        <div className={`tp-cell ${c}`} key={p.player_id}>
                          {displayScore(val)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            <div className="tp-lrow tp-lcurrent">
              {players.map((p) => {
                const val = currentScores[p.player_id] || 0;
                const valClass =
                  val >= 15 ? " score-out" : val === 14 ? " score-pelt" : "";
                return (
                  <div className={`tp-cell${valClass}`} key={p.player_id}>
                    <HeroNumber
                      player={p}
                      value={val}
                      excluded={excludedPlayers.has(p.player_id)}
                      bumped={!!bumped[p.player_id]}
                    />
                  </div>
                );
              })}
            </div>

            {canWrite && isActive && (
              <div className="tp-ltap">
                {players.map((p) => (
                  <div className="tp-cell" key={p.player_id}>
                    <TapButton
                      player={p}
                      excluded={excludedPlayers.has(p.player_id)}
                      value={pendingPenalties[p.player_id] || 0}
                      popped={popped === p.player_id}
                      onTap={view.onTap}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tp-land-rail">
            <div className="tp-land-pot">
              <span className="tp-pot-label">Pot</span>
              <span className="tp-pot-value">{formatPot(pot)}</span>
            </div>

            <div className="tp-land-bal">
              <div className="tp-section-label">Balans</div>
              {sortedBalances.map((bal) => {
                const sign =
                  bal.balance > 0 ? "pos" : bal.balance < 0 ? "neg" : "zero";
                const gp = players.find((p) => p.player_id === bal.player_id);
                return (
                  <div className="tp-lbal-row" key={bal.player_id}>
                    <span className="tp-lbal-name">
                      {gp ? abbreviations.get(gp.player_name) : bal.player_name}
                    </span>
                    <span className={`tp-lbal-val ${sign}`}>
                      {formatEuro(bal.balance)}
                    </span>
                  </div>
                );
              })}
            </div>

            <BuyInSection
              players={players}
              canBuyIn={view.canBuyIn}
              buyingIn={buyingIn}
              onBuyIn={view.onBuyIn}
              stakePerGame={tournament.stake_per_game}
            />

            {canWrite && isActive && (
              <RoundActions
                showUndo={rounds.length > 0}
                onCancel={view.onCancelRound}
                onFinish={view.onFinishRound}
                finishDisabled={finishingRound || !penaltiesValid}
                undoing={undoingRound}
                onUndo={view.onUndo}
              />
            )}
          </div>
        </div>
      </div>
      {qrOverlay}
    </div>
  );
}
