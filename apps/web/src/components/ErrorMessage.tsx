interface ErrorMessageProps {
  message: string
  details?: string
  onRetry?: () => void
}

function ErrorMessage({ message, details, onRetry }: ErrorMessageProps) {
  return (
    <div
      style={{
        padding: '2rem',
        backgroundColor: 'var(--color-surface)',
        border: `1px solid var(--color-danger)`,
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          fontSize: '2rem',
          marginBottom: '1rem',
        }}
      >
        ⚠️
      </div>
      
      <h3
        style={{
          color: 'var(--color-danger)',
          margin: '0 0 1rem 0',
        }}
      >
        {message}
      </h3>
      
      {details && (
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
            margin: '0 0 1.5rem 0',
            lineHeight: 1.5,
          }}
        >
          {details}
        </p>
      )}
      
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary)'
          }}
        >
          Try Again
        </button>
      )}
    </div>
  )
}

export default ErrorMessage