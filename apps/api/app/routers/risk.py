"""
Risk Management Router

FastAPI router for risk management endpoints including Monte Carlo simulations
and risk analytics.
"""

import time
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.models.risk import (
    MonteCarloRequest,
    MonteCarloResponse,
    RiskMetrics,
    EquityPathData,
    ErrorResponse,
    MONTE_CARLO_EXAMPLE_REQUEST,
    MONTE_CARLO_EXAMPLE_RESPONSE
)
from app.risk.monte_carlo import (
    SimulationParameters,
    run_monte_carlo_simulation,
    get_sample_paths,
    calculate_risk_metrics
)

router = APIRouter()


@router.post(
    "/montecarlo",
    response_model=MonteCarloResponse,
    status_code=status.HTTP_200_OK,
    summary="Run Monte Carlo Risk Simulation",
    description="""
    Run a Monte Carlo simulation to analyze trading strategy risk and return characteristics.
    
    This endpoint accepts trading parameters and returns comprehensive risk analytics including:
    - Probability distributions of returns
    - Risk metrics (VaR, drawdown, Sharpe ratio)
    - Sample equity curves for visualization
    - Final equity distribution for histogram display
    
    **Parameters:**
    - `p_win`: Probability of winning trades (0.0-1.0)
    - `r_win`: Risk-reward ratio for wins (e.g., 2.5 = 2.5:1)
    - `risk_pct`: Risk per trade as % of account (e.g., 0.005 = 0.5%)
    - `trades_per_week`: Number of trades per week
    - `weeks`: Simulation duration in weeks
    - `cost_per_trade_usd`: Fixed cost per trade
    - `slippage_bps`: Slippage in basis points
    - `starting_capital`: Starting account size
    - `num_simulations`: Number of Monte Carlo paths
    
    **Returns:**
    - Summary statistics of final equity
    - Risk metrics and probabilities
    - Sample equity paths for charting
    - Final equity distribution for histogram
    """,
    responses={
        200: {
            "description": "Successful simulation",
            "content": {
                "application/json": {
                    "example": MONTE_CARLO_EXAMPLE_RESPONSE
                }
            }
        },
        400: {
            "description": "Invalid input parameters",
            "model": ErrorResponse
        },
        422: {
            "description": "Validation error",
            "model": ErrorResponse
        },
        500: {
            "description": "Internal server error",
            "model": ErrorResponse
        }
    }
)
async def run_monte_carlo(request: MonteCarloRequest):
    """
    Run Monte Carlo simulation for trading strategy analysis
    
    This endpoint performs a Monte Carlo simulation based on the provided
    trading parameters and returns comprehensive risk analytics.
    """
    try:
        start_time = time.time()
        
        # Convert Pydantic model to simulation parameters
        sim_params = SimulationParameters(
            p_win=request.p_win,
            r_win=request.r_win,
            risk_pct=request.risk_pct,
            trades_per_week=request.trades_per_week,
            weeks=request.weeks,
            cost_per_trade_usd=request.cost_per_trade_usd,
            slippage_bps=request.slippage_bps,
            starting_capital=request.starting_capital,
            num_simulations=request.num_simulations
        )
        
        # Run the simulation
        results = run_monte_carlo_simulation(sim_params)
        
        # Calculate additional risk metrics
        additional_metrics = calculate_risk_metrics(results)
        
        # Create risk metrics response
        risk_metrics = RiskMetrics(
            prob_2x=results.prob_2x,
            prob_3x=results.prob_3x,
            prob_loss=results.prob_loss,
            p95_max_drawdown=results.p95_max_drawdown,
            sharpe_ratio=results.sharpe_ratio,
            var_95=additional_metrics["var_95"],
            cvar_95=additional_metrics["cvar_95"],
            win_rate=additional_metrics["win_rate"],
            profit_factor=additional_metrics["profit_factor"]
        )
        
        # Get sample equity paths for visualization (limit to 20 paths)
        sample_paths = get_sample_paths(results, num_paths=20)
        
        # Convert sample paths to API format
        sample_equity_paths = []
        for path in sample_paths:
            path_data = []
            for week, equity in enumerate(path):
                path_data.append(EquityPathData(week=week, equity=float(equity)))
            sample_equity_paths.append(path_data)
        
        # Get final equity distribution (sample if too large)
        final_equity_dist = results.final_equity.tolist()
        if len(final_equity_dist) > 1000:
            # Sample 1000 points for histogram
            import numpy as np
            indices = np.linspace(0, len(final_equity_dist) - 1, 1000, dtype=int)
            final_equity_dist = [final_equity_dist[i] for i in indices]
        
        computation_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        total_trades = request.trades_per_week * request.weeks
        
        # Create response
        response = MonteCarloResponse(
            parameters=request,
            mean_final_equity=float(results.mean_final_equity),
            median_final_equity=float(results.median_final_equity),
            std_final_equity=float(results.std_final_equity),
            min_equity=float(results.min_equity),
            max_equity=float(results.max_equity),
            risk_metrics=risk_metrics,
            sample_equity_paths=sample_equity_paths,
            final_equity_distribution=final_equity_dist,
            timestamp=datetime.now(timezone.utc),
            computation_time_ms=computation_time,
            total_trades=total_trades
        )
        
        return response
        
    except ValueError as e:
        # Parameter validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "InvalidParameters",
                "message": str(e),
                "details": {"parameter_validation": "One or more parameters are invalid"}
            }
        )
    
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "SimulationError",
                "message": "An error occurred during simulation",
                "details": {"error_type": type(e).__name__, "error_message": str(e)}
            }
        )


@router.get(
    "/montecarlo/example",
    response_model=dict,
    summary="Get Example Monte Carlo Request",
    description="Returns an example request body for the Monte Carlo simulation endpoint"
)
async def get_monte_carlo_example():
    """Get example request parameters for Monte Carlo simulation"""
    return {
        "example_request": MONTE_CARLO_EXAMPLE_REQUEST,
        "description": "Use these parameters as a starting point for your Monte Carlo simulation",
        "parameter_explanations": {
            "p_win": "45% win rate - typical for systematic strategies",
            "r_win": "2.5:1 risk-reward ratio - good asymmetric setup",
            "risk_pct": "0.5% risk per trade - conservative position sizing",
            "trades_per_week": "10 trades per week - active but manageable",
            "weeks": "52 weeks = 1 year simulation",
            "cost_per_trade_usd": "$1 per trade - typical broker commission",
            "slippage_bps": "10 basis points - realistic market impact",
            "starting_capital": "$10,000 starting capital",
            "num_simulations": "1,000 Monte Carlo paths for good statistical power"
        }
    }


@router.get(
    "/health",
    summary="Risk Module Health Check",
    description="Check if the risk management module is operational"
)
async def risk_health_check():
    """Health check for risk management module"""
    try:
        # Test that numpy is available and working
        import numpy as np
        test_array = np.array([1, 2, 3])
        
        # Test that our monte carlo module loads
        from app.risk.monte_carlo import SimulationParameters
        
        return {
            "status": "healthy",
            "module": "risk_management",
            "numpy_version": np.__version__,
            "capabilities": [
                "monte_carlo_simulation",
                "risk_metrics_calculation",
                "equity_path_generation"
            ],
            "timestamp": datetime.now(timezone.utc)
        }
    except ImportError as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": f"Missing dependency: {e}",
                "timestamp": datetime.now(timezone.utc)
            }
        )