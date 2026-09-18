import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const resolveStopRef = useRef(null);

  // Limpiar timer y stream al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setRecordingTime(0);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('El navegador no soporta grabación de audio o requiere conexión HTTPS');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Seleccionar el mejor mimeType soportado por el navegador
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = ''; // Dejar por defecto
            }
          }
        }
      }

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (resolveStopRef.current) {
          resolveStopRef.current({
            audioBlob,
            mimeType: actualMimeType
          });
          resolveStopRef.current = null;
        }
      };

      mediaRecorder.start(250); // Emitir chunks cada 250ms
      setIsRecording(true);

      // Iniciar timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);
      }, 1000);

      return true;
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
      const msg = err.name === 'NotAllowedError'
        ? 'Permiso de micrófono denegado. Por favor, habilitalo en tu navegador.'
        : err.message || 'No se pudo acceder al micrófono.';
      setError(msg);
      setIsRecording(false);
      return false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        resolveStopRef.current = resolve;
        mediaRecorderRef.current.stop();
      } else {
        const actualMimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        resolve({ audioBlob, mimeType: actualMimeType });
      }
    });
  }, []);

  const cancelRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    setError(null);
  }, []);

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
