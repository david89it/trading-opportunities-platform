import { Link } from 'react-router-dom'
import type { Opportunity } from '@alpha-scanner/shared'

interface OpportunityTableProps {
  opportunities: Opportunity[]
}

function OpportunityTable({ opportunities }: OpportunityTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercentage = (value: number, decimals = 2) => {
    return `${(value * 100).toFixed(decimals)}%`
  }

  const formatR = (r: number, decimals = 2) => {
    const sign = r >= 0 ? '+' : ''
    return `${sign}${r.toFixed(decimals)}R`
  }

  const getGuardrailBadge = (status: string, reason?: string) => {
    const styles = {
      approved: { backgroundColor: 'var(--color-success)', color: 'white' },
      review: { backgroundColor: 'var(--color-warning)', color: 'black' },
      blocked: { backgroundColor: 'var(--color-danger)', color: 'white' },
    }

    const style = styles[status as keyof typeof styles] || styles.approved

    return (
      <span
        style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          ...style,
        }}
        title={reason}
      >
        {status.toUpperCase()}
      </span>
    )
  }

  const getScoreBar = (score: number, maxScore = 10) => {
    const percentage = (score / maxScore) * 100
    const normalized = score / maxScore * 10
    const color = normalized >= 8 ? 'var(--color-success)' : 
                  normalized >= 6 ? 'var(--color-warning)' : 
                  'var(--color-danger)'

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            width: '100px',
            height: '8px',
            backgroundColor: 'var(--color-border)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: color,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: '0.75rem', minWidth: '3rem', color: 'var(--color-text-muted)' }}>
          {maxScore === 100 ? `${score.toFixed(1)}` : score.toFixed(1)}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-background)' }}>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
              Symbol
            </th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
              Signal Score
            </th>
            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
              Sub-Scores
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              Entry / Stop / Target
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              R:R Ratio
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              P(Target)
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              Net Exp. R
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              Position Size
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              Micro
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              Status
            </th>
            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)' }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opportunity) => (
            <tr
              key={opportunity.id}
              style={{
                borderBottom: '1px solid var(--color-border)',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-background)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <td style={{ padding: '1rem' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                    {opportunity.symbol}
                  </strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {new Date(opportunity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </td>
              
              <td style={{ padding: '1rem' }}>
                {getScoreBar(opportunity.signal_score, 100)}
              </td>
              <td style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '2.2rem' }}>Price</span>
                    {getScoreBar(opportunity.scores.price as unknown as number, 100)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '2.2rem' }}>Volume</span>
                    {getScoreBar(opportunity.scores.volume as unknown as number, 100)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', minWidth: '2.2rem' }}>Vol</span>
                    {getScoreBar(opportunity.scores.volatility as unknown as number, 100)}
                  </div>
                </div>
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem' }}>
                  <div>{formatCurrency(opportunity.setup.entry)}</div>
                  <div style={{ color: 'var(--color-danger)' }}>
                    {formatCurrency(opportunity.setup.stop)}
                  </div>
                  <div style={{ color: 'var(--color-success)' }}>
                    {formatCurrency(opportunity.setup.target1)}
                  </div>
                  {opportunity.setup.target2 && (
                    <div style={{ color: 'var(--color-success)', opacity: 0.7 }}>
                      {formatCurrency(opportunity.setup.target2)}
                    </div>
                  )}
                </div>
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    color: opportunity.setup.rr_ratio >= 3 ? 'var(--color-success)' : 'var(--color-warning)',
                  }}
                >
                  {opportunity.setup.rr_ratio.toFixed(1)}:1
                </span>
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {formatPercentage(opportunity.risk.p_target)}
                </span>
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: opportunity.risk.net_expected_r > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  }}
                >
                  {formatR(opportunity.risk.net_expected_r)}
                </span>
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem' }}>
                  <div>{formatCurrency(opportunity.setup.position_size_usd)}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {opportunity.setup.position_size_shares} shares
                  </div>
                </div>
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                <div>
                  <span title="Bid-ask spread in basis points">{typeof opportunity.features['bid_ask_spread_bps'] === 'number' ? `${(opportunity.features['bid_ask_spread_bps'] as number).toFixed(1)} bps` : '—'}</span>
                </div>
                <div>
                  {(() => {
                    const v = opportunity.features['volume_sma_20'] as number | undefined
                    const p = (opportunity.features['ema_20'] as number | undefined) || (opportunity.features['vwap'] as number | undefined)
                    if (v && p) {
                      const addv = v * p
                      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(addv)
                    }
                    return '—'
                  })()}
                </div>
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                {getGuardrailBadge(opportunity.guardrail_status, opportunity.guardrail_reason)}
              </td>
              
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <Link
                  to={`/opportunity/${opportunity.symbol}`}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                  }}
                >
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Optional micro-details row: spread and ADDV */}
      <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <span style={{ marginRight: '1rem' }}>
          Spread: {typeof opportunities?.[0]?.features?.['bid_ask_spread_bps'] === 'number' ? `${(opportunities[0].features['bid_ask_spread_bps'] as number).toFixed(1)} bps` : '—'}
        </span>
        <span>
          ADDV: {(() => {
            const v = opportunities?.[0]?.features?.['volume_sma_20'] as number | undefined
            const p = (opportunities?.[0]?.features?.['ema_20'] as number | undefined) || undefined
            if (v && p) {
              const addv = v * p
              return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(addv)
            }
            return '—'
          })()}
        </span>
      </div>
    </div>
  )
}

export default OpportunityTable