import React, { useState, useEffect, useRef } from 'react';

/**
 * Componente Pull-To-Refresh suave y elegante para Android y navegadores móviles.
 * Emula el comportamiento nativo de Android (Material Refresh) con soporte
 * para contenedores scrollables internos (SPA), detección precisa de inicio y
 * prevención estricta de conflictos con modales, carruseles o scroll hacia arriba.
 */
export default function PullToRefresh({ onRefresh, disabled = false, threshold = 65 }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const canPullRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) {
      isPullingRef.current = false;
      canPullRef.current = false;
      setPullDistance(0);
    }
  }, [disabled]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    // Si estamos en iOS con PullToRefreshViewController nativo, dejamos que iOS lo maneje de forma nativa
    const isIOSNative = typeof window !== 'undefined' && Boolean(window.webkit?.messageHandlers?.pullToRefresh);
    if (isIOSNative) return;

    // Helper: Encuentra el ancestro scrollable más cercano al elemento tocado
    const findScrollableAncestor = (element) => {
      let curr = element;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        if (curr.classList?.contains('app-modal-backdrop') || curr.classList?.contains('app-quick-modal-sheet')) {
          return null;
        }
        const style = window.getComputedStyle(curr);
        const overflowY = style.overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && curr.scrollHeight > curr.clientHeight) {
          return curr;
        }
        curr = curr.parentElement;
      }
      return null;
    };

    const handleTouchStart = (e) => {
      if (disabledRef.current || isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;

      const target = e.target;
      // Ignorar inputs, textareas, selects o botones de acción
      if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(target.tagName)) return;

      // Si está dentro de un modal o drawer abierto, no activar
      if (target.closest('.app-modal-backdrop') || target.closest('.app-quick-modal-sheet') || target.closest('.app-drawer')) {
        return;
      }

      // 1. Verificar scroll general de la ventana
      const windowScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (windowScroll > 2) {
        canPullRef.current = false;
        return;
      }

      // 2. Verificar scroll del contenedor principal de la vista activa (.app-main-content)
      const mainContent = document.querySelector('.app-main-content');
      if (mainContent && mainContent.scrollTop > 2) {
        canPullRef.current = false;
        return;
      }

      // 3. Verificar scroll del elemento tocado o su ancestro scrollable
      const scrollableParent = findScrollableAncestor(target);
      if (scrollableParent && scrollableParent.scrollTop > 2) {
        canPullRef.current = false;
        return;
      }

      // Si todo está arriba en 0, habilitamos la posibilidad de pull
      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      canPullRef.current = true;
      isPullingRef.current = false;
    };

    const handleTouchMove = (e) => {
      if (!canPullRef.current || isRefreshingRef.current || disabledRef.current) return;
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // Si el usuario mueve el dedo hacia arriba, está scrolleando hacia abajo en la lista
      if (diffY < -6) {
        canPullRef.current = false;
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      // Si el gesto es predominantemente horizontal (ej. carrusel de propiedades o fotos), cancelar pull
      if (!isPullingRef.current && Math.abs(diffX) > Math.abs(diffY)) {
        canPullRef.current = false;
        return;
      }

      // Si se mueve hacia abajo y es predominantemente vertical
      if (diffY > 8 && Math.abs(diffY) > Math.abs(diffX) * 1.25) {
        // Verificar nuevamente que ningún contenedor se haya scrolleado
        const mainContent = document.querySelector('.app-main-content');
        if (mainContent && mainContent.scrollTop > 2) {
          canPullRef.current = false;
          isPullingRef.current = false;
          setPullDistance(0);
          return;
        }

        isPullingRef.current = true;

        if (e.cancelable) {
          e.preventDefault();
        }

        // Curva elástica de resistencia tipo rubber-band
        const damped = Math.min(85, Math.pow(Math.max(0, diffY), 0.82) * 1.5);
        setPullDistance(damped);
      }
    };

    const handleTouchEnd = () => {
      if (!canPullRef.current && !isPullingRef.current) return;

      const wasPulling = isPullingRef.current;
      canPullRef.current = false;
      isPullingRef.current = false;

      if (!wasPulling || isRefreshingRef.current) {
        setPullDistance(0);
        return;
      }

      setPullDistance(current => {
        if (current >= threshold) {
          runRefresh();
          return threshold;
        } else {
          return 0;
        }
      });
    };

    const runRefresh = async () => {
      setIsRefreshing(true);
      isRefreshingRef.current = true;

      // Vibración háptica suave si el dispositivo lo soporta
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(15);
        }
      } catch (_) {}

      const startTime = Date.now();
      try {
        if (onRefreshRef.current) {
          await onRefreshRef.current();
        }
      } catch (err) {
        console.warn('[PullToRefresh] Error ejecutando onRefresh:', err);
      } finally {
        // Garantizar al menos 650ms de feedback visual para que el giro se aprecie fluidamente
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 650 - elapsed);
        setTimeout(() => {
          setIsRefreshing(false);
          isRefreshingRef.current = false;
          setPullDistance(0);
        }, remaining);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [threshold]);

  if (pullDistance <= 0 && !isRefreshing) {
    return null;
  }

  const rotation = isRefreshing ? 0 : Math.min(360, (pullDistance / threshold) * 360);
  const scale = isRefreshing ? 1 : Math.min(1, 0.4 + (pullDistance / threshold) * 0.6);
  const opacity = isRefreshing ? 1 : Math.min(1, pullDistance / 24);
  const translateY = isRefreshing ? 62 : Math.min(78, 8 + pullDistance * 0.72);

  return (
    <>
      <style>{`
        @keyframes aitemsPtrSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .aitems-ptr-spinning {
          animation: aitemsPtrSpin 0.75s linear infinite;
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
          left: '50%',
          transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
          opacity: opacity,
          zIndex: 120,
          pointerEvents: 'none',
          transition: isPullingRef.current
            ? 'none'
            : 'transform 0.28s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.22s ease',
          willChange: 'transform, opacity',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.16), 0 2px 5px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isRefreshing ? 'aitems-ptr-spinning' : ''}
            style={{
              transform: isRefreshing ? 'none' : `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24" />
            <polyline points="21 3 21 8 16 8" />
          </svg>
        </div>
      </div>
    </>
  );
}
