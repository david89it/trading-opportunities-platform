/**
 * Risk Sandbox Page
 * 
 * Interactive Monte Carlo simulation interface with parameter controls
 * and real-time visualization of trading strategy risk metrics.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

import RangeSlider from '../components/RangeSlider';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

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
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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
                      P(2× or better)
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                      {(results.risk_metrics.prob_2x * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      P95 Max Drawdown
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                      {(results.risk_metrics.p95_max_drawdown * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      Sharpe Ratio
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-info)' }}>
                      {results.risk_metrics.sharpe_ratio.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Completed in {results.computation_time_ms.toFixed(0)}ms • 
                  {results.total_trades.toLocaleString()} total trades • 
                  {results.sample_equity_paths.length} sample paths
                </div>
              </div>

              {/* Placeholder for Charts */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                  marginBottom: '2rem',
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-secondary)' }}>
                  📈 Equity Curves
                </h3>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  TradingView Lightweight Charts will be integrated here.
                  <br />
                  Showing {results.sample_equity_paths.length} sample equity paths over {results.parameters.weeks} weeks.
                </p>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  padding: '2rem',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-secondary)' }}>
                  📊 Final Equity Distribution
                </h3>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  Histogram visualization will be integrated here.
                  <br />
                  Showing distribution of {results.final_equity_distribution.length.toLocaleString()} final outcomes.
                </p>
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