import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import TournamentPage from "./pages/TournamentPage";
import LandingPage from "./pages/LandingPage";
import headerIcon from "./assets/header-icon.svg";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <Link to="/" className="header-link">
            <img src={headerIcon} alt="Four 10s" className="header-icon" />
            <h1>toepify</h1>
          </Link>
        </header>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/t/:tournamentId" element={<TournamentPage />} />
          <Route path="*" element={<p>Not found</p>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
