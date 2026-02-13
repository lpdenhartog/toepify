import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import headerIcon from "./assets/header-icon.svg";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="app-header">
          <img src={headerIcon} alt="Four 10s" className="header-icon" />
          <h1>toepify</h1>
          <div className="subtitle">Score Tracker</div>
        </header>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<p>Not found</p>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
