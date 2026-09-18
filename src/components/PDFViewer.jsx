import React, { useState, useEffect } from 'react';
import { Loader2, ExternalLink, ArrowLeft, Download, Shield } from 'lucide-react';
import { pdfService } from '../services/pdfService';
import logo from '../assets/logo-color.png';

export default function PDFViewer({ pdfId: initialPdfId, onBack }) {
  const [pdfId] = useState(() => {
    if (initialPdfId) return initialPdfId;
    const path = window.location.pathname;
    const match = path.match(/\/pdf\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  });

  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(checkMobile);

    if (!pdfId) {
      setError('Identificador de PDF no válido');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await pdfService.getPdfById(pdfId);

        if (data.success && data.pdf_url) {
          const separator = data.pdf_url.includes('?') ? '&' : '?';
          data.pdf_url = `${data.pdf_url}${separator}t=${new Date().getTime()}`;
          setPdfData(data);
        } else {
          setError('PDF no encontrado o enlace expirado');
        }
      } catch (err) {
        console.error('Error cargando PDF:', err);
        setError(err.message || 'Error al cargar el documento PDF');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pdfId]);

  if (loading) {
    return (
      <div style={styles.viewerContainer}>
        <div style={styles.header}>
          <img src={logo} alt="Aitems" style={styles.logo} />
        </div>
        <div style={styles.centerBox}>
          <Loader2 size={36} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>Cargando inventario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.viewerContainer}>
        <div style={styles.header}>
          <img src={logo} alt="Aitems" style={styles.logo} />
        </div>
        <div style={styles.centerBox}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 24, color: '#ef4444' }}>⚠️</span>
          </div>
          <h3 style={{ fontSize: 18, color: '#1e293b', marginBottom: 8 }}>{error}</h3>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>El PDF solicitado no está disponible o el link es incorrecto.</p>
          {onBack && (
            <button onClick={onBack} style={styles.backBtn}>
              <ArrowLeft size={16} /> Volver a Aitems
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.viewerContainer}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onBack && (
            <button onClick={onBack} style={styles.iconBtn} title="Volver">
              <ArrowLeft size={18} color="#475569" />
            </button>
          )}
          <img src={logo} alt="Aitems" style={styles.logo} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={styles.propName}>{pdfData.property_name || 'Inventario'}</span>
          <a
            href={pdfData.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            download
            style={styles.downloadBtn}
          >
            <Download size={15} />
            <span>Descargar</span>
          </a>
        </div>
      </div>

      {isMobile ? (
        <div style={styles.mobileContent}>
          <div style={styles.mobileCard}>
            <div style={styles.fileIconCircle}>
              <Shield size={32} color="#4f46e5" />
            </div>
            <h2 style={{ fontSize: 20, color: '#0f172a', margin: '0 0 8px 0', fontWeight: 600 }}>
              {pdfData.property_name || 'Inventario'}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Tocá el botón abajo para visualizar el documento oficial en pantalla completa.
            </p>
            <a
              href={pdfData.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.openFullBtn}
            >
              <ExternalLink size={18} />
              <span>Abrir PDF Completo</span>
            </a>
          </div>
        </div>
      ) : (
        <iframe
          src={`${pdfData.pdf_url}#toolbar=1&navpanes=0&scrollbar=1`}
          title={`Inventario - ${pdfData.property_name}`}
          style={styles.iframe}
        />
      )}
    </div>
  );
}

const styles = {
  viewerContainer: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 999999,
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    zIndex: 10,
  },
  logo: {
    height: 28,
    objectFit: 'contain',
  },
  propName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#334155',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  centerBox: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  mobileContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mobileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    textAlign: 'center',
    maxWidth: 380,
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
  },
  fileIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  openFullBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '14px 20px',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 2px 8px rgba(15,23,42,0.2)',
  },
  iframe: {
    flex: 1,
    width: '100%',
    height: '100%',
    border: 'none',
  },
};
