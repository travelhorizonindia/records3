import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { DataCacheProvider } from './context/DataCacheContext.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import Layout from './components/layout/Layout.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import EnquiriesPage from './pages/EnquiriesPage.jsx'
import VehiclesPage from './pages/VehiclesPage.jsx'
import DriversPage from './pages/DriversPage.jsx'
import AgentsPage from './pages/AgentsPage.jsx'
import CustomersPage from './pages/CustomersPage.jsx'
import ExpensesPage from './pages/ExpensesPage.jsx'
import QuoteConfigPage from './pages/settings/QuoteConfigPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataCacheProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/enquiries" element={<EnquiriesPage />} />
                      <Route path="/vehicles" element={<VehiclesPage />} />
                      <Route path="/drivers" element={<DriversPage />} />
                      <Route path="/agents" element={<AgentsPage />} />
                      <Route path="/customers" element={<CustomersPage />} />
                      <Route path="/expenses" element={<ExpensesPage />} />
                      <Route path="/settings/quote-config" element={<QuoteConfigPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </DataCacheProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
