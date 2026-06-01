import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AdminPage from "./pages/AdminPage";
import TournamentPage from "./pages/TournamentPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ActivatePage from "./pages/ActivatePage";
import headerIcon from "./assets/header-icon.svg";

function HeaderActions() {
  const { isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (isAuthenticated) {
    return (
      <button
        className="auth-icon-btn"
        onClick={logout}
        title="Uitloggen"
        aria-label="Uitloggen"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    );
  }

  return (
    <button
      className="auth-icon-btn"
      onClick={() => navigate("/login")}
      title="Inloggen"
      aria-label="Inloggen"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <header className="app-header">
            <Link to="/" className="header-link">
              <img src={headerIcon} alt="Four 10s" className="header-icon" />
              <h1>toepify</h1>
            </Link>
            <div className="header-actions">
              <HeaderActions />
            </div>
          </header>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/activate/:token" element={<ActivatePage />} />
            <Route path="/t/:tournamentId" element={<TournamentPage />} />
            <Route path="*" element={<p>Not found</p>} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
