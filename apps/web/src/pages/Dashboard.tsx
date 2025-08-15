import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Opportunity } from '@alpha-scanner/shared'

import api, { fetchOpportunities } from '../services/api'
import { useEffect, useState } from 'react'
// Using native buttons styled via local CSS to avoid type issues with Nova React typings
import { GenericCalendarTiny } from '@visa/nova-icons-react'
import OpportunityTable from '../components/OpportunityTable'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function Dashboard() {
  const queryClient = useQueryClient()
  const [minScore, setMinScore] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [approvedOnly, setApprovedOnly] = useState<boolean>(false)

  const {
    data: opportunities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunities', { minScore, statusFilter, approvedOnly }],
    queryFn: () => fetchOpportunities({ min_score: minScore, status: approvedOnly ? 'approved' : statusFilter }),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const preview = useMutation({
    mutationFn: () => api.scanPreview({ limit: 20, min_score: minScore ?? 60 }),
    onSuccess: (data) => {
      // Replace current opportunities with preview results
      queryClient.setQueryData(['opportunities', { minScore, statusFilter, approvedOnly }], data)
    },
  })

  const [listName, setListName] = useState<string>('')
  const [lastSavedName, setLastSavedName] = useState<string | undefined>('')
  const persist = useMutation({
    mutationFn: () => api.persistOpportunities({ limit: 20, min_score: minScore ?? 60, name: listName || undefined }),
    onSuccess: (res) => {
      if (res?.name) setLastSavedName(res.name)
    },
  })

  const loadRecent = useMutation({
    mutationFn: () => api.getRecentOpportunities({ limit: 50 }),
    onSuccess: (data) => {
      queryClient.setQueryData(['opportunities', { minScore, statusFilter, approvedOnly }], data)
    },
  })

  useEffect(() => {
    api.getLastSavedListName().then((r) => setLastSavedName(r.name || undefined)).catch(() => {})
  }, [])

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
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--color-surface-elev)',
          border: '1px solid var(--color-border)',
          borderTop: '3px solid var(--color-primary)',
          boxShadow: 'var(--elev-2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h1 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
            Trading Opportunities
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn--neutral" onClick={() => refetch()}>
              Refresh
            </button>
            <button className="btn btn--primary" onClick={() => preview.mutate()} disabled={preview.isPending}>
              {preview.isPending ? 'Running…' : 'Run Preview'}
            </button>
            <input
              type="text"
              placeholder="List name (optional)"
              value={listName}
              onChange={(e) => setListName(e.currentTarget.value)}
              style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)' }}
            />
            <button className="btn btn--outline" onClick={() => persist.mutate()} disabled={persist.isPending}>
              {persist.isPending ? 'Saving…' : persist.isSuccess ? 'Saved' : 'Save Current List'}
            </button>
            <button className="btn btn--outline" onClick={() => loadRecent.mutate()} disabled={loadRecent.isPending}>
              {loadRecent.isPending ? 'Loading…' : loadRecent.isSuccess ? 'Loaded' : 'Load Recent'}
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--color-text-secondary)', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>{opportunities?.total || 0} opportunities found</span>
          <span><GenericCalendarTiny style={{ verticalAlign: 'middle' }} /> {new Date().toLocaleTimeString()}</span>
          {lastSavedName && (
            <div title="Last saved list name" style={{ marginLeft: 'auto' }}>
              <span style={{ padding: '0.25rem 0.5rem', borderRadius: 6, background: '#374151', color: '#d1d5db' }}>
                Saved: {lastSavedName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0.85rem 1.1rem',
          backgroundColor: 'var(--color-surface) ',
          border: '1px solid var(--color-border)',
          borderLeft: '3px solid #22314a'
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Min Score</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={minScore ?? ''}
            onChange={(e) => setMinScore(e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
            placeholder="e.g. 60"
            style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Status</span>
          <select
            value={statusFilter ?? ''}
            onChange={(e) => setStatusFilter(e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)' }}
          >
            <option value="">All</option>
            <option value="approved">Approved</option>
            <option value="review">Review</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={approvedOnly}
            onChange={(e) => setApprovedOnly(e.currentTarget.checked)}
          />
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Approved only</span>
        </label>
        <button className="btn btn--neutral" onClick={() => refetch()}>Apply</button>
        {(minScore !== undefined || statusFilter || approvedOnly) && (
          <button className="btn btn--outline" onClick={() => { setMinScore(undefined); setStatusFilter(undefined); setApprovedOnly(false); }}>Clear Filters</button>
        )}
        {(minScore !== undefined || statusFilter || approvedOnly) && (
          <div style={{
            marginLeft: 'auto',
            padding: '0.35rem 0.6rem',
            borderRadius: 9999,
            backgroundColor: '#1f2937',
            color: 'var(--color-text-secondary)',
            fontSize: '0.8rem'
          }}>
            Active: {minScore !== undefined ? `min_score ≥ ${minScore}` : '—'}{statusFilter ? ` • status: ${statusFilter}` : ''}{approvedOnly ? ' • approved only' : ''}
          </div>
        )}
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
            Market conditions may not be favorable, or current filters may be too restrictive.
          </p>
          <button onClick={() => refetch()} className="btn btn--neutral" style={{ marginTop: '1rem' }}>
            Check Again
          </button>
          {(minScore !== undefined || statusFilter) && (
            <button onClick={() => { setMinScore(undefined); setStatusFilter(undefined); }} className="btn btn--outline" style={{ marginTop: '1rem', marginLeft: '0.5rem' }}>
              Clear Filters
            </button>
          )}
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