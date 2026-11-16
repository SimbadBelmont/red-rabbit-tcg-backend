const inicioDelDia = (fecha = new Date()) => {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
};

const sumarDias = (dias, fecha = new Date()) => {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
};

module.exports = { inicioDelDia, sumarDias };
