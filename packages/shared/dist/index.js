"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  API_CONFIG: () => API_CONFIG,
  DEFAULT_MC_PARAMS: () => DEFAULT_MC_PARAMS,
  DEFAULT_RISK_PARAMS: () => DEFAULT_RISK_PARAMS,
  MARKET_SCHEDULE: () => MARKET_SCHEDULE,
  PROMOTION_GATES: () => PROMOTION_GATES,
  SCORING: () => SCORING,
  VALIDATION_LIMITS: () => VALIDATION_LIMITS,
  formatCurrency: () => formatCurrency,
  formatPercentage: () => formatPercentage,
  formatR: () => formatR,
  isValidPrice: () => isValidPrice,
  isValidProbability: () => isValidProbability,
  isValidRiskParams: () => isValidRiskParams,
  isValidScore: () => isValidScore,
  isValidSymbol: () => isValidSymbol,
  isValidTimestamp: () => isValidTimestamp,
  isValidTradeSetup: () => isValidTradeSetup,
  isValidVolume: () => isValidVolume
});
module.exports = __toCommonJS(index_exports);

// src/utils/constants.ts
var DEFAULT_RISK_PARAMS = {
  RISK_PCT_PER_TRADE: 5e-3,
  // 0.5%
  MAX_HEAT_PCT: 0.02,
  // 2%
  DAILY_STOP_R: -2,
  // -2R daily stop
  LOSS_STREAK_HALT: 8
  // Halt after 8 consecutive losses
};
var DEFAULT_MC_PARAMS = {
  P_WIN: 0.33,
  // 33% win rate
  R_WIN: 3,
  // 3R average win
  RISK_PCT: 5e-3,
  // 0.5% risk per trade
  TRADES_PER_WEEK: 10,
  // 10 trades per week
  WEEKS: 52,
  // 1 year simulation
  COST_PER_TRADE_USD: 1,
  // $1 per trade
  SLIPPAGE_BPS: 10
  // 10 basis points slippage
};
var PROMOTION_GATES = {
  CALIBRATION_ERROR_MAX: 0.1,
  // 10% max calibration error
  EXPECTANCY_MIN: 0.1,
  // Minimum 0.1R/trade expectancy
  MIN_TRADES_FOR_VALIDATION: 300,
  // Minimum trades for validation
  MC_PROB_DOUBLE_MIN: 0.4,
  // 40% chance to double in 1 year
  MC_MAX_DRAWDOWN_P95: 0.2
  // 95th percentile max drawdown < 20%
};
var API_CONFIG = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
  CACHE_TTL_SECONDS: 300,
  // 5 minutes
  RATE_LIMIT_PER_MINUTE: 100
};
var MARKET_SCHEDULE = {
  PREMARKET_START: "04:00",
  // 4:00 AM ET
  REGULAR_START: "09:30",
  // 9:30 AM ET
  REGULAR_END: "16:00",
  // 4:00 PM ET
  AFTERHOURS_END: "20:00"
  // 8:00 PM ET
};
var SCORING = {
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  SIGNAL_THRESHOLD: 70
  // Minimum score for signal generation
};
var VALIDATION_LIMITS = {
  MIN_PRICE: 0.01,
  MAX_PRICE: 1e4,
  MIN_VOLUME: 1e3,
  // Minimum daily volume
  MIN_MARKET_CAP: 1e8,
  // $100M minimum market cap
  MAX_SPREAD_BPS: 50
  // Maximum 50 bps spread
};

// src/utils/validation.ts
var isValidPrice = (price) => {
  return Number.isFinite(price) && price >= VALIDATION_LIMITS.MIN_PRICE && price <= VALIDATION_LIMITS.MAX_PRICE;
};
var isValidVolume = (volume) => {
  return Number.isInteger(volume) && volume >= VALIDATION_LIMITS.MIN_VOLUME;
};
var isValidScore = (score) => {
  return Number.isFinite(score) && score >= 0 && score <= 100;
};
var isValidProbability = (prob) => {
  return Number.isFinite(prob) && prob >= 0 && prob <= 1;
};
var isValidSymbol = (symbol) => {
  return /^[A-Z]{1,5}$/.test(symbol);
};
var isValidTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.toISOString() === timestamp;
};
var isValidRiskParams = (params) => {
  return params.riskPctPerTrade > 0 && params.riskPctPerTrade <= 0.05 && // Max 5% risk
  params.maxHeatPct > 0 && params.maxHeatPct <= 0.2 && // Max 20% heat
  params.dailyStopR < 0 && params.dailyStopR >= -10 && // Max -10R daily stop
  Number.isInteger(params.lossStreakHalt) && params.lossStreakHalt > 0;
};
var isValidTradeSetup = (setup) => {
  if (!isValidPrice(setup.entry) || !isValidPrice(setup.stop) || !isValidPrice(setup.target1)) {
    return false;
  }
  if (setup.stop < setup.entry && setup.entry < setup.target1) {
    return setup.target2 ? setup.target1 < setup.target2 : true;
  }
  if (setup.stop > setup.entry && setup.entry > setup.target1) {
    return setup.target2 ? setup.target1 > setup.target2 : true;
  }
  return false;
};
var formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
var formatPercentage = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};
var formatR = (r, decimals = 2) => {
  const sign = r >= 0 ? "+" : "";
  return `${sign}${r.toFixed(decimals)}R`;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  API_CONFIG,
  DEFAULT_MC_PARAMS,
  DEFAULT_RISK_PARAMS,
  MARKET_SCHEDULE,
  PROMOTION_GATES,
  SCORING,
  VALIDATION_LIMITS,
  formatCurrency,
  formatPercentage,
  formatR,
  isValidPrice,
  isValidProbability,
  isValidRiskParams,
  isValidScore,
  isValidSymbol,
  isValidTimestamp,
  isValidTradeSetup,
  isValidVolume
});
