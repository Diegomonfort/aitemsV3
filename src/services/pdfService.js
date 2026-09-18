import { api } from './api';

export const pdfService = {
  /**
   * Generar PDF de inventario de una propiedad en el backend con Puppeteer
   * @param {string} propertyId
   * @param {string} userId
   * @param {object} options { lessor, tenant, customDate, showLogo, includePlano }
   */
  async generatePropertyPdf(propertyId, userId, options = {}) {
    const params = new URLSearchParams();
    if (options.lessor) params.set('lessor', options.lessor);
    if (options.tenant) params.set('tenant', options.tenant);
    if (options.customDate) params.set('custom_date', options.customDate);
    if (options.showLogo === false) params.set('show_logo', 'false');
    if (options.includePlano === false) params.set('include_plano', 'false');
    if (options.typeSeguro !== undefined) params.set('type_seguro', options.typeSeguro || 'none');

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get(`/api/pdf/property/${propertyId}/${userId}${queryString}`);
    if (!res.success) {
      throw new Error(res.message || res.error || 'Error al generar el PDF');
    }
    return res;
  },

  /**
   * Obtener información de un PDF por ID (público)
   * @param {string} pdfId
   */
  async getPdfById(pdfId) {
    const res = await api.get(`/api/pdf/info/${pdfId}`);
    if (!res.success) {
      throw new Error(res.message || res.error || 'PDF no encontrado');
    }
    return res;
  },

  /**
   * Descargar el archivo PDF directamente como blob
   * @param {string} pdfUrl
   * @param {string} propertyName
   */
  async downloadPdfFile(pdfUrl, propertyName = 'propiedad') {
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error('Error al descargar el archivo.');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanName = propertyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      link.download = `inventario-${cleanName || 'propiedad'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      return true;
    } catch (e) {
      console.error('Error al descargar el PDF:', e);
      throw e;
    }
  }
};
