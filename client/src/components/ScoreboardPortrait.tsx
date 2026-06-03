import {
  BuyInSection,
  HeroNumber,
  IconShare,
  ModeBadge,
  PlayerHead,
  RoundActions,
  TapButton,
} from "./scoreboard/scoreboardView";
import {
  displayScore,
  formatEuro,
  formatPot,
  type ScoreboardView,
} from "./scoreboard/scoreboardHelpers";

export default function ScoreboardPortrait({ view }: { view: ScoreboardView }) {
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
    isCreator,
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
    <div className="scoreboard tp pal-chalk" style={colStyle}>
      {celebration}

      {/* tournament + pot */}
      <div className="tp-tourney">
        <div className="tp-tourney-info">
          <div className="tp-tourney-name">{tournament.name}</div>
          <div className="tp-tourney-meta">{meta}</div>
          <ModeBadge canWrite={canWrite} />
        </div>
        <div className="tp-pot">
          <span className="tp-pot-label">Pot</span>
          <span className="tp-pot-value">{formatPot(pot)}</span>
        </div>
      </div>

      {/* board */}
      <div className="tp-board">
        <div className="score-table-wrapper">
          <table className="score-table score-table-fixed tp-head-table">
            <thead>
              <tr>
                {players.map((p) => {
                  const excluded = excludedPlayers.has(p.player_id);
                  return (
                    <th
                      key={p.player_id}
                      className={`player-col${excluded ? " player-excluded" : ""}`}
                    >
                      <PlayerHead
                        player={p}
                        abbreviation={abbreviations.get(p.player_name)}
                        showSelection={showPlayerSelection}
                        excluded={excluded}
                        onToggle={view.onTogglePlayer}
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>

          {historyScores.length > 0 && (
            <div className="score-table-scroll tp-history" ref={scrollRef}>
              <table className="score-table score-table-fixed tp-hist-table">
                <tbody>
                  {historyScores.map((scores, i) => (
                    <tr key={i} className="score-row-history">
                      {players.map((p) => {
                        const val = scores[p.player_id] || 0;
                        return (
                          <td
                            key={p.player_id}
                            className={
                              val >= 15
                                ? "score-cell score-out"
                                : val === 14
                                  ? "score-cell score-pelt"
                                  : "score-cell"
                            }
                          >
                            {displayScore(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <table className="score-table score-table-fixed tp-current-table">
            <tbody>
              <tr className="score-row-current">
                {players.map((p) => {
                  const val = currentScores[p.player_id] || 0;
                  const excluded = excludedPlayers.has(p.player_id);
                  return (
                    <td
                      key={p.player_id}
                      className={`score-cell${
                        val >= 15
                          ? " score-out"
                          : val === 14
                            ? " score-pelt"
                            : ""
                      }${excluded ? " player-excluded" : ""}`}
                    >
                      <HeroNumber
                        player={p}
                        value={val}
                        excluded={excluded}
                        bumped={!!bumped[p.player_id]}
                      />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* buy-in */}
      <BuyInSection
        players={players}
        canBuyIn={view.canBuyIn}
        buyingIn={buyingIn}
        onBuyIn={view.onBuyIn}
        stakePerGame={tournament.stake_per_game}
      />

      {/* penalty entry (writer) or viewer note */}
      {canWrite && isActive ? (
        <div className="penalty-section tp-penalty">
          <div className="tp-section-label">
            Deze ronde &mdash; tik de strafpunten
          </div>
          <div className="tp-penalty-row">
            {players.map((p) => {
              const excluded = excludedPlayers.has(p.player_id);
              return (
                <div
                  className={`tp-pcol${excluded ? " player-excluded" : ""}`}
                  key={p.player_id}
                >
                  <TapButton
                    player={p}
                    excluded={excluded}
                    value={pendingPenalties[p.player_id] || 0}
                    popped={popped === p.player_id}
                    onTap={view.onTap}
                  />
                  <span className="tp-pkey">
                    {abbreviations.get(p.player_name)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="tp-hint">
            De winnaar houdt 0 &mdash; geef de rest hun strafpunten.
          </div>
          <RoundActions
            showUndo={rounds.length > 0}
            onCancel={view.onCancelRound}
            onFinish={view.onFinishRound}
            finishDisabled={finishingRound || !penaltiesValid}
            undoing={undoingRound}
            onUndo={view.onUndo}
          />
        </div>
      ) : !isActive ? null : (
        <div className="tp-viewnote">
          Je kijkt mee in <b>kijkmodus</b>. De stand werkt automatisch bij zodra
          de schrijver een ronde afsluit.
        </div>
      )}

      {/* balances */}
      <div className="tp-balances">
        <div className="tp-section-label">Balans</div>
        <div className="tp-bal-grid">
          {sortedBalances.map((bal) => {
            const sign =
              bal.balance > 0 ? "pos" : bal.balance < 0 ? "neg" : "zero";
            const gp = players.find((p) => p.player_id === bal.player_id);
            return (
              <div className="tp-bal" key={bal.player_id}>
                <span className="tp-bal-name">
                  {gp ? abbreviations.get(gp.player_name) : bal.player_name}
                </span>
                <span className={`tp-bal-val ${sign}`}>
                  {formatEuro(bal.balance)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* share */}
      <button className="tp-share" onClick={view.onOpenShare}>
        <IconShare />
        Deel link
      </button>

      {/* close tournament (creator, active game, no rounds played) */}
      {canWrite && isCreator && isActive && rounds.length === 0 && (
        <button
          className="tp-share tp-close-tournament"
          onClick={() => {
            if (
              window.confirm(
                "Weet je zeker dat je het toernooi wilt afsluiten? Er kunnen dan geen nieuwe spellen meer worden gestart.",
              )
            ) {
              view.onCloseTournament();
            }
          }}
        >
          Toernooi afsluiten
        </button>
      )}

      {qrOverlay}
    </div>
  );
}
