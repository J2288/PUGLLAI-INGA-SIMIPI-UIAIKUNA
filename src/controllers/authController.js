const bcrypt = require('bcryptjs');
const { db, getSystemConfig } = require('../../database/db');
const { signToken, logAudit } = require('../middleware/auth');
const { checkUserAccessStatus } = require('../middleware/demoEnforcer');

// REGISTRO DE ESTUDIANTE CON DEMO AUTOMÁTICO DE 120 MINUTOS
async function register(req, res) {
  try {
    const { nombre, email, password, telefono, empresa, institucion, codigoDocente, codigoVendedor } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, correo electrónico y contraseña son obligatorios.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Validar si el correo ya existe en usuarios
    const existingUser = await db.get('SELECT id FROM usuarios WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'EMAIL_EXISTS',
        message: 'Este correo electrónico ya se encuentra registrado. Inicia sesión.'
      });
    }

    // 2. REGLA ESTRICTA DE DEMO: Verificar que el correo no haya utilizado anteriormente la prueba gratuita
    const existingDemo = await db.get('SELECT id FROM pruebas_demo WHERE email = ?', [cleanEmail]);
    if (existingDemo) {
      return res.status(400).json({
        success: false,
        error: 'DEMO_ALREADY_USED',
        message: 'Este correo electrónico ya utilizó previamente el período de prueba gratuita. Debe solicitar una suscripción/licencia a su docente.'
      });
    }

    // 3. Verificar si viene vinculado a un código de docente
    let docenteId = null;
    const code = (codigoDocente || codigoVendedor || '').trim().toUpperCase();
    if (code) {
      const doc = await db.get('SELECT usuario_id FROM docentes WHERE codigo_docente = ?', [code]);
      if (doc) {
        docenteId = doc.usuario_id;
      } else {
        // Fallback en tabla vendedores
        const vend = await db.get('SELECT usuario_id FROM vendedores WHERE codigo_vendedor = ?', [code]);
        if (vend) docenteId = vend.usuario_id;
      }
    }

    // 4. Cifrado seguro de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Crear usuario con rol ESTUDIANTE (ID 3)
    const userResult = await db.run(
      `INSERT INTO usuarios (nombre, email, password_hash, rol_id, docente_id, vendedor_id, telefono, empresa, institucion, estado, email_verificado)
       VALUES (?, ?, ?, 3, ?, ?, ?, ?, ?, 'activo', 1)`,
      [nombre.trim(), cleanEmail, passwordHash, docenteId, docenteId, telefono || null, empresa || institucion || null, institucion || empresa || null]
    );

    const newUserId = userResult.lastID;

    // 6. Activar automáticamente el DEMO según la duración configurada en el servidor
    const config = await getSystemConfig();
    const demoDuration = config.default_demo_duration_minutes || 120;
    const ahora = new Date();
    const expiraEn = new Date(ahora.getTime() + demoDuration * 60 * 1000);

    await db.run(
      `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado, ip_registro)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)`,
      [newUserId, cleanEmail, demoDuration, ahora.toISOString(), expiraEn.toISOString(), clientIp]
    );

    // Si fue vinculado por docente, actualizar contador de estudiantes del docente
    if (docenteId) {
      await db.run('UPDATE docentes SET total_estudiantes = total_estudiantes + 1 WHERE usuario_id = ?', [docenteId]);
    }

    // Registrar en auditoría
    await logAudit(newUserId, cleanEmail, 'REGISTRO_ESTUDIANTE', 'AUTENTICACION', `Estudiante registrado con DEMO de ${demoDuration} min.`, clientIp);

    // Generar Token
    const token = signToken({
      id: newUserId,
      email: cleanEmail,
      nombre: nombre.trim(),
      rol_nombre: 'ESTUDIANTE'
    });

    res.cookie('bf_token', token, {
      httpOnly: true,
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    return res.status(201).json({
      success: true,
      message: `¡Bienvenido a ${config.platform_name}! Tu prueba gratuita de ${demoDuration} minutos ha comenzado.`,
      token,
      user: {
        id: newUserId,
        nombre: nombre.trim(),
        email: cleanEmail,
        rol: 'ESTUDIANTE',
        estado: 'activo'
      },
      demo: {
        status: 'DEMO ACTIVO',
        duracionMinutos: demoDuration,
        iniciadoEn: ahora.toISOString(),
        expiraEn: expiraEn.toISOString(),
        remainingMinutes: demoDuration
      }
    });
  } catch (err) {
    console.error('Error en registro:', err);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor al registrar estudiante.' });
  }
}

// INICIO DE SESIÓN
async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Desconocido';

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Ingrese correo y contraseña.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Buscar usuario y su rol
    const user = await db.get(
      `SELECT u.*, r.nombre as rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.email = ?`,
      [cleanEmail]
    );

    if (!user) {
      await db.run(
        `INSERT INTO historial_accesos (email, ip_address, user_agent, exitoso, motivo_fallo)
         VALUES (?, ?, ?, 0, 'USUARIO_NO_EXISTE')`,
        [cleanEmail, clientIp, userAgent]
      );
      return res.status(401).json({ success: false, message: 'Credenciales inválidas. Verifique su correo y contraseña.' });
    }

    // Verificar si está bloqueado temporalmente por intentos fallidos
    if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta temporalmente suspendida por múltiples intentos fallidos. Intente más tarde o contacte al administrador.'
      });
    }

    // Si el usuario está bloqueado administrativamente
    if (user.estado === 'bloqueado') {
      return res.status(403).json({
        success: false,
        message: 'Esta cuenta ha sido bloqueada por la Administración.'
      });
    }

    // Comparar hash de contraseña
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      const newAttempts = (user.intentos_fallidos || 0) + 1;
      let lockDate = null;
      if (newAttempts >= 5) {
        lockDate = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos de bloqueo
      }

      await db.run(
        'UPDATE usuarios SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
        [newAttempts, lockDate, user.id]
      );

      await db.run(
        `INSERT INTO historial_accesos (usuario_id, email, ip_address, user_agent, exitoso, motivo_fallo)
         VALUES (?, ?, ?, ?, 0, 'PASSWORD_INCORRECTO')`,
        [user.id, cleanEmail, clientIp, userAgent]
      );

      return res.status(401).json({
        success: false,
        message: newAttempts >= 5
          ? 'Demasiados intentos fallidos. Cuenta suspendida temporalmente por seguridad.'
          : 'Contraseña incorrecta.'
      });
    }

    // Inicio de sesión exitoso: reiniciar intentos fallidos y actualizar último login
    const nowIso = new Date().toISOString();
    await db.run(
      'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_login = ?, ip_ultimo_login = ? WHERE id = ?',
      [nowIso, clientIp, user.id]
    );

    await db.run(
      `INSERT INTO historial_accesos (usuario_id, email, ip_address, user_agent, exitoso)
       VALUES (?, ?, ?, ?, 1)`,
      [user.id, cleanEmail, clientIp, userAgent]
    );

    // Obtener estado autoritativo de acceso (Suscripción o Demo)
    const accessStatus = await checkUserAccessStatus(user.id);

    // Generar Token JWT
    const token = signToken(user);

    const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    res.cookie('bf_token', token, {
      httpOnly: true,
      secure: false,
      maxAge: cookieMaxAge,
      sameSite: 'lax'
    });

    return res.status(200).json({
      success: true,
      message: `¡Bienvenido de nuevo, ${user.nombre}!`,
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol_nombre,
        rol_id: user.rol_id,
        estado: user.estado,
        empresa: user.empresa || user.institucion,
        institucion: user.institucion || user.empresa,
        telefono: user.telefono
      },
      access: accessStatus
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor.' });
  }
}

// INICIO DE SESIÓN CON GOOGLE
async function googleAuth(req, res) {
  try {
    const { email, nombre, googleId, avatarUrl } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email de Google no suministrado.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await db.get(
      `SELECT u.*, r.nombre as rol_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.email = ?`,
      [cleanEmail]
    );

    if (!user) {
      // Registrar automáticamente con rol ESTUDIANTE (3)
      const randomPass = await bcrypt.hash('G_' + Math.random().toString(36), 10);
      const resUser = await db.run(
        `INSERT INTO usuarios (nombre, email, password_hash, rol_id, google_id, avatar_url, estado, email_verificado)
         VALUES (?, ?, ?, 3, ?, ?, 'activo', 1)`,
        [nombre || 'Estudiante Google', cleanEmail, randomPass, googleId || 'GOOGLE_SSO', avatarUrl || null]
      );

      const newId = resUser.lastID;

      // Crear DEMO con la duración configurada en el servidor
      const config = await getSystemConfig();
      const demoDuration = config.default_demo_duration_minutes || 120;
      const ahora = new Date();
      const expiraEn = new Date(ahora.getTime() + demoDuration * 60 * 1000);
      await db.run(
        `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado, ip_registro)
         VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)`,
        [newId, cleanEmail, demoDuration, ahora.toISOString(), expiraEn.toISOString(), clientIp]
      );

      user = await db.get(
        `SELECT u.*, r.nombre as rol_nombre
         FROM usuarios u
         JOIN roles r ON u.rol_id = r.id
         WHERE u.id = ?`,
        [newId]
      );

      await logAudit(newId, cleanEmail, 'REGISTRO_GOOGLE', 'AUTENTICACION', `Registro Estudiante mediante Google SSO con DEMO ${demoDuration} min`, clientIp);
    }

    if (user.estado === 'bloqueado') {
      return res.status(403).json({ success: false, message: 'Cuenta suspendida por el Administrador.' });
    }

    const accessStatus = await checkUserAccessStatus(user.id);
    const token = signToken(user);

    res.cookie('bf_token', token, { httpOnly: true, secure: false, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });

    return res.status(200).json({
      success: true,
      message: `Autenticado con Google exitosamente.`,
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol_nombre,
        estado: user.estado,
        avatar: user.avatar_url
      },
      access: accessStatus
    });
  } catch (err) {
    console.error('Error en Google Auth:', err);
    return res.status(500).json({ success: false, message: 'Error procesando autenticación con Google.' });
  }
}

// OBTENER PERFIL Y ESTADO EN TIEMPO REAL
async function getMe(req, res) {
  try {
    const user = await db.get(
      `SELECT u.id, u.nombre, u.email, u.estado, u.rol_id, r.nombre as rol_nombre, 
              u.empresa, u.institucion, u.telefono, u.creado_en, u.ultimo_login, u.avatar_url
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const accessStatus = await checkUserAccessStatus(user.id);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol_nombre,
        rol_id: user.rol_id,
        estado: user.estado,
        empresa: user.empresa || user.institucion,
        institucion: user.institucion || user.empresa,
        telefono: user.telefono,
        creadoEn: user.creado_en,
        ultimoLogin: user.ultimo_login,
        avatar: user.avatar_url
      },
      access: accessStatus
    });
  } catch (err) {
    console.error('Error en getMe:', err);
    return res.status(500).json({ success: false, message: 'Error consultando perfil.' });
  }
}

// RECUPERACIÓN DE CONTRASEÑA
async function recoverPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'El correo electrónico es requerido.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.get('SELECT id, nombre, email FROM usuarios WHERE email = ?', [cleanEmail]);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Si el correo electrónico está registrado en la plataforma, recibirás las instrucciones de recuperación.'
      });
    }

    const resetToken = 'BF-RST-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    await logAudit(user.id, cleanEmail, 'SOLICITUD_RECUPERACION_PASSWORD', 'AUTENTICACION', `Token generado: ${resetToken}`, req.ip);

    return res.status(200).json({
      success: true,
      message: 'Se han generado las instrucciones de recuperación para ' + cleanEmail + '.',
      recoveryCode: resetToken
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error en recuperación de contraseña.' });
  }
}

// RESTABLECER CONTRASEÑA
async function resetPassword(req, res) {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Correo y nueva contraseña requeridos.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await db.get('SELECT id FROM usuarios WHERE email = ?', [cleanEmail]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE usuarios SET password_hash = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, user.id]);
    await logAudit(user.id, cleanEmail, 'PASSWORD_RESTABLECIDO', 'AUTENTICACION', 'Contraseña restablecida exitosamente.', req.ip);

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error restableciendo contraseña.' });
  }
}

// CERRAR SESIÓN
function logout(req, res) {
  res.clearCookie('bf_token');
  return res.status(200).json({ success: true, message: 'Sesión cerrada correctamente.' });
}

module.exports = {
  register,
  login,
  googleAuth,
  getMe,
  recoverPassword,
  resetPassword,
  logout
};
