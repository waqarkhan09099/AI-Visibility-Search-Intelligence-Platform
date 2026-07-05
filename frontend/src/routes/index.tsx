import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { CreateProfilePage } from '@/features/profiles/CreateProfilePage'
import { ProfilesListPage } from '@/features/profiles/ProfilesListPage'
import { ProfileDetailPage } from '@/features/profiles/ProfileDetailPage'
import { AISettingsPage } from '@/features/settings/AISettingsPage'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profiles" element={<ProfilesListPage />} />
          <Route path="/profiles/new" element={<CreateProfilePage />} />
          <Route path="/profiles/:id" element={<ProfileDetailPage />} />
          <Route path="/settings/ai" element={<AISettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
