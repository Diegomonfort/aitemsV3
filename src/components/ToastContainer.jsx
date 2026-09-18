import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import './ToastContainer.css';

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="app-toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { type, title, message } = toast;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} strokeWidth={2.3} className="toast-icon-svg" />;
      case 'error':
        return <AlertCircle size={18} strokeWidth={2.3} className="toast-icon-svg" />;
      case 'warning':
        return <AlertTriangle size={18} strokeWidth={2.3} className="toast-icon-svg" />;
      case 'info':
      default:
        return <Info size={18} strokeWidth={2.3} className="toast-icon-svg" />;
    }
  };

  return (
    <div className={`app-toast-banner ${type}`} role="alert">
      <div className={`toast-badge ${type}`}>
        {renderIcon()}
      </div>

      <div className="toast-body">
        {title && <div className="toast-title">{title}</div>}
        {message && <div className="toast-message">{message}</div>}
      </div>

      <button 
        type="button" 
        className="toast-close-btn" 
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Cerrar notificación"
      >
        <X size={15} strokeWidth={2.2} />
      </button>
    </div>
  );
}
