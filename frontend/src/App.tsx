import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/layouts/AppLayout'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Companies } from '@/pages/Companies'
import { CompanyDetail } from '@/pages/CompanyDetail'
import { NewAnalysis } from '@/pages/NewAnalysis'
import { AnalysisDetail } from '@/pages/AnalysisDetail'
import { ClaimExplorer } from '@/pages/ClaimExplorer'
import { Fairness } from '@/pages/Fairness'
import { AuditLog } from '@/pages/AuditLog'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/analysis" element={<NewAnalysis />} />
          <Route path="/analysis/:id" element={<AnalysisDetail />} />
          <Route path="/claims" element={<ClaimExplorer />} />
          <Route path="/fairness" element={<Fairness />} />
          <Route path="/audit" element={<AuditLog />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
