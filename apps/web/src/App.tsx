import { Routes, Route } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import OpportunityDetail from './pages/OpportunityDetail'
import RiskSandbox from './pages/RiskSandbox'
import ApiTest from './pages/ApiTest'
import Auth from './pages/Auth'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/opportunity/:symbol" element={<RequireAuth><OpportunityDetail /></RequireAuth>} />
        <Route path="/risk-sandbox" element={<RequireAuth><RiskSandbox /></RequireAuth>} />
        <Route path="/api-test" element={<RequireAuth><ApiTest /></RequireAuth>} />
      </Routes>
    </Layout>
  )
}

export default App