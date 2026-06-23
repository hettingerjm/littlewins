import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth, RequireParent } from './components/Guards'

import LandingHome from './pages/LandingHome'
import FamilyPin from './pages/FamilyPin'
import ProfileSelect from './pages/ProfileSelect'
import ChildHome from './pages/ChildHome'
import RewardsPage from './pages/RewardsPage'
import HeroPage from './pages/HeroPage'

import ParentLogin from './pages/parent/ParentLogin'
import ParentLayout from './pages/parent/ParentLayout'
import ParentDashboard from './pages/parent/ParentDashboard'
import TaskHistory from './pages/parent/TaskHistory'
import ManageTasks from './pages/parent/ManageTasks'
import ManageRewards from './pages/parent/ManageRewards'
import ManageClaims from './pages/parent/ManageClaims'
import ManageChildren from './pages/parent/ManageChildren'
import ParentSettings from './pages/parent/ParentSettings'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public entry */}
          <Route path="/" element={<LandingHome />} />
          <Route path="/f/:familyId" element={<FamilyPin />} />

          {/* Child app (any signed-in family session) */}
          <Route
            path="/who"
            element={
              <RequireAuth>
                <ProfileSelect />
              </RequireAuth>
            }
          />
          <Route
            path="/kid/:childId"
            element={
              <RequireAuth>
                <ChildHome />
              </RequireAuth>
            }
          />
          <Route
            path="/kid/:childId/rewards"
            element={
              <RequireAuth>
                <RewardsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/kid/:childId/hero"
            element={
              <RequireAuth>
                <HeroPage />
              </RequireAuth>
            }
          />

          {/* Parent area */}
          <Route path="/parent/login" element={<ParentLogin />} />
          <Route
            path="/parent"
            element={
              <RequireParent>
                <ParentLayout />
              </RequireParent>
            }
          >
            <Route index element={<ParentDashboard />} />
            <Route path="history" element={<TaskHistory />} />
            <Route path="tasks" element={<ManageTasks />} />
            <Route path="rewards" element={<ManageRewards />} />
            <Route path="claims" element={<ManageClaims />} />
            <Route path="kids" element={<ManageChildren />} />
            <Route path="settings" element={<ParentSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
