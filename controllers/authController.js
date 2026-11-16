const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const firmarToken = (u) => jwt.sign({ id: u._id, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publico = (u) => ({ id: u._id, nombre: u.nombre, email: u.email, telefono: u.telefono, rol: u.rol, wizardsId: u.wizardsId, createdAt: u.createdAt });

const registrar = async (req, res) => {
    const { nombre, email, password, telefono } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });

    const existe = await Usuario.findOne({ email: email.toLowerCase() });
    if (existe) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });

    // Toda cuenta creada desde la página es 'cliente'; el staff se crea con scripts/crearAdmin.js
    const usuario = await Usuario.create({ nombre, email, telefono, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: firmarToken(usuario), usuario: publico(usuario) });
};

const login = async (req, res) => {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ email: String(email || '').toLowerCase() });
    if (!usuario || !(await bcrypt.compare(String(password || ''), usuario.password))) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    res.json({ token: firmarToken(usuario), usuario: publico(usuario) });
};

const perfil = async (req, res) => {
    const usuario = await Usuario.findById(req.user.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(publico(usuario));
};

const actualizarPerfil = async (req, res) => {
    const { nombre, telefono, wizardsId } = req.body;
    const usuario = await Usuario.findByIdAndUpdate(req.user.id, { nombre, telefono, wizardsId }, { new: true, runValidators: true });
    res.json(publico(usuario));
};

module.exports = { registrar, login, perfil, actualizarPerfil };
