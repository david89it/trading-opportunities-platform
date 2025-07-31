/**
 * Range Slider Component
 * 
 * Reusable range slider with label, value display, and description
 */

import React from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  description?: string;
  disabled?: boolean;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  description,
  disabled = false,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(event.target.value));
  };

  // Calculate percentage for visual indication
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Label and Value */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <label
          style={{
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
        </label>
        <span
          style={{
            fontSize: '0.9rem',
            fontWeight: 'bold',
            color: 'var(--color-primary)',
            minWidth: '4rem',
            textAlign: 'right',
          }}
        >
          {formatValue(value)}
        </span>
      </div>

      {/* Slider */}
      <div style={{ position: 'relative', marginBottom: '0.25rem' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          style={{
            width: '100%',
            height: '8px',
            background: `linear-gradient(to right, 
              var(--color-primary) 0%,
              var(--color-primary) ${percentage}%,
              var(--color-border) ${percentage}%,
              var(--color-border) 100%)`,
            borderRadius: '4px',
            outline: 'none',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            // WebKit styles for the thumb
            WebkitAppearance: 'none',
          }}
        />
        
        {/* Custom thumb styling */}
        <style jsx>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--color-primary);
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            cursor: ${disabled ? 'not-allowed' : 'pointer'};
          }
          
          input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--color-primary);
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            cursor: ${disabled ? 'not-allowed' : 'pointer'};
          }
          
          input[type="range"]:disabled::-webkit-slider-thumb {
            background: var(--color-text-muted);
          }
          
          input[type="range"]:disabled::-moz-range-thumb {
            background: var(--color-text-muted);
          }
        `}</style>
      </div>

      {/* Description */}
      {description && (
        <p
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
};

export default RangeSlider;