import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

// Listener global para permitir invocar toasts desde cualquier archivo JS (ej: servicios)
const globalListeners = new Set();

export const toast = {
  success: (message, options = {}) => triggerGlobalToast({ type: 'success', message, ...options }),
  error: (message, options = {}) => triggerGlobalToast({ type: 'error', message, ...options }),
  warning: (message, options = {}) => triggerGlobalToast({ type: 'warning', message, ...options }),
  info: (message, options = {}) => triggerGlobalToast({ type: 'info', message, ...options }),
  dismiss: (id) => triggerGlobalDismiss(id),
};

function triggerGlobalToast(toastData) {
  globalListeners.forEach((listener) => {
    try {
      listener.add(toastData);
    } catch (e) {
      console.warn('[Toast] Error disparando listener global:', e);
    }
  });
}

function triggerGlobalDismiss(id) {
  globalListeners.forEach((listener) => {
    try {
      listener.dismiss(id);
    } catch (e) {
      console.warn('[Toast] Error disparando dismiss global:', e);
    }
  });
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastIdCounter = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    toastIdCounter.current += 1;
    const id = `toast-${Date.now()}-${toastIdCounter.current}`;

    const newToast = {
      id,
      type,
      title: title || null,
      message: message || '',
      duration,
      createdAt: Date.now(),
    };

    setToasts((prev) => {
      // Máximo 3 toasts simultáneos para no saturar la pantalla
      const updated = [newToast, ...prev.slice(0, 2)];
      return updated;
    });

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  // Conectar con los listeners globales
  React.useEffect(() => {
    const listenerObj = {
      add: addToast,
      dismiss: dismissToast,
    };
    globalListeners.add(listenerObj);

    return () => {
      globalListeners.delete(listenerObj);
    };
  }, [addToast, dismissToast]);

  const value = {
    toasts,
    addToast,
    dismissToast,
    success: (msg, opts) => addToast({ type: 'success', message: msg, ...opts }),
    error: (msg, opts) => addToast({ type: 'error', message: msg, ...opts }),
    warning: (msg, opts) => addToast({ type: 'warning', message: msg, ...opts }),
    info: (msg, opts) => addToast({ type: 'info', message: msg, ...opts }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

function getDefaultTitle(type) {
  switch (type) {
    case 'success':
      return '¡Éxito!';
    case 'error':
      return 'Ha ocurrido un error';
    case 'warning':
      return 'Atención';
    case 'info':
    default:
      return 'Información';
  }
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Si se usa fuera del Provider, retornar el fallback que usa el listener global
    return toast;
  }
  return context;
}
