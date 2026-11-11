const jwt = require('jsonwebtoken');
const { db } = require('../../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'BOOKFORCE_ENTERPRISE_JWT_SECURE_TOKEN_KEY_2026';

// Generar Token JWT
function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol_nombre || user.rol
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware de Verificación de Token
async function verifyToken(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.bf_token) {
      token = req.cookies.bf_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'NO_TOKEN',
        message: 'Acceso no autorizado. Debe iniciar sesión.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Validar usuario en base de datos
    const user = await db.get(
      `SELECT u.id, u.nombre, u.email, u.estado, u.rol_id, r.nombre as rol_nombre, u.empresa, u.telefono
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Usuario no existe en el sistema.'
      });
    }

    if (user.estado === 'bloqueado') {
      return res.status(403).json({
        success: false,
        error: 'USER_BLOCKED',
        message: 'Su cuenta ha sido bloqueada por el Administrador. Contacte a soporte.'
      });
    }

    req.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol_nombre,
      rol_id: user.rol_id,
      estado: user.estado,
      empresa: user.empresa
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Sesión expirada o token inválido.'
    });
  }
}

// Middleware de Control de Roles (RBAC)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Acceso restringido. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

// Helper para Registrar Auditoría
async function logAudit(userId, email, accion, modulo, detalles, ip) {
  try {
    await db.run(
      `INSERT INTO registro_actividades (usuario_id, usuario_email, accion, modulo, detalles, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, email || null, accion, modulo, typeof detalles === 'object' ? JSON.stringify(detalles) : detalles, ip || '127.0.0.1']
    );
  } catch (err) {
    console.error('Error registrando auditoría:', err.message);
  }
}

module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
  requireRole,
  logAudit
};
