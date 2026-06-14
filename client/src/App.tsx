import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  matchPath,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/useAuth";
import AdminPage from "./pages/AdminPage";
import TournamentPage from "./pages/TournamentPage";
import TournamentHistoryPage from "./pages/TournamentHistoryPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ActivatePage from "./pages/ActivatePage";
import LogoMark from "./components/logo/LogoMark";
import { useScreenWakeLock } from "./hooks/useScreenWakeLock";
import { fetchLatestGame } from "./api/game";
import {
  buildScoreSpeechText,
  canUseScoreSpeech,
  speakScoreText,
} from "./components/scoreboard/scoreSpeech";

export type TournamentMode = "viewer" | "writer";

function ModeToggle({
  mode,
  onToggle,
}: {
  mode: TournamentMode;
  onToggle: () => void;
}) {
  const isViewer = mode === "viewer";
  const label = isViewer
    ? "Schakel naar schrijver modus"
    : "Schakel naar viewer modus";

  return (
    <button
      className="auth-icon-btn"
      onClick={onToggle}
      title={label}
      aria-label={label}
    >
      {isViewer ? (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ) : (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}

function ScoreReadButton({ tournamentId }: { tournamentId: string }) {
  const [isReading, setIsReading] = useState(false);
  const isSupported = canUseScoreSpeech();
  const label = isSupported
    ? "Stand voorlezen"
    : "Stand voorlezen niet ondersteund";

  const readScore = async () => {
    if (!isSupported || isReading) return;

    setIsReading(true);
    try {
      const state = await fetchLatestGame(tournamentId);
      const currentScores = Object.fromEntries(
        state.players.map((player) => [player.player_id, player.total_score]),
      );
      speakScoreText(buildScoreSpeechText(state.players, currentScores));
    } catch {
      // Keep the header quiet if the latest score cannot be loaded.
    } finally {
      setIsReading(false);
    }
  };

  return (
    <button
      className="auth-icon-btn"
      onClick={() => void readScore()}
      disabled={!isSupported || isReading}
      title={label}
      aria-label={label}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 6a8 8 0 0 1 0 12" />
      </svg>
    </button>
  );
}

function HeaderActions({
  mode,
  onToggleMode,
  tournamentId,
  showModeToggle,
  showScreenToggle,
}: {
  mode: TournamentMode;
  onToggleMode: () => void;
  tournamentId: string | undefined;
  showModeToggle: boolean;
  showScreenToggle: boolean;
}) {
  const { isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();
  const screenWakeLock = useScreenWakeLock();

  if (loading) return null;

  const modeToggle = showModeToggle ? (
    <ModeToggle mode={mode} onToggle={onToggleMode} />
  ) : null;
  const scoreReadButton = tournamentId ? (
    <ScoreReadButton tournamentId={tournamentId} />
  ) : null;
  const screenToggle = showScreenToggle ? (
    <button
      className={`auth-icon-btn screen-toggle-btn${
        screenWakeLock.isActive ? " is-active" : ""
      }${screenWakeLock.isUnavailable ? " is-unavailable" : ""}`}
      onClick={() => void screenWakeLock.toggle()}
      disabled={!screenWakeLock.isSupported || screenWakeLock.isUnavailable}
      aria-label="Scherm"
      aria-pressed={screenWakeLock.isActive}
      title="Scherm"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M10 18h4" />
        <circle cx="14" cy="8" r="2" />
        <path d="M14 3.5v1" />
        <path d="M14 11.5v1" />
        <path d="M9.5 8h1" />
        <path d="M17.5 8h1" />
        <path d="m11.2 5.2.7.7" />
        <path d="m16.1 10.1.7.7" />
        <path d="m16.8 5.2-.7.7" />
        <path d="m11.9 10.1-.7.7" />
      </svg>
    </button>
  ) : null;

  if (isAuthenticated) {
    return (
      <>
        {scoreReadButton}
        {screenToggle}
        {modeToggle}
        <button
          className="auth-icon-btn"
          onClick={logout}
          title="Uitloggen"
          aria-label="Uitloggen"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </>
    );
  }

  return (
    <>
      {scoreReadButton}
      {screenToggle}
      {modeToggle}
      <button
        className="auth-icon-btn"
        onClick={() => navigate("/login")}
        title="Inloggen"
        aria-label="Inloggen"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const tournamentMatch = matchPath("/t/:tournamentId", location.pathname);
  const tournamentId = tournamentMatch?.params.tournamentId;
  const [mode, setMode] = useState<TournamentMode>("viewer");
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    setMode("viewer");
  }, [tournamentId]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/config")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load app config");
        }
        return response.json() as Promise<{ environment?: string | null }>;
      })
      .then((config) => {
        if (isMounted) {
          setIsStaging(config.environment === "staging");
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsStaging(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/" className="header-link">
          <LogoMark size={36} decorative className="header-icon" />
          <h1>
            toepify
            {isStaging && <span className="staging-label"> - STAGING</span>}
          </h1>
        </Link>
        <div className="header-actions">
          <HeaderActions
            mode={mode}
            onToggleMode={() =>
              setMode((current) => (current === "viewer" ? "writer" : "viewer"))
            }
            tournamentId={tournamentId}
            showModeToggle={!!tournamentId}
            showScreenToggle={!!tournamentId}
          />
        </div>
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate/:token" element={<ActivatePage />} />
        <Route
          path="/t/:tournamentId/history"
          element={<TournamentHistoryPage />}
        />
        <Route
          path="/t/:tournamentId"
          element={<TournamentPage mode={mode} />}
        />
        <Route path="*" element={<p>Not found</p>} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
