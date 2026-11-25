import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { HandwritingProvider } from './context/HandwritingContext'
import { NetworkProvider } from './context/NetworkContext'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NetworkProvider>
          <HandwritingProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1e3a8a',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                  fontFamily: 'Inter, system-ui, sans-serif',
                },
                success: {
                  iconTheme: {
                    primary: '#3b82f6',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </HandwritingProvider>
        </NetworkProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)