import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { fetchOpportunityBySymbol } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

function OpportunityDetail() {
  const { symbol } = useParams<{ symbol: string }>()
  
  const {
    data: opportunity,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunity', symbol],
    queryFn: () => fetchOpportunityBySymbol(symbol!),
    enabled: !!symbol,
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <LoadingSpinner />
        <p>Loading opportunity details...</p>
      </div>
    )
  }

  if (error || !opportunity) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <ErrorMessage
          message={`Failed to load opportunity for ${symbol}`}
          onRetry={() => refetch()}
        />
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-secondary)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/"
          style={{
            color: 'var(--color-primary)',
            textDecoration: 'none',
            marginBottom: '1rem',
            display: 'inline-block',
          }}
        >
          ← Back to Dashboard
        </Link>
        
        <h1 style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          {opportunity.symbol} - Trading Opportunity
        </h1>
        
        <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0' }}>
          Signal generated: {new Date(opportunity.timestamp).toLocaleString()}
        </p>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Trade Setup Card */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
            Trade Setup
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Entry Price:</span>
              <strong>{formatCurrency(opportunity.setup.entry)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Stop Loss:</span>
              <strong style={{ color: 'var(--color-danger)' }}>
                {formatCurrency(opportunity.setup.stop)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Target 1:</span>
              <strong style={{ color: 'var(--color-success)' }}>
                {formatCurrency(opportunity.setup.target1)}
              </strong>
            </div>
            {opportunity.setup.target2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Target 2:</span>
                <strong style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(opportunity.setup.target2)}
                </strong>
              </div>
            )}
            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Risk/Reward:</span>
              <strong style={{ color: 'var(--color-info)' }}>
                {opportunity.setup.rr_ratio.toFixed(1)}:1
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Position Size:</span>
              <div style={{ textAlign: 'right' }}>
                <div><strong>{formatCurrency(opportunity.setup.position_size_usd)}</strong></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {opportunity.setup.position_size_shares} shares
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Metrics Card */}
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
            Risk Metrics
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>P(Target):</span>
              <strong>{formatPercentage(opportunity.risk.p_target)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Net Expected R:</span>
              <strong
                style={{
                  color: opportunity.risk.net_expected_r > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                }}
              >
                {opportunity.risk.net_expected_r > 0 ? '+' : ''}
                {opportunity.risk.net_expected_r.toFixed(3)}R
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Costs (R):</span>
              <span>{opportunity.risk.costs_r.toFixed(3)}R</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Slippage:</span>
              <span>{opportunity.risk.slippage_bps.toFixed(1)} bps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signal Scores */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
          Signal Scores
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              Overall Score: <strong>{opportunity.signal_score.toFixed(1)}/100</strong>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--color-border)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${opportunity.signal_score}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-info)',
                }}
              />
            </div>
          </div>
          
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              Price Score: <strong>{opportunity.scores.price.toFixed(1)}/100</strong>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--color-border)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${opportunity.scores.price}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-primary)',
                }}
              />
            </div>
          </div>
          
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              Volume Score: <strong>{opportunity.scores.volume.toFixed(1)}/100</strong>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--color-border)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${opportunity.scores.volume}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-success)',
                }}
              />
            </div>
          </div>
          
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              Volatility Score: <strong>{opportunity.scores.volatility.toFixed(1)}/100</strong>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'var(--color-border)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${opportunity.scores.volatility}%`,
                  height: '100%',
                  backgroundColor: 'var(--color-warning)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Guardrail Status */}
      <div
        style={{
          padding: '1.5rem',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)',
        }}
      >
        <h2 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
          Status
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              fontWeight: 'bold',
              backgroundColor:
                opportunity.guardrail_status === 'approved' ? 'var(--color-success)' :
                opportunity.guardrail_status === 'review' ? 'var(--color-warning)' :
                'var(--color-danger)',
              color: opportunity.guardrail_status === 'review' ? 'black' : 'white',
            }}
          >
            {opportunity.guardrail_status.toUpperCase()}
          </span>
          
          {opportunity.guardrail_reason && (
            <span style={{ color: 'var(--color-text-muted)' }}>
              {opportunity.guardrail_reason}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default OpportunityDetail