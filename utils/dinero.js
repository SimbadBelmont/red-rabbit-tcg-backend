// Precios guardados en pesos (número). Formato para correos y respuestas.
const formatoMXN = (valor) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor) || 0);

module.exports = { formatoMXN };
