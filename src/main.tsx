import { Component, StrictMode, type ReactNode, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{
          minHeight: '100vh', background: '#0E120E', color: '#ECEFE6',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '2rem', fontFamily: 'monospace',
          gap: '1rem'
        }}>
          <div style={{ color: '#FF4D4D', fontSize: '1.25rem', fontWeight: 'bold' }}>
            Erro ao carregar o app
          </div>
          <div style={{
            background: '#161D16', border: '1px solid #2A352A', borderRadius: '12px',
            padding: '1rem', maxWidth: '600px', width: '100%', wordBreak: 'break-all',
            fontSize: '0.8rem', color: '#93A092'
          }}>
            {err.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#8BE04E', color: '#0E120E', border: 'none', borderRadius: '8px',
              padding: '0.5rem 1.5rem', cursor: 'pointer', fontWeight: 'bold'
            }}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
