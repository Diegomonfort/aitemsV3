// En producción la app no escribe nada en la consola del navegador (ni la app ni las librerías).
// En desarrollo (npm run dev) se sigue viendo todo para poder depurar.
// Se importa primero en main.jsx para que aplique antes que cualquier otro módulo.
if (import.meta.env.PROD && typeof console !== 'undefined') {
  const noop = () => {};
  ['log', 'info', 'debug', 'warn', 'error', 'trace', 'table', 'dir', 'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'count']
    .forEach((method) => {
      try {
        console[method] = noop;
      } catch (_) {
        // algunos navegadores no dejan reasignar: se ignora
      }
    });
}
