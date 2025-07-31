// Validation Utilities

import { VALIDATION_LIMITS } from './constants';

// Type guards
export const isValidPrice = (price: number): boolean => {
  return Number.isFinite(price) && 
         price >= VALIDATION_LIMITS.MIN_PRICE && 
         price <= VALIDATION_LIMITS.MAX_PRICE;
};

export const isValidVolume = (volume: number): boolean => {
  return Number.isInteger(volume) && volume >= VALIDATION_LIMITS.MIN_VOLUME;
};

export const isValidScore = (score: number): boolean => {
  return Number.isFinite(score) && score >= 0 && score <= 100;
};

export const isValidProbability = (prob: number): boolean => {
  return Number.isFinite(prob) && prob >= 0 && prob <= 1;
};

export const isValidSymbol = (symbol: string): boolean => {
  return /^[A-Z]{1,5}$/.test(symbol);
};

export const isValidTimestamp = (timestamp: string): boolean => {
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.toISOString() === timestamp;
};

// Risk validation
export const isValidRiskParams = (params: {
  riskPctPerTrade: number;
  maxHeatPct: number;
  dailyStopR: number;
  lossStreakHalt: number;
}): boolean => {
  return (
    params.riskPctPerTrade > 0 && params.riskPctPerTrade <= 0.05 && // Max 5% risk
    params.maxHeatPct > 0 && params.maxHeatPct <= 0.20 && // Max 20% heat
    params.dailyStopR < 0 && params.dailyStopR >= -10 && // Max -10R daily stop
    Number.isInteger(params.lossStreakHalt) && params.lossStreakHalt > 0
  );
};

// Trade setup validation
export const isValidTradeSetup = (setup: {
  entry: number;
  stop: number;
  target1: number;
  target2?: number;
}): boolean => {
  if (!isValidPrice(setup.entry) || !isValidPrice(setup.stop) || !isValidPrice(setup.target1)) {
    return false;
  }
  
  // For long positions: stop < entry < target1 < target2 (if exists)
  if (setup.stop < setup.entry && setup.entry < setup.target1) {
    return setup.target2 ? setup.target1 < setup.target2 : true;
  }
  
  // For short positions: stop > entry > target1 > target2 (if exists)
  if (setup.stop > setup.entry && setup.entry > setup.target1) {
    return setup.target2 ? setup.target1 > setup.target2 : true;
  }
  
  return false;
};

// Format utilities
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (value: number, decimals = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatR = (r: number, decimals = 2): string => {
  const sign = r >= 0 ? '+' : '';
  return `${sign}${r.toFixed(decimals)}R`;
};