import express from 'express';
import * as usuarios from '../services/usuarios.service';
import {
  crearSesion,
  destruirSesion,
  limpiarCookieSesion,
  obtenerSesion,
} from '../middleware/sesion';

const router = express.Router();

/**
 * Inicio de sesión.
 *
 * Correcciones: consulta parametrizada y bcrypt (en usuarios.service),
 * validación de la entrada y mensaje de error genérico.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};

    // Validar tipo y largo: evita objetos/arrays raros y entradas gigantes
    if (
      typeof username !== 'string' || typeof password !== 'string' ||
      !username || !password ||
      username.length > 50 || password.length > 100
    ) {
      return res.status(400).json({ error: 'Falta usuario o contraseña.' });
    }

    const usuario = await usuarios.autenticar(username, password);

    if (!usuario) {
      // Mismo mensaje y mismo código para usuario inexistente y clave mala
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    crearSesion(req, res, {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      nombre: usuario.nombre,
    });

    res.json({
      mensaje: `¡Bienvenido, ${usuario.nombre}!`,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        nombre: usuario.nombre,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Cierre de sesión.
 *
 * Borra la sesión del almacén del servidor (así una cookie robada deja de
 * servir) y también la cookie del navegador.
 */
router.post('/logout', (req, res) => {
  destruirSesion(req);
  limpiarCookieSesion(res);
  res.json({ mensaje: 'Sesión cerrada.' });
});

/** Devuelve el usuario de la sesión actual. */
router.get('/yo', (req, res) => {
  const sesion = obtenerSesion(req);
  if (!sesion) {
    return res.status(401).json({ error: 'Necesitás iniciar sesión.' });
  }
  res.json({ usuario: sesion.usuario });
});

export default router;