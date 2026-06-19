import { NavLink, Route, Routes } from 'react-router-dom';

import { ActivityPage } from './pages/ActivityPage.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { ProtectionPage } from './pages/ProtectionPage.js';
import { QuarantinePage } from './pages/QuarantinePage.js';

export default function App() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <strong>Anti-SE Shield</strong>
            <p>Local dashboard</p>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/activity">Activity</NavLink>
          <NavLink to="/quarantine">Quarantine</NavLink>
          <NavLink to="/protection">Protection</NavLink>
        </nav>

        <footer className="sidebar-foot">
          <p>127.0.0.1 only</p>
          <p>No cloud sync</p>
        </footer>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/quarantine" element={<QuarantinePage />} />
          <Route path="/protection" element={<ProtectionPage />} />
        </Routes>
      </main>
    </div>
  );
}
