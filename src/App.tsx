import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth, RequireParent } from './components/Guards'

import LandingPin from './pages/LandingPin'
import ProfileSelect from './pages/ProfileSelect'
import ChildHome from './pages/ChildHome'
import RewardsPage from './pages/RewardsPage'

import ParentLogin from './pages/parent/ParentLogin'
import ParentLayout from './pages/parent/ParentLayout'
import ParentDashboard from './pages/parent/ParentDashboard'
import TaskHistory from './pages/parent/TaskHistory'
import ManageTasks from './pages/parent/ManageTasks'
import ManageRewards from './pages/parent/ManageRewards'
import ManageClaims from './pages/parent/ManageClaims'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing PIN gate */}
          <Route path="/" element={<LandingPin />} />

          {/* Child app (any signed-in session) */}
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
