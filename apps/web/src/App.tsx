import { Routes, Route } from 'react-router-dom'

import Dashboard from './pages/Dashboard'
import OpportunityDetail from './pages/OpportunityDetail'
import RiskSandbox from './pages/RiskSandbox'
import ApiTest from './pages/ApiTest'
import Auth from './pages/Auth'
import Layout from './components/Layout'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/opportunity/:symbol" element={<OpportunityDetail />} />
        <Route path="/risk-sandbox" element={<RiskSandbox />} />
        <Route path="/api-test" element={<ApiTest />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </Layout>
  )
}

export default App