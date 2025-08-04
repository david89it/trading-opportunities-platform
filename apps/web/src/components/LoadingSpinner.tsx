/**
 * Loading Spinner Component
 * 
 * Simple animated loading spinner
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 40,
  color = 'var(--color-primary)',
  message,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          border: `3px solid var(--color-border)`,
          borderTop: `3px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      
      {message && (
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
            margin: 0,
          }}
        >
          {message}
        </p>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;