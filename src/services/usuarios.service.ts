import bcrypt from 'bcryptjs';
import * as db from '../db';
import config from '../config';
import type { Usuario } from '../tipos';

/**
 * Servicio de usuarios.
 *
 * Correcciones aplicadas:
 *  - Consultas parametrizadas en el login (sin inyección SQL).
 *  - Contraseñas hasheadas con bcrypt (salt por usuario incluido).
 *  - El login tarda lo mismo exista o no el usuario (evita enumerar por tiempos).
 *  - Actualización de usuarios con lista blanca de campos.
 */

// Columnas que se devuelven al listar: nunca el hash de la contraseña.
const COLUMNAS_PUBLICAS = 'id, username, rol, nombre, creado_en';

const ROLES_VALIDOS = ['admin', 'barista', 'mozo', 'cliente'];
const CAMPOS_EDITABLES = ['nombre', 'rol', 'password'];

// Hash descartable: se compara contra él cuando el usuario no existe.
const HASH_SENUELO = bcrypt.hashSync('senuelo-no-es-una-clave', config.bcryptRounds);

export async function hashearPassword(plana: string): Promise<string> {
  return bcrypt.hash(plana, config.bcryptRounds);
}

/** Busca un usuario por nombre de usuario exacto (query parametrizada). */
export async function buscarPorUsername(username: string): Promise<Usuario | null> {
  const { rows } = await db.query<Usuario>(
    'SELECT * FROM usuarios WHERE username = $1',
    [username]
  );
  return rows[0] || null;
}

/**
 * Autentica a un usuario comparando usuario y contraseña.
 * Devuelve el usuario o null (sin distinguir el motivo).
 */
export async function autenticar(username: string, password: string): Promise<Usuario | null> {
  const usuario = await buscarPorUsername(username);

  // Siempre se ejecuta un bcrypt.compare, exista o no el usuario.
  const coincide = await bcrypt.compare(password, usuario?.password ?? HASH_SENUELO);

  if (!usuario || !coincide) return null;
  return usuario;
}

/** Lista todos los usuarios (para el panel de administración), sin hashes. */
export async function listar(): Promise<Usuario[]> {
  const { rows } = await db.query<Usuario>(
    `SELECT ${COLUMNAS_PUBLICAS} FROM usuarios ORDER BY id`
  );
  return rows;
}

/**
 * Actualiza un usuario.
 * Solo se aceptan los campos de la lista blanca; el resto se ignora.
 * Los nombres de columna NUNCA salen de la entrada del usuario.
 * La autorización (¿quién puede cambiar el rol?) se controla en la ruta.
 */
export async function actualizar(id: number | string, cambios: Partial<Usuario>): Promise<Usuario | null> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let i = 1;

  for (const campo of CAMPOS_EDITABLES) {
    const valor = (cambios as Record<string, unknown>)[campo];
    if (typeof valor !== 'string') continue;
    if (campo === 'rol' && !ROLES_VALIDOS.includes(valor)) continue;

    campos.push(`${campo} = $${i}`);
    valores.push(campo === 'password' ? await hashearPassword(valor) : valor);
    i += 1;
  }

  if (campos.length === 0) return null;
  valores.push(id);

  const { rows } = await db.query<Usuario>(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = $${i}
     RETURNING ${COLUMNAS_PUBLICAS}`,
    valores
  );
  return rows[0] || null;
}

/** Cambia la contraseña de un usuario (se guarda hasheada). */
export async function cambiarPassword(id: number, nuevaPassword: string): Promise<Usuario | null> {
  const hash = await hashearPassword(nuevaPassword);
  const { rows } = await db.query<Usuario>(
    `UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING ${COLUMNAS_PUBLICAS}`,
    [hash, id]
  );
  return rows[0] || null;
}