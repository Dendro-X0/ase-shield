import { Route, Routes } from 'react-router-dom';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ActivityPage } from '@/pages/ActivityPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ProtectionPage } from '@/pages/ProtectionPage';
import { QuarantinePage } from '@/pages/QuarantinePage';
import { SettingsPage } from '@/pages/SettingsPage';

export default function App() {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/quarantine" element={<QuarantinePage />} />
        <Route path="/protection" element={<ProtectionPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
}
