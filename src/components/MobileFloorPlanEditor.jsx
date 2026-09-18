import React, { useState, useRef, useCallback } from 'react';
import { toast } from '../context/ToastContext';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Check,
  Plus,
  RotateCw,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  DoorOpen,
  AppWindow,
  Move,
  X,
  Home,
  Copy,
  PenTool,
  Square,
  CornerDownRight,
  ArrowUpDown,
  Pencil,
  Lock,
  Unlock
} from 'lucide-react';

// Generador de IDs únicos
const uid = () => 'item_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

// Paleta arquitectónica limpia en modo claro
const LIGHT_PALETTES = [
  { id: 'slate', name: 'Gris Neutro', fill: 'rgba(241, 245, 249, 0.92)', stroke: '#94a3b8', text: '#334155', dot: '#94a3b8' },
  { id: 'sky', name: 'Celeste Suave', fill: 'rgba(224, 242, 254, 0.88)', stroke: '#38bdf8', text: '#0369a1', dot: '#38bdf8' },
  { id: 'emerald', name: 'Menta / Jardín', fill: 'rgba(209, 250, 229, 0.88)', stroke: '#34d399', text: '#065f46', dot: '#34d399' },
  { id: 'amber', name: 'Arena Cálido', fill: 'rgba(254, 243, 199, 0.88)', stroke: '#fbbf24', text: '#92400e', dot: '#fbbf24' },
  { id: 'indigo', name: 'Lavanda Suave', fill: 'rgba(237, 233, 254, 0.88)', stroke: '#a78bfa', text: '#5b21b6', dot: '#a78bfa' },
  { id: 'rose', name: 'Rosa Pálido', fill: 'rgba(252, 231, 243, 0.88)', stroke: '#f472b6', text: '#9d174d', dot: '#f472b6' },
];

const PASILLO_STYLE = {
  fill: 'rgba(248, 250, 252, 0.8)',
  stroke: '#cbd5e1',
  text: '#64748b'
};

const GRID_SIZE = 20; // 20px = 1 módulo arquitectónico

export default function MobileFloorPlanEditor({
  property,
  initialPlan,
  onSave,
  onClose
}) {
  // 1. Inicialización de pisos: empieza LIMPIO salvo que ya tenga un plano guardado
  const [floors, setFloors] = useState(() => {
    if (initialPlan?.shapes && Array.isArray(initialPlan.shapes) && initialPlan.shapes.length > 0) {
      if (initialPlan.shapes[0].isFloor) {
        return initialPlan.shapes;
      }
      return [{
        id: 'floor_default',
        name: 'Planta Baja',
        isFloor: true,
        shapes: initialPlan.shapes
      }];
    }
    // Lienzo limpio: NO forzar habitaciones preexistentes
    return [{
      id: 'floor_default',
      name: 'Planta Baja',
      isFloor: true,
      shapes: []
    }];
  });

  const [activeFloorId, setActiveFloorId] = useState(() => floors[0]?.id || 'floor_default');
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [isPropsModalOpen, setIsPropsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastTapRef = useRef({ time: 0, id: null });

  // Nombre de la propiedad limpio (sin 'Plano —')
  const propertyDisplayName = property?.name || 'Propiedad';
  const planTitle = initialPlan?.name || propertyDisplayName;

  // Estado del Canvas (Paneo y Zoom)
  const [scale, setScale] = useState(() => initialPlan?.canvas_scale || 1.0);
  const [pan, setPan] = useState(() => ({
    x: initialPlan?.canvas_pos_x || 0,
    y: initialPlan?.canvas_pos_y || 0
  }));
  const [panMode, setPanMode] = useState(false);

  // Pilas de Historial (Undo / Redo)
  const [history, setHistory] = useState(() => [floors]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Modales y menús
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isFloorPickerOpen, setIsFloorPickerOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  // Modo dibujo interactivo con dedos: 'none' | 'rect' | 'polygon'
  const [drawingMode, setDrawingMode] = useState('none');
  const [rectDrawing, setRectDrawing] = useState(null); // { startX, startY, currentX, currentY }
  const [polygonPoints, setPolygonPoints] = useState([]); // [x1, y1, x2, y2, ...]
  const [currentPointerCoord, setCurrentPointerCoord] = useState(null);

  // Referencias para manipulación de puntero y drag
  const canvasRef = useRef(null);
  const dragRef = useRef({
    active: false,
    mode: 'none', // 'shape' | 'pan' | 'resize'
    targetId: null,
    startX: 0,
    startY: 0,
    shapeStartX: 0,
    shapeStartY: 0,
    shapeStartWidth: 0,
    shapeStartHeight: 0,
    panStartX: 0,
    panStartY: 0,
    hasMoved: false
  });

  // Piso activo actual
  const currentFloor = floors.find(f => f.id === activeFloorId) || floors[0];
  const currentShapes = currentFloor?.shapes || [];
  const selectedShape = currentShapes.find(s => s.id === selectedShapeId);

  // Push al historial de Undo/Redo
  const pushHistory = useCallback((newFloors) => {
    setHistory(prev => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      const nextHistory = [...upToCurrent, newFloors];
      if (nextHistory.length > 35) nextHistory.shift();
      return nextHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 34));
  }, [historyIndex]);

  // Aplicar cambio a los shapes del piso activo
  const updateCurrentFloorShapes = useCallback((newShapes, recordHistory = true) => {
    setFloors(prevFloors => {
      const nextFloors = prevFloors.map(f => 
        f.id === activeFloorId ? { ...f, shapes: newShapes } : f
      );
      if (recordHistory) {
        pushHistory(nextFloors);
      }
      return nextFloors;
    });
  }, [activeFloorId, pushHistory]);

  // Deshacer (Undo)
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setFloors(targetState);
      setSelectedShapeId(null);
      setIsPropsModalOpen(false);
    }
  }, [history, historyIndex]);

  // Rehacer (Redo)
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setFloors(targetState);
      setSelectedShapeId(null);
      setIsPropsModalOpen(false);
    }
  }, [history, historyIndex]);

  // Snap a grilla de 20px
  const snapToGrid = (val) => Math.round(val / GRID_SIZE) * GRID_SIZE;

  // Convertir coordenadas del cliente a coordenadas del mundo (lienzo)
  const getWorldCoord = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const worldX = (clientX - rect.left - pan.x) / scale;
    const worldY = (clientY - rect.top - pan.y) / scale;
    return {
      x: snapToGrid(worldX),
      y: snapToGrid(worldY),
      rawClientX: clientX,
      rawClientY: clientY
    };
  };

  // Número de piso para el sidebar (0 = PB, 1 = Piso 1, etc.)
  const getFloorNumberDisplay = () => {
    if (!currentFloor) return '0';
    const nameLower = currentFloor.name?.toLowerCase() || '';
    if (nameLower.includes('baja')) return '0';
    const match = currentFloor.name?.match(/\d+/);
    if (match) return match[0];
    const idx = floors.findIndex(f => f.id === activeFloorId);
    return idx >= 0 ? String(idx) : '0';
  };

  // INICIAR DIBUJO DE HABITACIÓN RECTANGULAR CON DEDOS
  const handleStartDrawRect = () => {
    setIsAddMenuOpen(false);
    setSelectedShapeId(null);
    setIsPropsModalOpen(false);
    setDrawingMode('rect');
    setRectDrawing(null);
  };

  // INICIAR TRAZO DE POLÍGONO / LÍNEAS CON DEDOS
  const handleStartDrawPolygon = () => {
    setIsAddMenuOpen(false);
    setSelectedShapeId(null);
    setIsPropsModalOpen(false);
    setDrawingMode('polygon');
    setPolygonPoints([]);
  };

  // AGREGAR PUERTA
  const handleAddDoor = () => {
    const centerX = snapToGrid((-pan.x + 160) / scale);
    const centerY = snapToGrid((-pan.y + 200) / scale);

    const newDoor = {
      id: uid(),
      type: 'door',
      x: centerX,
      y: centerY,
      width: 60,
      rotation: 0
    };

    const nextShapes = [...currentShapes, newDoor];
    updateCurrentFloorShapes(nextShapes, true);
    setSelectedShapeId(newDoor.id);
    setIsPropsModalOpen(false);
    setIsAddMenuOpen(false);
  };

  // AGREGAR VENTANA
  const handleAddWindow = () => {
    const centerX = snapToGrid((-pan.x + 160) / scale);
    const centerY = snapToGrid((-pan.y + 200) / scale);

    const newWindow = {
      id: uid(),
      type: 'window',
      x: centerX,
      y: centerY,
      width: 80,
      height: 14,
      rotation: 0
    };

    const nextShapes = [...currentShapes, newWindow];
    updateCurrentFloorShapes(nextShapes, true);
    setSelectedShapeId(newWindow.id);
    setIsPropsModalOpen(false);
    setIsAddMenuOpen(false);
  };

  // AGREGAR ESCALERA
  const handleAddStairs = () => {
    const centerX = snapToGrid((-pan.x + 160) / scale);
    const centerY = snapToGrid((-pan.y + 200) / scale);

    const newStairs = {
      id: uid(),
      type: 'stairs',
      x: centerX,
      y: centerY,
      width: 90,
      height: 60,
      rotation: 0
    };

    const nextShapes = [...currentShapes, newStairs];
    updateCurrentFloorShapes(nextShapes, true);
    setSelectedShapeId(newStairs.id);
    setIsPropsModalOpen(false);
    setIsAddMenuOpen(false);
  };

  // AGREGAR NUEVA PLANTA / PISO
  const handleAddFloor = () => {
    const floorNumber = floors.length;
    const newFloor = {
      id: uid(),
      name: floorNumber === 0 ? 'Planta Baja' : `Piso ${floorNumber}`,
      isFloor: true,
      shapes: []
    };
    const nextFloors = [...floors, newFloor];
    setFloors(nextFloors);
    pushHistory(nextFloors);
    setActiveFloorId(newFloor.id);
    setSelectedShapeId(null);
    setIsPropsModalOpen(false);
    setIsFloorPickerOpen(false);
  };

  const handleFinishPolygon = () => {
    if (polygonPoints.length < 6) {
      toast.warning('Marcá al menos 3 puntos en la grilla para formar una habitación.');
      return;
    }

    const xs = polygonPoints.filter((_, i) => i % 2 === 0);
    const ys = polygonPoints.filter((_, i) => i % 2 !== 0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const relPoints = [];
    for (let i = 0; i < polygonPoints.length; i += 2) {
      relPoints.push(polygonPoints[i] - minX, polygonPoints[i + 1] - minY);
    }

    const defaultColor = LIGHT_PALETTES[currentShapes.length % LIGHT_PALETTES.length];
    const newPolygon = {
      id: uid(),
      type: 'polygon',
      x: minX,
      y: minY,
      points: relPoints,
      width: maxX - minX,
      height: maxY - minY,
      label: 'Nuevo Ambiente',
      ambienteId: null,
      noRoom: false,
      fill: defaultColor.fill,
      stroke: defaultColor.stroke,
      textColor: defaultColor.text,
      rotation: 0
    };

    const nextShapes = [...currentShapes, newPolygon];
    updateCurrentFloorShapes(nextShapes, true);
    setSelectedShapeId(newPolygon.id);
    setIsPropsModalOpen(false);
    setDrawingMode('none');
    setPolygonPoints([]);
  };

  const handleCancelDrawing = () => {
    setDrawingMode('none');
    setRectDrawing(null);
    setPolygonPoints([]);
  };

  // ROTAR 90°
  const handleRotateSelected = () => {
    if (!selectedShape) return;
    const nextRotation = ((selectedShape.rotation || 0) + 90) % 360;
    const nextShapes = currentShapes.map(s => 
      s.id === selectedShape.id ? { ...s, rotation: nextRotation } : s
    );
    updateCurrentFloorShapes(nextShapes, true);
  };

  // DUPLICAR ELEMENTO
  const handleDuplicateSelected = () => {
    if (!selectedShape) return;
    const duplicated = {
      ...selectedShape,
      id: uid(),
      x: selectedShape.x + GRID_SIZE * 2,
      y: selectedShape.y + GRID_SIZE * 2,
    };
    const nextShapes = [...currentShapes, duplicated];
    updateCurrentFloorShapes(nextShapes, true);
    setSelectedShapeId(duplicated.id);
    setIsPropsModalOpen(false);
  };

  // ELIMINAR ELEMENTO
  const handleDeleteSelected = () => {
    if (!selectedShapeId) return;
    const nextShapes = currentShapes.filter(s => s.id !== selectedShapeId);
    updateCurrentFloorShapes(nextShapes, true);
    setSelectedShapeId(null);
    setIsPropsModalOpen(false);
  };

  // BLOQUEAR / DESBLOQUEAR ELEMENTO
  const handleToggleLockSelected = () => {
    if (!selectedShape) return;
    const isLocked = !selectedShape.locked;
    const nextShapes = currentShapes.map(s => 
      s.id === selectedShape.id ? { ...s, locked: isLocked } : s
    );
    updateCurrentFloorShapes(nextShapes, true);
  };

  // CAMBIAR COLOR
  const handleChangeColor = (palette) => {
    if (!selectedShape) return;
    const nextShapes = currentShapes.map(s => 
      s.id === selectedShape.id 
        ? { ...s, fill: palette.fill, stroke: palette.stroke, textColor: palette.text } 
        : s
    );
    updateCurrentFloorShapes(nextShapes, true);
  };

  // ASIGNAR AMBIENTE
  const handleAssignRoom = (roomName) => {
    if (!selectedShape) return;
    const name = roomName.trim() || 'Ambiente';
    const nextShapes = currentShapes.map(s => 
      s.id === selectedShape.id 
        ? { ...s, label: name, ambienteId: roomName.trim() ? roomName : null, noRoom: false } 
        : s
    );
    updateCurrentFloorShapes(nextShapes, true);
  };

  // TOGGLE PASILLO
  const handleTogglePasillo = (isPasillo) => {
    if (!selectedShape) return;
    const defaultColor = LIGHT_PALETTES[0];
    const nextShapes = currentShapes.map(s => {
      if (s.id !== selectedShape.id) return s;
      if (isPasillo) {
        return {
          ...s,
          noRoom: true,
          label: '',
          ambienteId: null,
          fill: 'rgba(241, 245, 249, 0.9)',
          stroke: '#94a3b8',
          textColor: '#64748b'
        };
      } else {
        const restoredFill = (!s.fill || s.fill.includes('241, 245, 249') || s.fill.includes('url')) ? defaultColor.fill : s.fill;
        const restoredStroke = (!s.stroke || s.stroke === '#94a3b8') ? defaultColor.stroke : s.stroke;
        return {
          ...s,
          noRoom: false,
          label: s.ambienteId || 'Ambiente',
          fill: restoredFill,
          stroke: restoredStroke,
          textColor: defaultColor.text
        };
      }
    });
    updateCurrentFloorShapes(nextShapes, true);
  };

  // ============ MANEJO DE PUNTERO (DIBUJO, DRAG Y RESIZE TÁCTIL) ============
  const handlePointerDown = (e, shapeId = null) => {
    const coords = getWorldCoord(e);

    // Modo 1: Dibujar Rectángulo con los dedos
    if (drawingMode === 'rect') {
      setRectDrawing({
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y
      });
      return;
    }

    // Modo 2: Dibujar Polígono con los dedos
    if (drawingMode === 'polygon') {
      if (polygonPoints.length >= 6) {
        const startX = polygonPoints[0];
        const startY = polygonPoints[1];
        const dist = Math.hypot(coords.x - startX, coords.y - startY);
        if (dist < 30) {
          handleFinishPolygon();
          return;
        }
      }
      setPolygonPoints(prev => [...prev, coords.x, coords.y]);
      return;
    }

    // Modo 3: Drag normal o Paneo
    e.stopPropagation();
    if (shapeId && !panMode) {
      const targetShape = currentShapes.find(s => s.id === shapeId);
      if (!targetShape) return;

      // Doble toque rápido sobre la habitación para abrir configuración
      const now = Date.now();
      if (lastTapRef.current.id === shapeId && (now - lastTapRef.current.time < 350)) {
        setIsPropsModalOpen(true);
      }
      lastTapRef.current = { time: now, id: shapeId };

      setSelectedShapeId(shapeId);
      if (!targetShape.locked) {
        dragRef.current = {
          active: true,
          mode: 'shape',
          targetId: shapeId,
          startX: coords.rawClientX,
          startY: coords.rawClientY,
          shapeStartX: targetShape.x,
          shapeStartY: targetShape.y,
          hasMoved: false
        };
      } else {
        dragRef.current = {
          active: false,
          mode: 'none',
          targetId: null,
          startX: 0,
          startY: 0,
          shapeStartX: 0,
          shapeStartY: 0,
          hasMoved: false
        };
      }
    } else {
      if (!panMode && !shapeId) {
        setSelectedShapeId(null);
        setIsPropsModalOpen(false);
      }
      dragRef.current = {
        active: true,
        mode: 'pan',
        startX: coords.rawClientX,
        startY: coords.rawClientY,
        panStartX: pan.x,
        panStartY: pan.y,
        hasMoved: false
      };
    }
  };

  // Iniciar redimensionamiento desde el handle de esquina
  const handleResizeHandlePointerDown = (e, shapeId) => {
    e.stopPropagation();
    const coords = getWorldCoord(e);
    const targetShape = currentShapes.find(s => s.id === shapeId);
    if (!targetShape || targetShape.locked) return;

    dragRef.current = {
      active: true,
      mode: 'resize',
      targetId: shapeId,
      startX: coords.rawClientX,
      startY: coords.rawClientY,
      shapeStartWidth: targetShape.width || 120,
      shapeStartHeight: targetShape.height || 100,
      hasMoved: false
    };
  };

  const handlePointerMove = useCallback((e) => {
    const coords = getWorldCoord(e);

    // Mover rectángulo en trazado
    if (drawingMode === 'rect' && rectDrawing) {
      setRectDrawing(prev => ({
        ...prev,
        currentX: coords.x,
        currentY: coords.y
      }));
      return;
    }

    // Mover cursor de polígono
    if (drawingMode === 'polygon') {
      setCurrentPointerCoord({ x: coords.x, y: coords.y });
    }

    if (!dragRef.current.active) return;
    e.preventDefault();

    const deltaX = coords.rawClientX - dragRef.current.startX;
    const deltaY = coords.rawClientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragRef.current.mode === 'shape') {
      const worldDeltaX = deltaX / scale;
      const worldDeltaY = deltaY / scale;
      const rawX = dragRef.current.shapeStartX + worldDeltaX;
      const rawY = dragRef.current.shapeStartY + worldDeltaY;
      const snappedX = snapToGrid(rawX);
      const snappedY = snapToGrid(rawY);

      setFloors(prev => prev.map(f => {
        if (f.id !== activeFloorId) return f;
        return {
          ...f,
          shapes: f.shapes.map(s => 
            s.id === dragRef.current.targetId ? { ...s, x: snappedX, y: snappedY } : s
          )
        };
      }));
    } else if (dragRef.current.mode === 'resize') {
      const worldDeltaX = deltaX / scale;
      const worldDeltaY = deltaY / scale;
      const nextW = Math.max(40, snapToGrid(dragRef.current.shapeStartWidth + worldDeltaX));
      const nextH = Math.max(40, snapToGrid(dragRef.current.shapeStartHeight + worldDeltaY));

      setFloors(prev => prev.map(f => {
        if (f.id !== activeFloorId) return f;
        return {
          ...f,
          shapes: f.shapes.map(s => 
            s.id === dragRef.current.targetId ? { ...s, width: nextW, height: nextH } : s
          )
        };
      }));
    } else if (dragRef.current.mode === 'pan') {
      setPan({
        x: dragRef.current.panStartX + deltaX,
        y: dragRef.current.panStartY + deltaY
      });
    }
  }, [activeFloorId, drawingMode, pan.x, pan.y, rectDrawing, scale]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);

    // Si terminó de dibujar rectángulo
    if (drawingMode === 'rect' && rectDrawing) {
      const x = Math.min(rectDrawing.startX, rectDrawing.currentX);
      const y = Math.min(rectDrawing.startY, rectDrawing.currentY);
      const width = Math.abs(rectDrawing.currentX - rectDrawing.startX);
      const height = Math.abs(rectDrawing.currentY - rectDrawing.startY);

      if (width >= 40 && height >= 40) {
        const defaultColor = LIGHT_PALETTES[currentShapes.length % LIGHT_PALETTES.length];
        const newShape = {
          id: uid(),
          type: 'room',
          x,
          y,
          width,
          height,
          label: 'Nuevo Ambiente',
          ambienteId: null,
          noRoom: false,
          fill: defaultColor.fill,
          stroke: defaultColor.stroke,
          textColor: defaultColor.text,
          rotation: 0
        };
        const nextShapes = [...currentShapes, newShape];
        updateCurrentFloorShapes(nextShapes, true);
        setSelectedShapeId(newShape.id);
        setIsPropsModalOpen(false);
        setDrawingMode('none');
        setRectDrawing(null);
      }
    }

    if (dragRef.current.active) {
      if ((dragRef.current.mode === 'shape' || dragRef.current.mode === 'resize') && dragRef.current.hasMoved) {
        pushHistory(floors);
      }
      dragRef.current.active = false;
      dragRef.current.mode = 'none';
    }
  }, [currentShapes, drawingMode, floors, pushHistory, rectDrawing, updateCurrentFloorShapes]);

  // GUARDAR PLANO
  const handleSavePlan = () => {
    const payload = {
      property_id: property?.id,
      name: planTitle,
      shapes: floors,
      canvas_scale: scale,
      canvas_pos_x: pan.x,
      canvas_pos_y: pan.y
    };

    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      if (onSave) onSave(payload);
    }, 500);
  };

  // Truncar nombres con ellipsis (...) si no entran en el ancho de la habitación
  const getFittedLabel = (label, availableWidth) => {
    if (!label) return '';
    const maxAvailable = Math.max(16, (availableWidth || 100) - 14);
    const approxCharWidth = 7.4;
    const maxChars = Math.floor(maxAvailable / approxCharWidth);

    if (label.length <= maxChars) {
      return label;
    }
    if (maxChars <= 3) {
      return label.slice(0, Math.max(1, maxChars)) + '…';
    }
    return label.slice(0, maxChars - 1).trim() + '…';
  };

  const isRoomOrPoly = selectedShape && (selectedShape.type === 'room' || selectedShape.type === 'polygon');

  // Mapa de ambientes ocupados
  const assignedAmbientsMap = {};
  currentShapes.forEach(s => {
    if (s.id !== selectedShape?.id && s.ambienteId) {
      assignedAmbientsMap[s.ambienteId] = true;
    }
  });

  return (
    <div className="mfp-fullscreen-overlay" style={editorStyles.fullscreenOverlay}>
      <style>{`
        /* Mobile Floor Plan Landscape & Ergonomic Overrides */
        .mfp-fullscreen-overlay {
          box-sizing: border-box;
        }

        @media (orientation: landscape), (max-height: 560px) {
          .mfp-fullscreen-overlay {
            padding-top: env(safe-area-inset-top, 0px) !important;
            padding-left: env(safe-area-inset-left, 0px) !important;
            padding-right: env(safe-area-inset-right, 0px) !important;
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
          }

          /* 1. Header con esquinas protegidas (lejos del notch y esquinas redondeadas) */
          .mfp-top-bar {
            height: 46px !important;
            padding: 3px max(28px, env(safe-area-inset-right, 28px)) 3px max(28px, env(safe-area-inset-left, 28px)) !important;
            gap: 12px !important;
          }
          .mfp-top-back-btn {
            width: 34px !important;
            height: 34px !important;
            border-radius: 10px !important;
          }
          .mfp-top-prop-name {
            font-size: 14px !important;
            max-width: 320px !important;
          }
          .mfp-top-save-btn {
            height: 34px !important;
            padding: 0 14px !important;
            font-size: 12.5px !important;
            border-radius: 10px !important;
          }

          /* 2. Banner de trazado compacto */
          .mfp-drawing-banner {
            padding: 4px max(24px, env(safe-area-inset-right, 24px)) 4px max(24px, env(safe-area-inset-left, 24px)) !important;
            font-size: 11px !important;
          }

          /* 3. Controles flotantes laterales alejados de la esquina superior derecha */
          .mfp-floating-nav {
            top: 10px !important;
            right: max(24px, env(safe-area-inset-right, 24px)) !important;
            gap: 5px !important;
          }
          .mfp-nav-circle-btn {
            width: 34px !important;
            height: 34px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
          }

          /* 4. Dock flotante inferior separado de la barra home del celular */
          .mfp-bottom-dock {
            bottom: 12px !important;
            padding: 3px 8px !important;
            gap: 8px !important;
            border-radius: 30px !important;
            z-index: 30 !important;
          }
          .mfp-dock-circle-btn {
            width: 34px !important;
            height: 34px !important;
          }
          .mfp-dock-fab {
            width: 40px !important;
            height: 40px !important;
          }

          /* 5. Barra flotante de acción: FLOTANDO CLARAMENTE ARRIBA DEL DOCK SIN TAPARSE */
          .mfp-selected-pill {
            bottom: 68px !important;
            height: 40px !important;
            padding: 0 8px !important;
            gap: 6px !important;
            border-radius: 20px !important;
            z-index: 45 !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
          }
          .mfp-pill-edit-btn {
            height: 32px !important;
            padding: 0 12px !important;
            font-size: 12px !important;
            border-radius: 16px !important;
          }
          .mfp-pill-icon-btn, .mfp-pill-delete-btn, .mfp-pill-deselect-btn {
            width: 32px !important;
            height: 32px !important;
          }

          /* 6. Helper pill de inicio */
          .mfp-start-helper {
            bottom: 68px !important;
            padding: 4px 12px !important;
            font-size: 11px !important;
          }

          /* 7. MENÚ AGREGAR EN MODO HORIZONTAL / APAISADO (2 COLUMNAS, CENTRADO) */
          .mfp-add-overlay {
            align-items: center !important;
            justify-content: center !important;
            padding: 10px !important;
          }
          .mfp-add-card {
            max-width: 660px !important;
            width: 95% !important;
            border-radius: 20px !important;
            padding: 10px 16px 12px 16px !important;
            max-height: 94vh !important;
            overflow-y: auto !important;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25) !important;
          }
          .mfp-add-header {
            margin-bottom: 8px !important;
          }
          .mfp-add-title {
            font-size: 13.5px !important;
          }
          .mfp-add-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 7px !important;
          }
          .mfp-add-option-card {
            padding: 7px 10px !important;
            gap: 8px !important;
            border-radius: 12px !important;
          }
          .mfp-add-icon-box {
            width: 34px !important;
            height: 34px !important;
            border-radius: 10px !important;
          }
          .mfp-add-opt-title {
            font-size: 12px !important;
            margin-bottom: 1px !important;
          }
          .mfp-add-opt-desc {
            font-size: 10.5px !important;
            line-height: 1.2 !important;
          }

          /* 8. MODAL DE EDICIÓN DE PROPIEDADES EN APAISADO */
          .mfp-props-overlay {
            align-items: center !important;
            justify-content: center !important;
            padding: 10px !important;
          }
          .mfp-props-sheet {
            max-width: 560px !important;
            width: 94% !important;
            border-radius: 20px !important;
            max-height: 94vh !important;
            overflow-y: auto !important;
            padding: 12px 16px !important;
            gap: 8px !important;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25) !important;
          }
          .mfp-sheet-handle {
            display: none !important;
          }
          .mfp-type-toggle-btn {
            height: 34px !important;
            font-size: 12px !important;
          }
          .mfp-room-select {
            height: 38px !important;
            font-size: 12.5px !important;
          }
          .mfp-color-btn {
            width: 28px !important;
            height: 28px !important;
          }
          .mfp-action-pill-btn, .mfp-delete-pill-btn {
            height: 36px !important;
            font-size: 12px !important;
          }
          .mfp-props-done-btn {
            height: 38px !important;
            font-size: 13px !important;
          }

          /* 9. MODAL DE CAMBIO DE PISOS EN APAISADO */
          .mfp-floor-card {
            max-width: 520px !important;
            width: 94% !important;
            border-radius: 20px !important;
            max-height: 92vh !important;
            overflow-y: auto !important;
            padding: 12px 16px !important;
          }
          .mfp-floor-row-btn {
            padding: 9px 12px !important;
          }
          .mfp-add-floor-btn {
            padding: 10px !important;
          }

          /* 10. TOAST FLOTANTE */
          .mfp-toast-success {
            top: 48px !important;
            padding: 6px 14px !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* ============ 1. BARRA SUPERIOR (100% LIMPIA) ============ */}
      <header className="mfp-top-bar" style={editorStyles.topBar}>
        <button
          type="button"
          className="mfp-top-back-btn"
          style={editorStyles.topBackBtn}
          onClick={onClose}
          aria-label="Volver a la propiedad"
        >
          <ArrowLeft size={19} color="#0f172a" strokeWidth={2.4} />
        </button>

        <div style={editorStyles.topTitleSection}>
          <h2 className="mfp-top-prop-name" style={editorStyles.topPropName} title={propertyDisplayName}>
            {propertyDisplayName}
          </h2>
        </div>

        <button
          type="button"
          className="mfp-top-save-btn"
          style={editorStyles.topSaveBtn}
          onClick={handleSavePlan}
          aria-label="Guardar plano"
        >
          <Check size={16} strokeWidth={2.8} />
          <span>Guardar</span>
        </button>
      </header>

      {/* ============ 2. BANNER DE TRAZADO INTERACTIVO ============ */}
      {drawingMode === 'rect' && (
        <div className="mfp-drawing-banner" style={editorStyles.drawingBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Square size={16} color="#4f46e5" />
            <span style={editorStyles.drawingBannerText}>
              Tocá y arrastrá en la grilla para definir el tamaño de la habitación
            </span>
          </div>
          <button
            type="button"
            style={editorStyles.cancelPolyBtn}
            onClick={handleCancelDrawing}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {drawingMode === 'polygon' && (
        <div className="mfp-drawing-banner" style={editorStyles.drawingBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PenTool size={16} color="#4f46e5" />
            <span style={editorStyles.drawingBannerText}>
              Marcá esquinas en la grilla ({polygonPoints.length / 2} puntos)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {polygonPoints.length >= 6 && (
              <button
                type="button"
                style={editorStyles.finishPolyBtn}
                onClick={handleFinishPolygon}
              >
                <Check size={14} />
                <span>Cerrar</span>
              </button>
            )}
            <button
              type="button"
              style={editorStyles.cancelPolyBtn}
              onClick={handleCancelDrawing}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ============ 3. LIENZO SVG (CON GRILLA VINCULADA AL ZOOM Y PAN) ============ */}
      <div 
        ref={canvasRef}
        style={editorStyles.canvasContainer}
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg style={editorStyles.svgCanvas} xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Grilla fina 20px (en espacio mundo) */}
            <pattern id="world-grid-fine" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
            {/* Grilla mayor 100px */}
            <pattern id="world-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#world-grid-fine)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#cbd5e1" strokeWidth="1.2" />
            </pattern>
            {/* Patrón de líneas diagonales arquitectónicas para Pasillos */}
            <pattern id="pasillo-hatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="12" stroke="#94a3b8" strokeWidth="2.2" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Grupo transformado por Paneo y Zoom: LA GRILLA ESTÁ AQUÍ DENTRO Y ESCALA AL 100% */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {/* Grilla arquitectónica en coordenadas mundo */}
            <rect x="-3000" y="-3000" width="7000" height="7000" fill="url(#world-grid-major)" />

            {/* Ejes centrales sutiles */}
            <line x1="-3000" y1="0" x2="4000" y2="0" stroke="#94a3b8" strokeWidth="1" strokeDasharray="6,4" />
            <line x1="0" y1="-3000" x2="0" y2="4000" stroke="#94a3b8" strokeWidth="1" strokeDasharray="6,4" />

            {/* 1. DIBUJO DE HABITACIONES RECTANGULARES */}
            {currentShapes.filter(s => s.type === 'room').map(shape => {
              const isSelected = shape.id === selectedShapeId;
              const rot = shape.rotation || 0;
              const cx = shape.x + shape.width / 2;
              const cy = shape.y + shape.height / 2;

              return (
                <g 
                  key={shape.id}
                  transform={`rotate(${rot}, ${cx}, ${cy})`}
                  onPointerDown={(e) => handlePointerDown(e, shape.id)}
                  style={{ cursor: panMode ? 'grab' : shape.locked ? 'default' : 'move' }}
                >
                  {/* Fondo base */}
                  <rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width}
                    height={shape.height}
                    rx={6}
                    ry={6}
                    fill={shape.noRoom ? 'rgba(241, 245, 249, 0.95)' : (shape.fill || 'rgba(241, 245, 249, 0.92)')}
                    stroke={isSelected ? '#4f46e5' : (shape.stroke || '#94a3b8')}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={shape.noRoom ? '6,4' : isSelected ? '7,3' : 'none'}
                  />

                  {/* Patrón de líneas diagonales arquitectónicas para Pasillos */}
                  {shape.noRoom && (
                    <rect
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      rx={6}
                      ry={6}
                      fill="url(#pasillo-hatch)"
                      pointerEvents="none"
                    />
                  )}

                  {/* Indicador visual discreto de habitación bloqueada */}
                  {shape.locked && (
                    <g transform={`translate(${shape.x + shape.width - 24}, ${shape.y + 6})`} pointerEvents="none">
                      <circle cx={8} cy={8} r={8} fill="rgba(15, 23, 42, 0.75)" />
                      <path d="M5.5 6.5 V5 A2.5 2.5 0 0 1 10.5 5 V6.5 M5 6.5 H11 V11 H5 Z" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}

                  {/* Texto Centrado: Nombre con ellipsis si no entra (NO se muestra si es pasillo) */}
                  {!shape.noRoom && shape.width >= 26 && shape.height >= 20 && (
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill={shape.textColor || '#0f172a'}
                      fontSize={12.5}
                      fontWeight={700}
                      fontFamily="Plus Jakarta Sans, sans-serif"
                      pointerEvents="none"
                    >
                      {getFittedLabel(shape.label || 'Ambiente', shape.width)}
                    </text>
                  )}

                  {/* Indicadores de Selección y Handle de Redimensionamiento */}
                  {isSelected && (
                    <>
                      <circle cx={shape.x} cy={shape.y} r={4.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
                      <circle cx={shape.x + shape.width} cy={shape.y} r={4.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
                      <circle cx={shape.x} cy={shape.y + shape.height} r={4.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />

                      {/* Handle táctil ampliado para estirar la habitación SOLO si no está bloqueada */}
                      {!shape.locked ? (
                        <g onPointerDown={(e) => handleResizeHandlePointerDown(e, shape.id)}>
                          <circle cx={shape.x + shape.width} cy={shape.y + shape.height} r={24} fill="transparent" style={{ cursor: 'nwse-resize' }} />
                          <circle cx={shape.x + shape.width} cy={shape.y + shape.height} r={7.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={2.5} />
                        </g>
                      ) : (
                        <circle cx={shape.x + shape.width} cy={shape.y + shape.height} r={4.5} fill="#4f46e5" stroke="#ffffff" strokeWidth={1.5} />
                      )}
                    </>
                  )}
                </g>
              );
            })}

            {/* 2. DIBUJO DE POLÍGONOS LIBRES */}
            {currentShapes.filter(s => s.type === 'polygon').map(poly => {
              const isSelected = poly.id === selectedShapeId;
              const pointsStr = [];
              for (let i = 0; i < poly.points.length; i += 2) {
                pointsStr.push(`${poly.points[i]},${poly.points[i + 1]}`);
              }
              const cx = poly.width / 2;
              const cy = poly.height / 2;

              return (
                <g
                  key={poly.id}
                  transform={`translate(${poly.x}, ${poly.y}) rotate(${poly.rotation || 0}, ${cx}, ${cy})`}
                  onPointerDown={(e) => handlePointerDown(e, poly.id)}
                  style={{ cursor: panMode ? 'grab' : poly.locked ? 'default' : 'move' }}
                >
                  <polygon
                    points={pointsStr.join(' ')}
                    fill={poly.noRoom ? 'rgba(241, 245, 249, 0.95)' : (poly.fill || 'rgba(224, 242, 254, 0.88)')}
                    stroke={isSelected ? '#4f46e5' : (poly.stroke || '#38bdf8')}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={poly.noRoom ? '6,4' : isSelected ? '7,3' : 'none'}
                    strokeLinejoin="round"
                  />

                  {/* Patrón de líneas diagonales arquitectónicas para Pasillos */}
                  {poly.noRoom && (
                    <polygon
                      points={pointsStr.join(' ')}
                      fill="url(#pasillo-hatch)"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  )}

                  {/* Indicador visual de elemento bloqueado */}
                  {poly.locked && (
                    <g transform={`translate(${poly.width - 24}, 6)`} pointerEvents="none">
                      <circle cx={8} cy={8} r={8} fill="rgba(15, 23, 42, 0.75)" />
                      <path d="M5.5 6.5 V5 A2.5 2.5 0 0 1 10.5 5 V6.5 M5 6.5 H11 V11 H5 Z" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}

                  {/* Texto Centrado: Nombre con ellipsis si no entra (NO se muestra si es pasillo) */}
                  {!poly.noRoom && poly.width >= 26 && (
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill={poly.textColor || '#0f172a'}
                      fontSize={12.5}
                      fontWeight={700}
                      fontFamily="Plus Jakarta Sans, sans-serif"
                      pointerEvents="none"
                    >
                      {getFittedLabel(poly.label || 'Ambiente', poly.width)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* 3. DIBUJO DE PUERTAS */}
            {currentShapes.filter(s => s.type === 'door').map(door => {
              const isSelected = door.id === selectedShapeId;
              const r = door.width || 60;
              const rot = door.rotation || 0;

              return (
                <g 
                  key={door.id}
                  transform={`translate(${door.x}, ${door.y}) rotate(${rot})`}
                  onPointerDown={(e) => handlePointerDown(e, door.id)}
                  style={{ cursor: panMode ? 'grab' : 'move' }}
                >
                  <line 
                    x1="0" 
                    y1="0" 
                    x2={r} 
                    y2="0" 
                    stroke={isSelected ? '#4f46e5' : '#334155'} 
                    strokeWidth={isSelected ? 3.5 : 2.5} 
                  />
                  <path 
                    d={`M 0 0 L ${r} 0 A ${r} ${r} 0 0 1 0 ${r} Z`} 
                    fill="rgba(79, 70, 229, 0.08)" 
                    stroke={isSelected ? '#4f46e5' : '#94a3b8'} 
                    strokeWidth={1.5}
                    strokeDasharray="4,2"
                  />
                  <circle cx="0" cy="0" r={4} fill={isSelected ? '#4f46e5' : '#0f172a'} />
                </g>
              );
            })}

            {/* 4. DIBUJO DE VENTANAS */}
            {currentShapes.filter(s => s.type === 'window').map(win => {
              const isSelected = win.id === selectedShapeId;
              const w = win.width || 80;
              const h = win.height || 14;
              const rot = win.rotation || 0;

              return (
                <g 
                  key={win.id}
                  transform={`translate(${win.x}, ${win.y}) rotate(${rot})`}
                  onPointerDown={(e) => handlePointerDown(e, win.id)}
                  style={{ cursor: panMode ? 'grab' : 'move' }}
                >
                  <rect 
                    x="0" 
                    y="0" 
                    width={w} 
                    height={h} 
                    fill="#ffffff" 
                    stroke={isSelected ? '#4f46e5' : '#334155'} 
                    strokeWidth={isSelected ? 2.5 : 2} 
                    rx={2}
                  />
                  <line x1="3" y1={h / 2} x2={w - 3} y2={h / 2} stroke="#38bdf8" strokeWidth={2} />
                  <line x1={w / 2} y1="0" x2={w / 2} y2={h} stroke="#334155" strokeWidth={1.5} />
                </g>
              );
            })}

            {/* 5. DIBUJO DE ESCALERAS */}
            {currentShapes.filter(s => s.type === 'stairs').map(st => {
              const isSelected = st.id === selectedShapeId;
              const w = st.width || 90;
              const h = st.height || 60;
              const rot = st.rotation || 0;
              const steps = 6;
              const stepWidth = w / steps;

              return (
                <g 
                  key={st.id}
                  transform={`translate(${st.x}, ${st.y}) rotate(${rot})`}
                  onPointerDown={(e) => handlePointerDown(e, st.id)}
                  style={{ cursor: panMode ? 'grab' : 'move' }}
                >
                  <rect 
                    x="0" 
                    y="0" 
                    width={w} 
                    height={h} 
                    fill="rgba(241, 245, 249, 0.9)" 
                    stroke={isSelected ? '#4f46e5' : '#64748b'} 
                    strokeWidth={isSelected ? 2.5 : 1.5} 
                    rx={3}
                  />
                  {Array.from({ length: steps - 1 }).map((_, i) => (
                    <line 
                      key={i} 
                      x1={(i + 1) * stepWidth} 
                      y1="0" 
                      x2={(i + 1) * stepWidth} 
                      y2={h} 
                      stroke="#94a3b8" 
                      strokeWidth={1.5} 
                    />
                  ))}
                  <line x1="10" y1={h / 2} x2={w - 14} y2={h / 2} stroke="#4f46e5" strokeWidth={2} />
                  <polygon points={`${w - 8},${h / 2} ${w - 16},${h / 2 - 4} ${w - 16},${h / 2 + 4}`} fill="#4f46e5" />
                </g>
              );
            })}

            {/* 6. TRAZO VIVO EN MODO RECTÁNGULO */}
            {drawingMode === 'rect' && rectDrawing && (
              <g pointerEvents="none">
                <rect
                  x={Math.min(rectDrawing.startX, rectDrawing.currentX)}
                  y={Math.min(rectDrawing.startY, rectDrawing.currentY)}
                  width={Math.max(2, Math.abs(rectDrawing.currentX - rectDrawing.startX))}
                  height={Math.max(2, Math.abs(rectDrawing.currentY - rectDrawing.startY))}
                  rx={6}
                  fill="rgba(79, 70, 229, 0.12)"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  strokeDasharray="6,4"
                />
              </g>
            )}

            {/* 7. TRAZO VIVO EN MODO POLÍGONO */}
            {drawingMode === 'polygon' && polygonPoints.length > 0 && (
              <g pointerEvents="none">
                {Array.from({ length: (polygonPoints.length / 2) - 1 }).map((_, i) => (
                  <line
                    key={i}
                    x1={polygonPoints[i * 2]}
                    y1={polygonPoints[i * 2 + 1]}
                    x2={polygonPoints[(i + 1) * 2]}
                    y2={polygonPoints[(i + 1) * 2 + 1]}
                    stroke="#4f46e5"
                    strokeWidth={2.5}
                  />
                ))}
                {Array.from({ length: polygonPoints.length / 2 }).map((_, i) => (
                  <circle
                    key={i}
                    cx={polygonPoints[i * 2]}
                    cy={polygonPoints[i * 2 + 1]}
                    r={i === 0 ? 6 : 4.5}
                    fill={i === 0 ? '#10b981' : '#4f46e5'}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
                {currentPointerCoord && (
                  <line
                    x1={polygonPoints[polygonPoints.length - 2]}
                    y1={polygonPoints[polygonPoints.length - 1]}
                    x2={currentPointerCoord.x}
                    y2={currentPointerCoord.y}
                    stroke="#818cf8"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                )}
              </g>
            )}
          </g>
        </svg>

        {/* ============ MENSAJE SUTIL DE INICIO (LIMPIO, SIN ICONOS DE IA) ============ */}
        {currentShapes.length === 0 && drawingMode === 'none' && (
          <div className="mfp-start-helper" style={editorStyles.startHelperPill}>
            <span>Tocá <strong>+</strong> para dibujar tu primer ambiente</span>
          </div>
        )}

        {/* ============ BOTONES FLOTANTES DE PISO (CON NÚMERO), ZOOM Y PAN ============ */}
        <div className="mfp-floating-nav" style={editorStyles.floatingNavControls}>
          {/* Botón Selector de Piso con Número Claro 0, 1, 2 */}
          <button 
            type="button" 
            className="mfp-nav-circle-btn"
            style={{
              ...editorStyles.navCircleBtn,
              backgroundColor: isFloorPickerOpen ? 'rgba(79, 70, 229, 0.1)' : '#ffffff',
              borderColor: isFloorPickerOpen ? '#4f46e5' : '#e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1px',
            }}
            onClick={() => setIsFloorPickerOpen(prev => !prev)}
            title={`Piso actual: ${currentFloor?.name || 'Planta Baja'}`}
          >
            <span style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', lineHeight: 1 }}>
              PISO
            </span>
            <span style={{ fontSize: '15px', fontWeight: '900', color: '#4f46e5', lineHeight: 1 }}>
              {getFloorNumberDisplay()}
            </span>
          </button>

          <button 
            type="button" 
            className="mfp-nav-circle-btn"
            style={{
              ...editorStyles.navCircleBtn,
              backgroundColor: panMode ? '#4f46e5' : '#ffffff',
              color: panMode ? '#ffffff' : '#1e293b'
            }}
            onClick={() => setPanMode(prev => !prev)}
            title={panMode ? 'Modo selección' : 'Modo mover lienzo'}
          >
            <Move size={17} strokeWidth={2.2} />
          </button>
          <button 
            type="button" 
            className="mfp-nav-circle-btn"
            style={editorStyles.navCircleBtn}
            onClick={() => setScale(s => Math.min(2.5, +(s + 0.15).toFixed(2)))}
            title="Acercar"
          >
            <ZoomIn size={17} strokeWidth={2.2} />
          </button>
          <button 
            type="button" 
            className="mfp-nav-circle-btn"
            style={editorStyles.navCircleBtn}
            onClick={() => setScale(s => Math.max(0.4, +(s - 0.15).toFixed(2)))}
            title="Alejar"
          >
            <ZoomOut size={17} strokeWidth={2.2} />
          </button>
          <button 
            type="button" 
            className="mfp-nav-circle-btn"
            style={editorStyles.navCircleBtn}
            onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            title="Centrar vista"
          >
            <Maximize2 size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* ============ 4A. BARRA FLOTANTE COMPACTA DE ACCIÓN (SUPER SIMPLE) ============ */}
      {selectedShape && !isPropsModalOpen && !isDragging && drawingMode === 'none' && (
        <div className="mfp-selected-pill" style={editorStyles.selectedShapePill}>
          {/* Botón Editar: Abre el modal SOLO cuando el usuario lo desea */}
          {isRoomOrPoly && (
            <button
              type="button"
              className="mfp-pill-edit-btn"
              style={editorStyles.pillEditBtn}
              onClick={(e) => {
                e.stopPropagation();
                setIsPropsModalOpen(true);
              }}
              title="Editar nombre y color"
            >
              <Pencil size={13} strokeWidth={2.4} />
              <span>Editar</span>
            </button>
          )}

          {/* Botón Bloquear / Desbloquear posición */}
          <button
            type="button"
            className="mfp-pill-icon-btn"
            style={{
              ...editorStyles.pillIconBtn,
              backgroundColor: selectedShape.locked ? '#fef3c7' : '#f1f5f9',
              borderColor: selectedShape.locked ? '#f59e0b' : '#e2e8f0',
              color: selectedShape.locked ? '#b45309' : '#475569'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLockSelected();
            }}
            title={selectedShape.locked ? 'Desbloquear elemento (permitir mover)' : 'Bloquear posición'}
            aria-label={selectedShape.locked ? 'Desbloquear' : 'Bloquear'}
          >
            {selectedShape.locked ? (
              <Lock size={16} strokeWidth={2.4} />
            ) : (
              <Unlock size={16} strokeWidth={2.2} />
            )}
          </button>

          {/* Borrar */}
          <button
            type="button"
            className="mfp-pill-delete-btn"
            style={editorStyles.pillDeleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteSelected();
            }}
            title="Eliminar"
            aria-label="Eliminar"
          >
            <Trash2 size={16} strokeWidth={2.2} />
          </button>

          {/* Deseleccionar */}
          <button
            type="button"
            className="mfp-pill-deselect-btn"
            style={editorStyles.pillDeselectBtn}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedShapeId(null);
            }}
            title="Cerrar selección"
            aria-label="Cerrar selección"
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* ============ 4B. MODAL DEDICADO DE PROPIEDADES (SOLO CUANDO SE TOCA 'EDITAR') ============ */}
      {selectedShape && isPropsModalOpen && (
        <div className="mfp-props-overlay" style={editorStyles.propsModalOverlay} onClick={() => setIsPropsModalOpen(false)}>
          <div className="mfp-props-sheet" style={editorStyles.propsModalSheet} onClick={(e) => e.stopPropagation()}>
            {/* Manija táctil superior */}
            <div className="mfp-sheet-handle" style={editorStyles.sheetHandleBar} />

            {/* Cabecera del Modal */}
            <div className="mfp-props-header" style={editorStyles.propsCardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={editorStyles.propsCardTypeLabel}>
                  {selectedShape.noRoom 
                    ? 'Pasillo / Área de circulación' 
                    : isRoomOrPoly 
                    ? `Configurar: ${selectedShape.label || 'Ambiente'}` 
                    : selectedShape.type === 'door' 
                    ? 'Configurar Puerta' 
                    : selectedShape.type === 'window' 
                    ? 'Configurar Ventana' 
                    : 'Configurar Escalera'}
                </span>
              </div>
              <button 
                type="button" 
                style={editorStyles.propsCloseBtn} 
                onClick={() => setIsPropsModalOpen(false)}
              >
                <X size={19} color="#64748b" />
              </button>
            </div>

            {/* Cuerpo del Modal con scroll interno */}
            <div className="mfp-props-body" style={editorStyles.propsBodySection}>
              {isRoomOrPoly ? (
                <>
                  {/* Segmented control amplio para dedos */}
                  <div style={editorStyles.typeToggleRow}>
                    <button
                      type="button"
                      className="mfp-type-toggle-btn"
                      style={{
                        ...editorStyles.typeToggleBtn,
                        backgroundColor: !selectedShape.noRoom ? '#4f46e5' : '#f1f5f9',
                        color: !selectedShape.noRoom ? '#ffffff' : '#64748b'
                      }}
                      onClick={() => handleTogglePasillo(false)}
                    >
                      <Home size={16} />
                      <span>Habitación</span>
                    </button>
                    <button
                      type="button"
                      className="mfp-type-toggle-btn"
                      style={{
                        ...editorStyles.typeToggleBtn,
                        backgroundColor: selectedShape.noRoom ? '#4f46e5' : '#f1f5f9',
                        color: selectedShape.noRoom ? '#ffffff' : '#64748b'
                      }}
                      onClick={() => handleTogglePasillo(true)}
                    >
                      <CornerDownRight size={16} />
                      <span>Pasillo</span>
                    </button>
                  </div>

                  {/* Selector de ambiente de la propiedad */}
                  {!selectedShape.noRoom && (
                    <div style={{ marginTop: '4px' }}>
                      <label style={editorStyles.fieldLabel}>Asignar ambiente de la propiedad:</label>
                      <select
                        value={selectedShape.ambienteId || ''}
                        onChange={(e) => handleAssignRoom(e.target.value)}
                        className="mfp-room-select"
                        style={editorStyles.roomSelectDropdown}
                      >
                        <option value="">Seleccionar ambiente...</option>
                        {(property?.rooms || ['Living Comedor', 'Cocina', 'Dormitorio Principal', 'Baño']).map(rName => {
                          const isAssignedOther = assignedAmbientsMap[rName];
                          return (
                            <option key={rName} value={rName}>
                              {rName} {isAssignedOther && selectedShape.ambienteId !== rName ? '(en uso)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* Paleta de colores */}
                  <div style={{ marginTop: '4px' }}>
                    <label style={editorStyles.fieldLabel}>Color arquitectónico:</label>
                    <div style={editorStyles.colorsRow}>
                      {LIGHT_PALETTES.map(pal => (
                        <button
                          key={pal.id}
                          type="button"
                          className="mfp-color-btn"
                          style={{
                            ...editorStyles.colorSwatchBtn,
                            backgroundColor: pal.dot,
                            borderColor: selectedShape.stroke === pal.stroke ? '#0f172a' : 'transparent',
                            transform: selectedShape.stroke === pal.stroke ? 'scale(1.18)' : 'scale(1)'
                          }}
                          onClick={() => handleChangeColor(pal)}
                          title={pal.name}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                    Elemento arquitectónico: <strong style={{ color: '#0f172a' }}>{selectedShape.type === 'door' ? 'Puerta' : selectedShape.type === 'window' ? 'Ventana' : 'Escalera'}</strong>
                  </p>
                  <button 
                    type="button" 
                    className="mfp-action-pill-btn"
                    style={{ ...editorStyles.actionPillBtn, width: '100%', height: '42px', justifyContent: 'center' }} 
                    onClick={handleRotateSelected}
                  >
                    <RotateCw size={17} color="#4f46e5" />
                    <span>Girar orientación (90°)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Acciones de Bloquear y Borrar fijas */}
            <div className="mfp-props-footer" style={{ ...editorStyles.propsActionsFooter, flexShrink: 0 }}>
              <button 
                type="button" 
                className="mfp-action-pill-btn"
                style={{
                  ...editorStyles.actionPillBtn,
                  backgroundColor: selectedShape.locked ? '#fef3c7' : '#f1f5f9',
                  borderColor: selectedShape.locked ? '#f59e0b' : '#e2e8f0',
                  color: selectedShape.locked ? '#b45309' : '#475569'
                }} 
                onClick={handleToggleLockSelected}
              >
                {selectedShape.locked ? <Lock size={16} strokeWidth={2.4} /> : <Unlock size={16} strokeWidth={2.2} />}
                <span>{selectedShape.locked ? 'Bloqueado' : 'Desbloqueado'}</span>
              </button>

              <button 
                type="button" 
                className="mfp-delete-pill-btn"
                style={editorStyles.deletePillBtn} 
                onClick={() => {
                  handleDeleteSelected();
                  setIsPropsModalOpen(false);
                }}
              >
                <Trash2 size={16} color="#ef4444" />
                <span>Borrar</span>
              </button>
            </div>

            {/* Botón principal de Confirmar / Listo */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexShrink: 0 }}>
              <button
                type="button"
                className="mfp-props-done-btn"
                style={editorStyles.propsDoneBtn}
                onClick={() => setIsPropsModalOpen(false)}
              >
                <Check size={17} strokeWidth={2.6} />
                <span>Listo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 5. CÁPSULA FLOTANTE INFERIOR CON FAB (+) CIRCULAR Y UNDO/REDO ============ */}
      {drawingMode === 'none' && (
        <div className="mfp-bottom-dock" style={editorStyles.bottomFloatingDock}>
          <button
            type="button"
            className="mfp-dock-circle-btn"
            style={{
              ...editorStyles.dockCircleBtn,
              opacity: historyIndex > 0 ? 1 : 0.35,
              cursor: historyIndex > 0 ? 'pointer' : 'default'
            }}
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Deshacer"
          >
            <Undo2 size={20} strokeWidth={2.3} color="#1e293b" />
          </button>

          <button
            type="button"
            className="mfp-dock-fab"
            style={{
              ...editorStyles.dockFabCircleBtn,
              transform: isAddMenuOpen ? 'rotate(45deg)' : 'none',
              backgroundColor: isAddMenuOpen ? '#3730a3' : '#4f46e5',
            }}
            onClick={() => setIsAddMenuOpen(prev => !prev)}
            aria-label="Agregar elemento al plano"
          >
            <Plus size={24} color="#ffffff" strokeWidth={2.8} />
          </button>

          <button
            type="button"
            className="mfp-dock-circle-btn"
            style={{
              ...editorStyles.dockCircleBtn,
              opacity: historyIndex < history.length - 1 ? 1 : 0.35,
              cursor: historyIndex < history.length - 1 ? 'pointer' : 'default'
            }}
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Rehacer"
          >
            <Redo2 size={20} strokeWidth={2.3} color="#1e293b" />
          </button>
        </div>
      )}

      {/* ============ 6. MENÚ FLOTANTE AL TOCAR EL FAB (+) ============ */}
      {isAddMenuOpen && (
        <div className="mfp-add-overlay" style={editorStyles.addMenuOverlay} onClick={() => setIsAddMenuOpen(false)}>
          <div className="mfp-add-card" style={editorStyles.addMenuCard} onClick={e => e.stopPropagation()}>
            <div className="mfp-add-header" style={editorStyles.addMenuHeader}>
              <h3 className="mfp-add-title" style={editorStyles.addMenuTitle}>¿Qué querés agregar al plano?</h3>
              <button type="button" className="mfp-add-close-btn" style={editorStyles.addMenuCloseBtn} onClick={() => setIsAddMenuOpen(false)}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="mfp-add-grid" style={editorStyles.addOptionsGrid}>
              {/* Opción 1: Habitación Rectangular (Trazar con dedos) */}
              <button
                type="button"
                className="mfp-add-option-card"
                style={editorStyles.addOptionCard}
                onClick={handleStartDrawRect}
              >
                <div className="mfp-add-icon-box" style={{ ...editorStyles.addOptionIconBox, backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                  <Square size={20} />
                </div>
                <div style={editorStyles.addOptionTextBox}>
                  <h4 className="mfp-add-opt-title" style={editorStyles.addOptionTitle}>Habitación (Rectángulo)</h4>
                  <p className="mfp-add-opt-desc" style={editorStyles.addOptionDesc}>Tocá y arrastrá en la grilla para definir tamaño</p>
                </div>
              </button>

              {/* Opción 2: Trazar con dedos (Polígono / Formas libres) */}
              <button
                type="button"
                className="mfp-add-option-card"
                style={editorStyles.addOptionCard}
                onClick={handleStartDrawPolygon}
              >
                <div className="mfp-add-icon-box" style={{ ...editorStyles.addOptionIconBox, backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#0284c7' }}>
                  <PenTool size={20} />
                </div>
                <div style={editorStyles.addOptionTextBox}>
                  <h4 className="mfp-add-opt-title" style={editorStyles.addOptionTitle}>Trazar con dedos</h4>
                  <p className="mfp-add-opt-desc" style={editorStyles.addOptionDesc}>Marcá esquinas libres (L, triángulos, ochavas)</p>
                </div>
              </button>

              {/* Opción 3: Puerta */}
              <button
                type="button"
                className="mfp-add-option-card"
                style={editorStyles.addOptionCard}
                onClick={handleAddDoor}
              >
                <div className="mfp-add-icon-box" style={{ ...editorStyles.addOptionIconBox, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                  <DoorOpen size={20} />
                </div>
                <div style={editorStyles.addOptionTextBox}>
                  <h4 className="mfp-add-opt-title" style={editorStyles.addOptionTitle}>Puerta</h4>
                  <p className="mfp-add-opt-desc" style={editorStyles.addOptionDesc}>Abertura con arco abatible</p>
                </div>
              </button>

              {/* Opción 4: Ventana */}
              <button
                type="button"
                className="mfp-add-option-card"
                style={editorStyles.addOptionCard}
                onClick={handleAddWindow}
              >
                <div className="mfp-add-icon-box" style={{ ...editorStyles.addOptionIconBox, backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0284c7' }}>
                  <AppWindow size={20} />
                </div>
                <div style={editorStyles.addOptionTextBox}>
                  <h4 className="mfp-add-opt-title" style={editorStyles.addOptionTitle}>Ventana</h4>
                  <p className="mfp-add-opt-desc" style={editorStyles.addOptionDesc}>Abertura arquitectónica</p>
                </div>
              </button>

              {/* Opción 5: Escalera */}
              <button
                type="button"
                className="mfp-add-option-card"
                style={editorStyles.addOptionCard}
                onClick={handleAddStairs}
              >
                <div className="mfp-add-icon-box" style={{ ...editorStyles.addOptionIconBox, backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                  <ArrowUpDown size={20} />
                </div>
                <div style={editorStyles.addOptionTextBox}>
                  <h4 className="mfp-add-opt-title" style={editorStyles.addOptionTitle}>Escalera</h4>
                  <p className="mfp-add-opt-desc" style={editorStyles.addOptionDesc}>Peldaños con flecha de subida</p>
                </div>
              </button>

              {/* Opción 6: Agregar nuevo piso / planta */}
              <button
                type="button"
                className="mfp-add-option-card"
                style={editorStyles.addOptionCard}
                onClick={() => {
                  setIsAddMenuOpen(false);
                  handleAddFloor();
                }}
              >
                <div className="mfp-add-icon-box" style={{ ...editorStyles.addOptionIconBox, backgroundColor: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                  <Layers size={20} />
                </div>
                <div style={editorStyles.addOptionTextBox}>
                  <h4 className="mfp-add-opt-title" style={editorStyles.addOptionTitle}>Nuevo Piso / Planta</h4>
                  <p className="mfp-add-opt-desc" style={editorStyles.addOptionDesc}>Crear nivel o planta adicional</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 7. DRAWER DE CAMBIO DE PISO (MULTI-PLANTA) ============ */}
      {isFloorPickerOpen && (
        <div className="mfp-floor-overlay mfp-add-overlay" style={editorStyles.addMenuOverlay} onClick={() => setIsFloorPickerOpen(false)}>
          <div className="mfp-floor-card mfp-add-card" style={editorStyles.addMenuCard} onClick={e => e.stopPropagation()}>
            <div className="mfp-add-header" style={editorStyles.addMenuHeader}>
              <h3 className="mfp-add-title" style={editorStyles.addMenuTitle}>Plantas y Pisos</h3>
              <button type="button" className="mfp-add-close-btn" style={editorStyles.addMenuCloseBtn} onClick={() => setIsFloorPickerOpen(false)}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {floors.map(f => (
                <button
                  key={f.id}
                  type="button"
                  className="mfp-floor-row-btn"
                  style={{
                    ...editorStyles.floorRowBtn,
                    borderColor: f.id === activeFloorId ? '#4f46e5' : '#e2e8f0',
                    backgroundColor: f.id === activeFloorId ? 'rgba(79, 70, 229, 0.08)' : '#f8fafc'
                  }}
                  onClick={() => {
                    setActiveFloorId(f.id);
                    setSelectedShapeId(null);
                    setIsFloorPickerOpen(false);
                  }}
                >
                  <Layers size={17} color={f.id === activeFloorId ? '#4f46e5' : '#64748b'} />
                  <span style={{ flex: 1, textAlign: 'left', fontWeight: f.id === activeFloorId ? '800' : '600', color: f.id === activeFloorId ? '#4f46e5' : '#1e293b' }}>
                    {f.name}
                  </span>
                  <span style={editorStyles.floorItemCount}>
                    {(f.shapes || []).length} {f.shapes?.length === 1 ? 'objeto' : 'objetos'}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="mfp-add-floor-btn"
                style={editorStyles.addFloorActionBtn}
                onClick={handleAddFloor}
              >
                <Plus size={16} color="#4f46e5" strokeWidth={2.4} />
                <span>Agregar nuevo piso / planta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ TOAST DE GUARDADO EXITOSO ============ */}
      {saveToast && (
        <div className="mfp-toast-success" style={editorStyles.toastSuccess}>
          <Check size={18} color="#10b981" strokeWidth={3} />
          <span>¡Plano guardado exitosamente!</span>
        </div>
      )}
    </div>
  );
}

// ============ ESTILOS ERGONÓMICOS PARA CELULARES ============
const editorStyles = {
  fullscreenOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1100,
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    fontFamily: 'Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  topBar: {
    height: '56px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 12px',
    zIndex: 20,
    gap: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  topBackBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  topTitleSection: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
  },
  topPropName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '220px',
  },
  topSaveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '7px 14px',
    borderRadius: '10px',
    backgroundColor: '#4f46e5',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
    flexShrink: 0,
  },
  drawingBanner: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '9px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 15,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
  },
  drawingBannerText: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#334155',
  },
  finishPolyBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  cancelPolyBtn: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    padding: '6px 10px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'none',
    backgroundColor: '#f8fafc',
  },
  svgCanvas: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  startHelperPill: {
    position: 'absolute',
    bottom: '84px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #e2e8f0',
    padding: '7px 16px',
    borderRadius: '20px',
    fontSize: '12.5px',
    color: '#475569',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: 20,
  },
  floatingNavControls: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 10,
  },
  navCircleBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
  },
  selectedShapePill: {
    position: 'absolute',
    bottom: '86px',
    left: '50%',
    transform: 'translateX(-50%)',
    height: '48px',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(16px)',
    border: '1.5px solid #e2e8f0',
    borderRadius: '24px',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    zIndex: 45,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    boxSizing: 'border-box',
  },
  pillEditBtn: {
    height: '36px',
    padding: '0 12px',
    borderRadius: '18px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
    flexShrink: 0,
  },
  pillIconBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  pillDeleteBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#ef4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  pillDeselectBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  propsModalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(3px)',
    zIndex: 1200,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  propsModalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '12px 18px 20px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: 'min(88vh, 660px)',
    minHeight: 0,
    overflow: 'hidden',
    boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.15)',
  },
  sheetHandleBar: {
    width: '38px',
    height: '4px',
    backgroundColor: '#cbd5e1',
    borderRadius: '2px',
    alignSelf: 'center',
    marginBottom: '4px',
  },
  propsDoneBtn: {
    width: '100%',
    height: '46px',
    borderRadius: '14px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    fontSize: '14px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
  },
  propsCardContainer: {
    position: 'absolute',
    bottom: '86px',
    left: '12px',
    right: '12px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '14px 16px',
    zIndex: 25,
    boxShadow: '0 10px 35px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '48vh',
    overflowY: 'auto',
  },
  propsCardHeader: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propsCardTypeLabel: {
    fontSize: '14px',
    fontWeight: '800',
    color: '#0f172a',
  },
  propsCardAreaBadge: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#4f46e5',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  propsCloseBtn: {
    background: 'none',
    border: 'none',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propsBodySection: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    paddingRight: '2px',
    paddingBottom: '10px',
  },
  typeToggleRow: {
    display: 'flex',
    gap: '6px',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '12px',
  },
  typeToggleBtn: {
    flex: 1,
    height: '42px',
    border: 'none',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  fieldLabel: {
    fontSize: '11.5px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    display: 'block',
    marginBottom: '6px',
  },
  roomSelectDropdown: {
    width: '100%',
    height: '44px',
    borderRadius: '12px',
    border: '1.5px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    padding: '0 12px',
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f172a',
    outline: 'none',
  },
  colorsRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    paddingTop: '2px',
  },
  colorSwatchBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2.5px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  propsActionsFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '10px',
    borderTop: '1px solid #f1f5f9',
  },
  actionPillBtn: {
    flex: 1,
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#334155',
    cursor: 'pointer',
  },
  deletePillBtn: {
    flex: 1,
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    fontSize: '13px',
    fontWeight: '700',
    color: '#ef4444',
    cursor: 'pointer',
  },
  bottomFloatingDock: {
    position: 'absolute',
    bottom: '22px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 30,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(16px)',
    border: '1px solid #e2e8f0',
    borderRadius: '40px',
    padding: '6px 12px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.1)',
  },
  dockCircleBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  dockFabCircleBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#4f46e5',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
    transition: 'all 0.2s ease',
  },
  addMenuOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    zIndex: 1200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  addMenuCard: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: '24px',
    borderTopRightRadius: '24px',
    padding: '18px 18px 32px 18px',
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '94vh',
    overflowY: 'auto',
  },
  addMenuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  addMenuTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#0f172a',
    margin: 0,
  },
  addMenuCloseBtn: {
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
  },
  addOptionsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  addOptionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
  },
  addOptionIconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addOptionTextBox: {
    flex: 1,
  },
  addOptionTitle: {
    fontSize: '13.5px',
    fontWeight: '700',
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  addOptionDesc: {
    fontSize: '11.5px',
    color: '#64748b',
    margin: 0,
  },
  floorRowBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '13px 14px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
  },
  floorItemCount: {
    fontSize: '11px',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    padding: '2px 7px',
    borderRadius: '6px',
    fontWeight: '600',
  },
  addFloorActionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '13px',
    borderRadius: '12px',
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    border: '1px dashed #4f46e5',
    color: '#4f46e5',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '6px',
  },
  toastSuccess: {
    position: 'absolute',
    top: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#ffffff',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    padding: '10px 18px',
    borderRadius: '24px',
    fontSize: '13px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    zIndex: 1500,
  },
};
