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
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')

  const {
    data: opportunities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => fetchOpportunities({}),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Client-side filtering for better UX
  const filteredOpportunities = opportunities?.opportunities.filter(opp => {
    // Status filter
    if (statusFilter !== 'all' && opp.guardrail_status !== statusFilter) return false
    
    // Risk filter (based on volatility)
    if (riskFilter !== 'all') {
      const volatility = opp.scores.volatility as number
      if (riskFilter === 'low' && volatility >= 50) return false
      if (riskFilter === 'medium' && (volatility < 30 || volatility >= 70)) return false
      if (riskFilter === 'high' && volatility < 70) return false
    }
    
    return true
  }) || []

  const preview = useMutation({
    mutationFn: () => api.scanPreview({ limit: 20, min_score: 35 }),
    onSuccess: (data) => {
      queryClient.setQueryData(['opportunities'], data)
    },
  })

  const [listName, setListName] = useState<string>('')
  const [lastSavedName, setLastSavedName] = useState<string | undefined>('')
  const persist = useMutation({
    mutationFn: () => api.persistOpportunities({ limit: 20, min_score: 35, name: listName || undefined }),
    onSuccess: (res) => {
      if (res?.name) setLastSavedName(res.name)
    },
  })

  const loadRecent = useMutation({
    mutationFn: () => api.getRecentOpportunities({ limit: 50 }),
    onSuccess: (data) => {
      queryClient.setQueryData(['opportunities'], data)
    },
  })

  // Utility: Export to CSV
  const exportToCSV = () => {
    const headers = ['Symbol', 'Score', 'Entry', 'Stop', 'Target 1', 'R:R', 'P(Target)', 'Net R', 'Position $', 'Shares', 'Status']
    const rows = filteredOpportunities.map(opp => [
      opp.symbol,
      opp.signal_score.toFixed(1),
      opp.setup.entry.toFixed(2),
      opp.setup.stop.toFixed(2),
      opp.setup.target1.toFixed(2),
      `${opp.setup.rr_ratio.toFixed(1)}:1`,
      `${(opp.risk.p_target * 100).toFixed(1)}%`,
      `${opp.risk.net_expected_r > 0 ? '+' : ''}${opp.risk.net_expected_r.toFixed(3)}R`,
      opp.setup.position_size_usd.toFixed(2),
      opp.setup.position_size_shares,
      opp.guardrail_status.toUpperCase()
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alpha-scanner-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Utility: Copy all trade setups
  const copyAllSetups = () => {
    const text = filteredOpportunities.map(opp => {
      return [
        `${opp.symbol} (Score: ${opp.signal_score.toFixed(1)})`,
        `Entry: $${opp.setup.entry.toFixed(2)}`,
        `Stop: $${opp.setup.stop.toFixed(2)}`,
        `Target 1: $${opp.setup.target1.toFixed(2)}`,
        `R:R: ${opp.setup.rr_ratio.toFixed(1)}:1`,
        `Position: ${opp.setup.position_size_shares} shares ($${opp.setup.position_size_usd.toFixed(2)})`,
        `P(Target): ${(opp.risk.p_target * 100).toFixed(1)}%`,
        `Status: ${opp.guardrail_status.toUpperCase()}`,
        ''
      ].join('\n')
    }).join('\n---\n\n')
    
    navigator.clipboard.writeText(text).then(() => {
      alert('All trade setups copied to clipboard!')
    })
  }

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

      {/* Filter & Actions Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '0.85rem 1.1rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderLeft: '3px solid var(--color-primary)',
          boxShadow: 'var(--elev-1)'
        }}
      >
        {/* Filters */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.currentTarget.value)}
            style={{ 
              padding: '0.5rem 0.7rem', 
              borderRadius: 6, 
              border: '1px solid var(--color-border)', 
              background: 'var(--color-surface-elev)', 
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="review">Review</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Risk Level</span>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.currentTarget.value)}
            style={{ 
              padding: '0.5rem 0.7rem', 
              borderRadius: 6, 
              border: '1px solid var(--color-border)', 
              background: 'var(--color-surface-elev)', 
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">All</option>
            <option value="low">Low (Conservative)</option>
            <option value="medium">Medium (Balanced)</option>
            <option value="high">High (Aggressive)</option>
          </select>
        </label>

        {/* Results Count */}
        <div style={{
          padding: '0.5rem 0.75rem',
          borderRadius: 6,
          backgroundColor: 'var(--color-surface-elev)',
          border: '1px solid var(--color-border)',
          fontSize: '0.9rem',
          color: 'var(--color-text-primary)',
          fontWeight: '600'
        }}>
          {filteredOpportunities.length} {filteredOpportunities.length !== opportunities?.total ? `of ${opportunities?.total || 0}` : ''} signals
        </div>

        {/* Quick Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn--primary" 
            onClick={() => preview.mutate()} 
            disabled={preview.isPending}
            title="Run new scan for fresh signals"
          >
            {preview.isPending ? '🔄 Scanning...' : '🎯 Scan Now'}
          </button>
          <button 
            className="btn btn--neutral" 
            onClick={exportToCSV}
            disabled={filteredOpportunities.length === 0}
            title="Export filtered results to CSV"
          >
            📊 Export CSV
          </button>
          <button 
            className="btn btn--outline" 
            onClick={copyAllSetups}
            disabled={filteredOpportunities.length === 0}
            title="Copy all trade setups to clipboard"
          >
            📋 Copy All
          </button>
        </div>
      </div>

      {/* Opportunities Table */}
      {filteredOpportunities.length > 0 ? (
        <OpportunityTable opportunities={filteredOpportunities} />
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