import { useQuery } from '@tanstack/react-query'
import { Opportunity } from '@alpha-scanner/shared'

import { fetchOpportunities } from '../services/api'
import OpportunityTable from '../components/OpportunityTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function Dashboard() {
  const {
    data: opportunities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => fetchOpportunities(),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <LoadingSpinner />
        <p>Loading trading opportunities...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <ErrorMessage
          message="Failed to load trading opportunities"
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            Trading Opportunities
          </h1>
          <button onClick={() => refetch()} style={{ padding: '0.5rem 1rem' }}>
            🔄 Refresh
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', color: 'var(--color-text-secondary)' }}>
          <div>
            <strong>{opportunities?.total || 0}</strong> opportunities found
          </div>
          <div>
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      {opportunities && opportunities.opportunities.length > 0 ? (
        <OpportunityTable opportunities={opportunities.opportunities} />
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3 style={{ color: 'var(--color-text-secondary)' }}>
            No opportunities found
          </h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            The scanner hasn't identified any trading opportunities that meet the current criteria.
            <br />
            Market conditions may not be favorable, or all signals may be filtered by risk management rules.
          </p>
          <button onClick={() => refetch()} style={{ marginTop: '1rem' }}>
            Check Again
          </button>
        </div>
      )}

      {/* Quick Stats */}
      {opportunities && opportunities.opportunities.length > 0 && (
        <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>
              Avg Signal Score
            </h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-info)' }}>
              {(
                opportunities.opportunities.reduce((sum: number, opp: Opportunity) => sum + opp.signal_score, 0) /
                opportunities.opportunities.length
              ).toFixed(1)}
            </div>
          </div>
          
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>
              Avg R:R Ratio
            </h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
              {(
                opportunities.opportunities.reduce((sum: number, opp: Opportunity) => sum + opp.setup.rr_ratio, 0) /
                opportunities.opportunities.length
              ).toFixed(1)}:1
            </div>
          </div>
          
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>
              Blocked Signals
            </h4>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
              {opportunities.opportunities.filter((opp: Opportunity) => opp.guardrail_status === 'blocked').length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard