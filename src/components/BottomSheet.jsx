import { useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import './BottomSheet.css';

/**
 * BottomSheet — iOS-native style bottom sheet component
 * 
 * @param {boolean} isOpen - Controls visibility
 * @param {function} onClose - Called when sheet should close (backdrop tap, drag dismiss, X button)
 * @param {string} [title] - Header title. If omitted, no header is rendered (only handle)
 * @param {string} [subtitle] - Header subtitle text
 * @param {'auto'|'medium'|'full'} [size='auto'] - Sheet height variant
 * @param {boolean} [showBackButton=false] - Show a "back" button above the title
 * @param {function} [onBack] - Called when back button is pressed
 * @param {string} [backLabel='Elegir otro método'] - Label for the back button
 * @param {boolean} [stacked=false] - If true, uses higher z-index (for modals on top of modals)
 * @param {React.ReactNode} [headerExtra] - Extra content rendered below the title row (e.g. step tabs)
 * @param {string} [className] - Additional class for the sheet element
 * @param {string} [bodyClassName] - Additional class for the body/content wrapper
 * @param {React.ReactNode} children - Sheet content
 */
export default function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'auto',
  showBackButton = false,
  onBack,
  backLabel = 'Elegir otro método',
  stacked = false,
  headerExtra,
  className = '',
  bodyClassName = '',
  children,
}) {
  const backdropRef = useRef(null);
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);
  const isVisible = useRef(false);
  const closeTimeoutRef = useRef(null);
  const wasOpen = useRef(false);

  // Scroll lock management
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('bs-scroll-lock');
      document.body.classList.add('bs-scroll-lock');
      // Also add the legacy class for backwards compat with existing CSS
      document.documentElement.classList.add('app-modal-open');
      document.body.classList.add('app-modal-open');
    }
    return () => {
      document.documentElement.classList.remove('bs-scroll-lock');
      document.body.classList.remove('bs-scroll-lock');
      document.documentElement.classList.remove('app-modal-open');
      document.body.classList.remove('app-modal-open');
    };
  }, [isOpen]);

  // Open/close animation
  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      // Force a frame so the initial state renders, then animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isVisible.current = true;
          if (backdropRef.current) {
            backdropRef.current.classList.add('bs-visible');
            backdropRef.current.classList.remove('bs-closing');
          }
        });
      });
    } else if (wasOpen.current) {
      // Animate out
      isVisible.current = false;
      if (backdropRef.current) {
        backdropRef.current.classList.remove('bs-visible');
        backdropRef.current.classList.add('bs-closing');
      }
    }

    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [isOpen]);

  // Drag-to-dismiss handlers (on handle area only)
  const handleDragStart = useCallback((e) => {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    dragStartY.current = y;
    dragCurrentY.current = y;
    isDragging.current = true;
    if (sheetRef.current) {
      sheetRef.current.classList.add('bs-dragging');
    }
  }, []);

  const handleDragMove = useCallback((e) => {
    if (!isDragging.current) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const delta = y - dragStartY.current;

    // Only allow dragging downward
    if (delta > 0) {
      dragCurrentY.current = y;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${delta}px)`;
      }
      // Dim backdrop proportionally
      if (backdropRef.current) {
        const progress = Math.min(delta / 300, 1);
        backdropRef.current.style.backgroundColor = `rgba(15, 23, 42, ${0.48 * (1 - progress * 0.6)})`;
      }
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const delta = dragCurrentY.current - dragStartY.current;

    if (sheetRef.current) {
      sheetRef.current.classList.remove('bs-dragging');
    }

    if (delta > 100) {
      // Dismiss
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
      if (backdropRef.current) {
        backdropRef.current.style.backgroundColor = '';
      }
      onClose();
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
      if (backdropRef.current) {
        backdropRef.current.style.backgroundColor = '';
      }
    }
  }, [onClose]);

  // Backdrop click handler
  const handleBackdropClick = useCallback((e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }, [onClose]);

  // Don't render at all if not open
  if (!isOpen) return null;

  const sizeClass = `bs-size-${size}`;

  return (
    <div
      ref={backdropRef}
      className={`bs-backdrop${stacked ? ' bs-stacked' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`bs-sheet ${sizeClass} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle — drag area */}
        <div
          className="bs-handle-area"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
        >
          <div className="bs-handle-pill" />
        </div>

        {/* Header (only if title is provided) */}
        {title && (
          <div className="bs-header">
            {showBackButton && onBack && (
              <div className="bs-back-row">
                <button type="button" className="bs-back-btn" onClick={onBack}>
                  <ChevronLeft size={16} />
                  <span>{backLabel}</span>
                </button>
              </div>
            )}
            <div className="bs-title-row">
              <div>
                <h3 className="bs-title">{title}</h3>
                {subtitle && <p className="bs-subtitle">{subtitle}</p>}
              </div>
              <button
                type="button"
                className="bs-close-btn"
                onClick={onClose}
                aria-label="Cerrar"
              >
                <X size={18} color="#64748b" />
              </button>
            </div>
            {headerExtra && headerExtra}
          </div>
        )}

        {/* Body */}
        <div className={`bs-body ${bodyClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
}
