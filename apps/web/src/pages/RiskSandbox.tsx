/**
 * Risk Sandbox Page
 * 
 * Interactive Monte Carlo simulation interface with parameter controls
 * and real-time visualization of trading strategy risk metrics.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

import RangeSlider from '../components/RangeSlider';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { EquityCurveChart } from '../components/EquityCurveChart';
import { HistogramChart } from '../components/HistogramChart';

import { runMonteCarloSimulation, handleRiskApiError } from '../services/riskApi';
import {
  MonteCarloRequest,
  MonteCarloResponse,
  PARAMETER_CONFIG,
  getDefaultParameters,
  validateParameters,
  calculateExpectedR,
  estimateSimulationTime,
} from '../types/risk';

// Local storage key for parameter persistence
const STORAGE_KEY = 'risk-sandbox-parameters';

function RiskSandbox() {
  // Parameter state
  const [parameters, setParameters] = useState<MonteCarloRequest>(() => {
    // Load from localStorage or use defaults
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getDefaultParameters();
      }
    }
    return getDefaultParameters();
  });

  // Simulation results state
  const [results, setResults] = useState<MonteCarloResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Monte Carlo simulation mutation
  const simulation = useMutation({
    mutationFn: runMonteCarloSimulation,
    onSuccess: (data) => {
      setResults(data);
      setValidationErrors([]);
    },
    onError: (error) => {
      console.error('Simulation error:', error);
      setResults(null);
    }
  });

  // Save parameters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parameters));
    
    // Validate parameters
    const errors = validateParameters(parameters);
    setValidationErrors(errors);
  }, [parameters]);

  // Update a single parameter
  const updateParameter = useCallback(<K extends keyof MonteCarloRequest>(
    key: K,
    value: MonteCarloRequest[K]
  ) => {
    setParameters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Reset parameters to defaults
  const resetParameters = useCallback(() => {
    setParameters(getDefaultParameters());
    setResults(null);
  }, []);

  // Run simulation
  const runSimulation = useCallback(() => {
    if (validationErrors.length > 0) {
      return;
    }
    simulation.mutate(parameters);
  }, [parameters, validationErrors, simulation]);

  // Calculate derived metrics
  const expectedR = calculateExpectedR(parameters);
  const estimatedTime = estimateSimulationTime(parameters);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-text-primary)' }}>
          Risk Sandbox
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Interactive Monte Carlo simulation for trading strategy analysis.
          Adjust parameters to see how different win rates, risk-reward ratios, and position sizing affect your potential outcomes.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
        {/* Parameter Controls */}
        <div>
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '1.5rem',
              position: 'sticky',
              top: '2rem',
            }}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--color-text-primary)' }}>
              Trading Parameters
            </h3>

            {/* Parameter Sliders */}
            {Object.entries(PARAMETER_CONFIG).map(([key, config]) => (
              <RangeSlider
                key={key}
                label={config.label}
                value={parameters[key as keyof MonteCarloRequest] as number}
                min={config.min}
                max={config.max}
                step={config.step}
                onChange={(value) => updateParameter(key as keyof MonteCarloRequest, value)}
                formatValue={config.format}
                description={config.description}
                disabled={simulation.isPending}
              />
            ))}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-danger-light, #fee)',
                  border: '1px solid var(--color-danger)',
                  borderRadius: '4px',
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-danger)' }}>
                  Parameter Issues:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  {validationErrors.map((error, index) => (
                    <li key={index} style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Stats */}
            <div
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: 'var(--color-background)',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
              }}
            >
              <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text-secondary)' }}>
                Quick Analysis
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem' }}>Expected R:</span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      color: expectedR > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {expectedR > 0 ? '+' : ''}{expectedR.toFixed(3)}R
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem' }}>Total Trades:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {(parameters.trades_per_week * parameters.weeks).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem' }}>Est. Time:</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    ~{(estimatedTime / 1000).toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={runSimulation}
                disabled={simulation.isPending || validationErrors.length > 0}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: simulation.isPending || validationErrors.length > 0 
                    ? 'var(--color-text-muted)' 
                    : 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: simulation.isPending || validationErrors.length > 0 
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                {simulation.isPending ? 'Running...' : 'Run Simulation'}
              </button>
              
              <button
                onClick={resetParameters}
                disabled={simulation.isPending}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  cursor: simulation.isPending ? 'not-allowed' : 'pointer',
                  opacity: simulation.isPending ? 0.5 : 1,
                }}
                title="Reset to defaults"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div>
          {simulation.isPending && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
              }}
            >
              <LoadingSpinner 
                size={50} 
                message={`Running ${parameters.num_simulations.toLocaleString()} simulations...`}
              />
            </div>
          )}

          {simulation.error && (
            <div style={{ marginBottom: '2rem' }}>
              <ErrorMessage
                message="Simulation Failed"
                details={handleRiskApiError(simulation.error)}
                onRetry={runSimulation}
              />
            </div>
          )}

          {results && !simulation.isPending && (
            <div>
              {/* Results Summary */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
                  Simulation Results
                </h3>
                
                {/* Key Performance Metrics */}
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                    gap: '1rem',
                    marginBottom: '2rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Mean Final Equity
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      ${results.mean_final_equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Median Final Equity
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      ${results.median_final_equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Expected Return
                    </div>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      color: results.mean_final_equity > results.parameters.starting_capital 
                        ? 'var(--color-success)' 
                        : 'var(--color-danger)' 
                    }}>
                      {(((results.mean_final_equity - results.parameters.starting_capital) / results.parameters.starting_capital) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Sharpe Ratio
                    </div>
                    <div style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: 'bold', 
                      color: results.risk_metrics.sharpe_ratio > 1 ? 'var(--color-success)' : 'var(--color-info)'
                    }}>
                      {results.risk_metrics.sharpe_ratio.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Probability Metrics */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ 
                    margin: '0 0 1rem 0', 
                    fontSize: '1.1rem', 
                    color: 'var(--color-text-secondary)',
                    borderBottom: '2px solid var(--color-border)',
                    paddingBottom: '0.5rem'
                  }}>
                    📊 Probability Analysis
                  </h4>
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                      gap: '1rem'
                    }}
                  >
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'var(--color-success-light, #f0f9f0)', 
                      borderRadius: '6px',
                      border: '1px solid var(--color-success, #4caf50)'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>
                        P(≥2× Return)
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                        {(results.risk_metrics.prob_2x * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'var(--color-success-light, #f0f9f0)', 
                      borderRadius: '6px',
                      border: '1px solid var(--color-success, #4caf50)'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>
                        P(≥3× Return)
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                        {(results.risk_metrics.prob_3x * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'var(--color-danger-light, #fff5f5)', 
                      borderRadius: '6px',
                      border: '1px solid var(--color-danger, #f44336)'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                        P(Loss)
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                        {(results.risk_metrics.prob_loss * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: 'var(--color-info-light, #f0f8ff)', 
                      borderRadius: '6px',
                      border: '1px solid var(--color-info, #2196f3)'
                    }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-info)' }}>
                        Win Rate
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-info)' }}>
                        {(results.risk_metrics.win_rate * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Metrics */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ 
                    margin: '0 0 1rem 0', 
                    fontSize: '1.1rem', 
                    color: 'var(--color-text-secondary)',
                    borderBottom: '2px solid var(--color-border)',
                    paddingBottom: '0.5rem'
                  }}>
                    ⚠️ Risk Analysis
                  </h4>
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        P95 Max Drawdown
                      </div>
                      <div style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: 'bold', 
                        color: results.risk_metrics.p95_max_drawdown > 0.2 ? 'var(--color-danger)' : 'var(--color-warning, #ff9800)' 
                      }}>
                        {(results.risk_metrics.p95_max_drawdown * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        VaR 95%
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                        ${Math.abs(results.risk_metrics.var_95).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        CVaR 95%
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                        ${Math.abs(results.risk_metrics.cvar_95).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        Profit Factor
                      </div>
                      <div style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: 'bold', 
                        color: results.risk_metrics.profit_factor > 1.5 ? 'var(--color-success)' : 'var(--color-warning, #ff9800)' 
                      }}>
                        {results.risk_metrics.profit_factor.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Promotion Gates Status */}
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ 
                    margin: '0 0 1rem 0', 
                    fontSize: '1.1rem', 
                    color: 'var(--color-text-secondary)',
                    borderBottom: '2px solid var(--color-border)',
                    paddingBottom: '0.5rem'
                  }}>
                    🚀 Promotion Gates (Go-Live Readiness)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      backgroundColor: results.risk_metrics.prob_2x > 0.4 ? 'var(--color-success-light, #f0f9f0)' : 'var(--color-danger-light, #fff5f5)'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {results.risk_metrics.prob_2x > 0.4 ? '✅' : '❌'}
                      </span>
                      <span style={{ fontSize: '0.9rem' }}>
                        Monte Carlo Gate: P(≥2×) &gt; 40% 
                        <strong>({(results.risk_metrics.prob_2x * 100).toFixed(1)}%)</strong>
                      </span>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      backgroundColor: results.risk_metrics.p95_max_drawdown < 0.2 ? 'var(--color-success-light, #f0f9f0)' : 'var(--color-danger-light, #fff5f5)'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {results.risk_metrics.p95_max_drawdown < 0.2 ? '✅' : '❌'}
                      </span>
                      <span style={{ fontSize: '0.9rem' }}>
                        Drawdown Gate: P95 Max DD &lt; 20% 
                        <strong>({(results.risk_metrics.p95_max_drawdown * 100).toFixed(1)}%)</strong>
                      </span>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      backgroundColor: 'var(--color-warning-light, #fffbf0)'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>⏳</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-warning)' }}>
                        Calibration Gate: Requires live signal history (≥300 trades)
                      </span>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      backgroundColor: 'var(--color-warning-light, #fffbf0)'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>⏳</span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--color-warning)' }}>
                        Expectancy Gate: Net expected R &gt; +0.1R/trade (out-of-sample)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Completed in {results.computation_time_ms.toFixed(0)}ms • 
                  {results.total_trades.toLocaleString()} total trades • 
                  {results.sample_equity_paths.length} sample paths
                </div>
              </div>

              {/* Equity Curves Chart */}
              <div style={{ marginBottom: '2rem' }}>
                <EquityCurveChart
                  simulationResults={{
                    equity_paths: results.sample_equity_paths.map(path => 
                      path.map(point => point.equity)
                    ),
                    final_equity: results.final_equity_distribution,
                    statistics: {
                      mean_final_equity: results.mean_final_equity,
                      median_final_equity: results.median_final_equity,
                      p95_max_drawdown: results.risk_metrics.p95_max_drawdown,
                      prob_2x: results.risk_metrics.prob_2x,
                      prob_3x: results.risk_metrics.prob_3x,
                      sharpe_ratio: results.risk_metrics.sharpe_ratio,
                      profit_factor: results.risk_metrics.profit_factor,
                    },
                    params: {
                      weeks: results.parameters.weeks,
                      trades_per_week: results.parameters.trades_per_week,
                    },
                  }}
                  width={800}
                  height={400}
                  showPaths={Math.min(15, results.sample_equity_paths.length)}
                  showStatistics={true}
                />
              </div>

              {/* Final Equity Distribution Chart */}
              <div>
                <HistogramChart
                  finalEquityData={results.final_equity_distribution}
                  binCount={30}
                  width={800}
                  height={400}
                  showStatistics={true}
                />
              </div>
            </div>
          )}

          {!results && !simulation.isPending && !simulation.error && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px dashed var(--color-border)',
                borderRadius: '8px',
                padding: '3rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-secondary)' }}>
                Ready to Analyze
              </h3>
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                Adjust the parameters on the left and click "Run Simulation" to see how your trading strategy might perform.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiskSandbox;