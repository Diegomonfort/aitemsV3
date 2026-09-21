import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Bus de eventos global para el bridge nativo de iOS.
 * Permite que múltiples instancias de useAudioRecorder convivan sin sobreescribir el handler global.
 */
const nativeAudioListeners = new Set();

if (typeof window !== 'undefined') {
  window.__onNativeAudioEvent = (event, data) => {
    console.log(`[NativeAudioBridge] Evento recibido: "${event}" (data: ${data ? (typeof data === 'string' ? data.length + ' chars' : typeof data) : 'null'}, listeners: ${nativeAudioListeners.size})`);
    nativeAudioListeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('[NativeAudioBridge] Error ejecutando listener:', err);
      }
    });
  };
}

/**
 * Hook de grabación de audio.
 * - En iOS (Capacitor): usa AVFoundation nativo via webkit.messageHandlers
 * - En Web: usa getUserMedia + MediaRecorder
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const resolveStopRef = useRef(null);
  const stopTimeoutRef = useRef(null);
  const isThisRecordingRef = useRef(false);
  const isNative = Capacitor.isNativePlatform();

  // Timer compartido
  const startTimer = useCallback(() => {
    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ── NATIVO: escuchar eventos desde Swift a través del bus global ──
  useEffect(() => {
    if (!isNative) return;

    const handleNativeEvent = (event, data) => {
      console.log(`[useAudioRecorder] Evento nativo: ${event}`, {
        isThisRecording: isThisRecordingRef.current,
        hasResolver: !!resolveStopRef.current
      });

      switch (event) {
        case 'started':
          if (isThisRecordingRef.current) {
            setIsRecording(true);
            setError(null);
          }
          break;

        case 'stopped':
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          stopTimer();
          setIsRecording(false);
          isThisRecordingRef.current = false;

          // Solo la instancia que solicitó detener la grabación resuelve su promesa
          if (resolveStopRef.current) {
            const resolver = resolveStopRef.current;
            resolveStopRef.current = null;

            if (data && typeof data === 'string' && data.length > 0) {
              try {
                console.log(`[useAudioRecorder] Decodificando base64 a Blob (${data.length} caracteres)...`);
                const byteChars = atob(data);
                const byteArray = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) {
                  byteArray[i] = byteChars.charCodeAt(i);
                }
                const audioBlob = new Blob([byteArray], { type: 'audio/mp4' });
                console.log(`[useAudioRecorder] Blob creado exitosamente: ${audioBlob.size} bytes`);
                resolver({ audioBlob, mimeType: 'audio/mp4' });
              } catch (e) {
                console.error('[useAudioRecorder] Error al convertir base64 a Blob:', e);
                resolver({ audioBlob: new Blob([]), mimeType: 'audio/mp4' });
              }
            } else {
              console.warn('[useAudioRecorder] Evento stopped recibido sin datos base64');
              resolver({ audioBlob: new Blob([]), mimeType: 'audio/mp4' });
            }
          }
          break;

        case 'cancelled':
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          stopTimer();
          setIsRecording(false);
          setRecordingTime(0);
          isThisRecordingRef.current = false;
          if (resolveStopRef.current) {
            const resolver = resolveStopRef.current;
            resolveStopRef.current = null;
            resolver({ audioBlob: new Blob([]), mimeType: 'audio/mp4' });
          }
          break;

        case 'error':
          if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
          }
          stopTimer();
          setIsRecording(false);
          isThisRecordingRef.current = false;
          console.error('[useAudioRecorder] Error desde Swift:', data);
          setError(data || 'Error de grabación');
          if (resolveStopRef.current) {
            const resolver = resolveStopRef.current;
            resolveStopRef.current = null;
            resolver({ audioBlob: new Blob([]), mimeType: 'audio/mp4' });
          }
          break;
      }
    };

    nativeAudioListeners.add(handleNativeEvent);
    return () => {
      nativeAudioListeners.delete(handleNativeEvent);
    };
  }, [isNative, stopTimer]);

  // ── NATIVO: start/stop/cancel ──
  const startRecordingNative = useCallback(async () => {
    setError(null);
    setRecordingTime(0);
    isThisRecordingRef.current = true;
    try {
      console.log('[useAudioRecorder] Solicitando inicio de grabación nativa a Swift...');
      window.webkit.messageHandlers.audioRecorder.postMessage({ action: 'start' });
      startTimer();
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('[useAudioRecorder] Error al invocar audioRecorder.start:', err);
      isThisRecordingRef.current = false;
      setError('No se pudo iniciar la grabación nativa');
      return false;
    }
  }, [startTimer]);

  const stopRecordingNative = useCallback(() => {
    return new Promise((resolve) => {
      console.log('[useAudioRecorder] stopRecordingNative invocado');

      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      // Timeout de seguridad: 10 segundos máximo para evitar que la UI quede colgada para siempre
      stopTimeoutRef.current = setTimeout(() => {
        if (resolveStopRef.current) {
          console.warn('[useAudioRecorder] TIMEOUT esperando respuesta de Swift (10s)');
          const resolver = resolveStopRef.current;
          resolveStopRef.current = null;
          resolver({ audioBlob: new Blob([]), mimeType: 'audio/mp4' });
        }
      }, 10000);

      resolveStopRef.current = resolve;

      try {
        console.log('[useAudioRecorder] Enviando acción stop a Swift...');
        window.webkit.messageHandlers.audioRecorder.postMessage({ action: 'stop' });
      } catch (err) {
        console.error('[useAudioRecorder] Error al enviar stop a Swift:', err);
        if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
        resolveStopRef.current = null;
        resolve({ audioBlob: new Blob([]), mimeType: 'audio/mp4' });
      }
      stopTimer();
      setIsRecording(false);
    });
  }, [stopTimer]);

  const cancelRecordingNative = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    try {
      window.webkit.messageHandlers.audioRecorder.postMessage({ action: 'cancel' });
    } catch (e) {}
    stopTimer();
    setIsRecording(false);
    setRecordingTime(0);
    setError(null);
    isThisRecordingRef.current = false;
    if (resolveStopRef.current) {
      const resolver = resolveStopRef.current;
      resolveStopRef.current = null;
      resolver({ audioBlob: new Blob([]), mimeType: 'audio/mp4' });
    }
  }, [stopTimer]);

  // ── WEB: getUserMedia ──
  const startRecordingWeb = useCallback(async () => {
    setError(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('El navegador no soporta grabación de audio.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      streamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
          }
        }
      }

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (resolveStopRef.current) {
          resolveStopRef.current({ audioBlob, mimeType: actualMimeType });
          resolveStopRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      startTimer();
      return true;
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado.'
        : err.message || 'No se pudo acceder al micrófono.';
      setError(msg);
      setIsRecording(false);
      return false;
    }
  }, [startTimer]);

  const stopRecordingWeb = useCallback(() => {
    return new Promise((resolve) => {
      stopTimer();
      setIsRecording(false);
      if (mediaRecorderRef.current?.state !== 'inactive') {
        resolveStopRef.current = resolve;
        mediaRecorderRef.current.stop();
      } else {
        const actualMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        resolve({ audioBlob: new Blob(audioChunksRef.current, { type: actualMimeType }), mimeType: actualMimeType });
      }
    });
  }, [stopTimer]);

  const cancelRecordingWeb = useCallback(() => {
    stopTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    setError(null);
  }, [stopTimer]);

  // ── Dispatch ──
  const startRecording = useCallback(() => {
    return isNative ? startRecordingNative() : startRecordingWeb();
  }, [isNative, startRecordingNative, startRecordingWeb]);

  const stopRecording = useCallback(() => {
    return isNative ? stopRecordingNative() : stopRecordingWeb();
  }, [isNative, stopRecordingNative, stopRecordingWeb]);

  const cancelRecording = useCallback(() => {
    return isNative ? cancelRecordingNative() : cancelRecordingWeb();
  }, [isNative, cancelRecordingNative, cancelRecordingWeb]);

  return {
    isRecording,
    recordingTime,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError: () => setError(null)
  };
}
