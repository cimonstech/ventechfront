'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: '#f9fafb',
          color: '#1A1A1A',
        }}
      >
        <div
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '20px', margin: '0 0 8px' }}>
            Something went wrong on this page
          </h1>
          <p style={{ maxWidth: '28rem', lineHeight: 1.6, color: '#3A3A3A', margin: 0 }}>
            Your information is safe. Try again, or go back to the home page.
          </p>
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: '44px',
                padding: '0 20px',
                border: 0,
                borderRadius: '8px',
                background: '#FF7A19',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                minHeight: '44px',
                padding: '0 20px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#1A1A1A',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Go to home
            </a>
          </div>
          {error.digest ? (
            <p style={{ marginTop: '24px', fontSize: '12px', color: '#3A3A3A' }}>
              Reference for support: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
