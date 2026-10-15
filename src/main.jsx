import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ToastContainer from './components/ToastContainer'

// Detectar plataforma de Capacitor para aislamiento limpio entre iOS y Android
if (typeof document !== 'undefined') {
  const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'
  document.documentElement.classList.add(`platform-${platform}`);
  document.body.classList.add(`platform-${platform}`);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)
