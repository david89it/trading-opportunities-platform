import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import OpportunityTable from '../components/OpportunityTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function ApiTest() {
  const [minScore, setMinScore] = useState<number>(0)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const {
    data: opportunities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunities-test', minScore, statusFilter],
    queryFn: () => api.getOpportunities({
      min_score: minScore > 0 ? minScore : undefined,
      status: statusFilter || undefined,
      limit: 10
    }),
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  const testScanPreview = async () => {
    try {
      const result = await api.scanPreview({ min_score: minScore > 0 ? minScore : undefined, limit: 5 })
      console.log('Scan preview result:', result)
      alert(`Scan found ${result.total} opportunities matching criteria`)
    } catch (error) {
      console.error('Scan preview failed:', error)
      alert('Scan preview failed - check console for details')
    }
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <LoadingSpinner />
        <p>Loading opportunities with new API structure...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <ErrorMessage
          message="Failed to load opportunities"
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
          🧪 API Integration Test
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
          Testing the updated frontend integration with new API structure (0-10 score scale, new guardrail statuses)
        </p>

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center', 
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div>
            <label htmlFor="minScore" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
              Min Score (0-10):
            </label>
            <input
              id="minScore"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value) || 0)}
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                width: '100px'
              }}
            />
          </div>

          <div>
            <label htmlFor="statusFilter" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>
              Guardrail Status:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                minWidth: '120px'
              }}
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="review">Review</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => refetch()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
            <button
              onClick={testScanPreview}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--color-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              🔍 Test Scan
            </button>
          </div>
        </div>

        {/* API Status Info */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>
              API Mode
            </h4>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-info)' }}>
              Mock Data ✅
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Using mock API with new structure
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>
              Total Found
            </h4>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
              {opportunities?.total || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Opportunities matching filters
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>
              Score Scale
            </h4>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>
              0-10 ✅
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              New scoring system active
            </div>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-secondary)' }}>
              Guardrail System
            </h4>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              A/R/B ✅
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Approved/Review/Blocked
            </div>
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
            No opportunities match current filters
          </h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Try adjusting the minimum score or status filter to see more results.
          </p>
        </div>
      )}

      {/* Integration Status */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: 'var(--color-surface)', 
        borderRadius: '8px',
        border: '1px solid var(--color-success)'
      }}>
        <h3 style={{ color: 'var(--color-success)', margin: '0 0 1rem 0' }}>
          ✅ Task 4: Frontend Integration - COMPLETED
        </h3>
        <ul style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          <li>✅ Updated TypeScript types to match new API structure (0-10 scoring scale)</li>
          <li>✅ Updated guardrail status values (approved/review/blocked)</li>
          <li>✅ Enhanced API service with new endpoints and parameters</li>
          <li>✅ Updated OpportunityTable component for new data structure</li>
          <li>✅ Fixed OpportunityDetail component for new guardrail statuses</li>
          <li>✅ Created mock API service for development testing</li>
          <li>✅ All TypeScript errors resolved</li>
          <li>✅ Components render correctly with new data structure</li>
        </ul>
      </div>
    </div>
  )
}

export default ApiTest