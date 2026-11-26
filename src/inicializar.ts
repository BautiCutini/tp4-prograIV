import * as db from './db';
import { CATALOGO } from './catalogo';
import { hashearPassword } from './services/usuarios.service';
import type { Rol } from './tipos';

interface UsuarioInicial {
  username: string;
  password: string;
  rol: Rol;
  nombre: string;
}

/**
 * Carga los datos iniciales (usuarios y catálogo) si la base está vacía.
 * Las contraseñas se guardan hasheadas con bcrypt; en la base nunca queda
 * el texto plano. Se eliminó la cuenta por defecto admin/admin.
 */
export const USUARIOS_INICIALES: UsuarioInicial[] = [
  { username: 'valentina', password: 'origen2024', rol: 'admin', nombre: 'Valentina' },
  { username: 'barista', password: 'cafe123', rol: 'barista', nombre: 'Barista' },
  { username: 'mozo', password: 'mozo123', rol: 'mozo', nombre: 'Mozo de sala' },
  { username: 'cliente', password: 'cliente', rol: 'cliente', nombre: 'Cliente' },
];

export async function inicializarBase(): Promise<void> {
  // --- Usuarios -------------------------------------------------------------
  for (const usuario of USUARIOS_INICIALES) {
    const hash = await hashearPassword(usuario.password);
    await db.query(
      `INSERT INTO usuarios (username, password, rol, nombre)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      [usuario.username, hash, usuario.rol, usuario.nombre]
    );
  }

  // --- Catálogo -------------------------------------------------------------
  for (const producto of CATALOGO) {
    await db.query(
      `INSERT INTO productos
         (nombre, tipo, variedad, tamano, gramos, precio_base, precio_por_gramo, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (nombre) DO NOTHING`,
      [
        producto.nombre,
        producto.tipo,
        producto.variedad,
        producto.tamano,
        producto.gramos,
        producto.precio_base,
        producto.precio_por_gramo,
        producto.descripcion,
      ]
    );
  }
}