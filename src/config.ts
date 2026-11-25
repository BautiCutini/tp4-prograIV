import path from 'path';

/** Lee una variable de entorno obligatoria; si falta, la app no arranca. */
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre} (ver .env.example)`);
  }
  return valor;
}

/**
 * Configuración de la aplicación.
 * Ningún secreto está escrito en el código: todo viene del entorno.
 */
export default {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'origen',
    user: requerida('DB_USER'),
    password: requerida('DB_PASSWORD'),
  },

  // Firma el token anti-CSRF y la sesión
  sessionSecret: requerida('SESSION_SECRET'),

  // Costo del hash de bcrypt
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),

  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'),
};