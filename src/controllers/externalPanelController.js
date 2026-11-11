const bcrypt = require('bcryptjs');
const { db, getSystemConfig } = require('../../database/db');
const { logAudit } = require('../middleware/auth');

/**
 * SERVICIO DE INTEGRACIÓN CON PANEL EXTERNO (ARQUITECTURA MODULAR SEGURA)
 * Cumple con los lineamientos de ciberseguridad:
 * - Autenticación con Header seguro X-External-Panel-Key
 * - Nunca almacena contraseñas en texto plano
 * - Vinculación directa con el sistema central de usuarios y control de DEMO
 */

// Sincronizar / Validar registro proveniente de Panel Externo
async function handleExternalUserRegistration(req, res) {
  try {
    const providedApiKey = req.headers['x-external-panel-key'] || req.headers['authorization'];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // 1. Validar clave de panel externo configurada en el sistema
    const configRow = await db.get("SELECT valor FROM configuraciones WHERE clave = 'EXTERNAL_PANEL_API_KEY'");
    const validApiKey = configRow ? configRow.valor : null;

    if (!providedApiKey || (validApiKey && providedApiKey !== validApiKey && providedApiKey !== `Bearer ${validApiKey}`)) {
      return res.status(401).json({
        success: false,
        error: 'EXTERNAL_AUTH_FAILED',
        message: 'Acceso no autorizado por el panel externo. Token o clave API inválida.'
      });
    }

    const { nombre, email, password, telefono, empresa, metadataExterna, tipoPlan } = req.body;

    if (!email || !nombre) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'El nombre y el correo electrónico son obligatorios para la sincronización externa.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Comprobar si el usuario ya existe en la plataforma
    const existingUser = await db.get('SELECT id, estado FROM usuarios WHERE email = ?', [cleanEmail]);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'USER_ALREADY_EXISTS',
        message: 'El usuario ya se encuentra registrado en el núcleo de la plataforma.',
        userId: existingUser.id,
        estado: existingUser.estado
      });
    }

    // 3. Cifrado seguro de contraseña (o generación de hash temporal seguro)
    const rawPassword = password || ('BF_' + Math.random().toString(36).substring(2, 12) + '*2026');
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 4. Registro en el núcleo central
    const userRes = await db.run(
      `INSERT INTO usuarios (nombre, email, password_hash, rol_id, empresa, telefono, estado, email_verificado)
       VALUES (?, ?, ?, 3, ?, ?, 'activo', 1)`,
      [nombre.trim(), cleanEmail, passwordHash, empresa || 'Registro Panel Externo', telefono || null]
    );

    const newUserId = userRes.lastID;
    const now = new Date();
    const config = await getSystemConfig();

    // 5. Asignar DEMO o Suscripción según lo solicitado por el panel externo
    if (tipoPlan && tipoPlan.toUpperCase() === 'PRO') {
      const expiraEn = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.run(
        `INSERT INTO suscripciones (usuario_id, plan_nombre, estado, monto, fecha_inicio, fecha_vencimiento, metodo_pago)
         VALUES (?, 'PRO_MENSUAL', 'ACTIVA', 49.00, ?, ?, 'PANEL_EXTERNO')`,
        [newUserId, now.toISOString(), expiraEn.toISOString()]
      );
    } else {
      // Por defecto activar DEMO según duración configurada
      const demoDuration = config.default_demo_duration_minutes || 120;
      const expiraEn = new Date(now.getTime() + demoDuration * 60 * 1000);
      await db.run(
        `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado, ip_registro)
         VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)`,
        [newUserId, cleanEmail, demoDuration, now.toISOString(), expiraEn.toISOString(), clientIp]
      );
    }

    await logAudit(
      newUserId,
      cleanEmail,
      'SINCRONIZACION_PANEL_EXTERNO',
      'INTEGRACION_EXTERNA',
      JSON.stringify({ origen: 'Panel Externo', metadata: metadataExterna || null }),
      clientIp
    );

    return res.status(201).json({
      success: true,
      message: `Usuario sincronizado y dado de alta exitosamente en ${config.platform_name}.`,
      centralUserId: newUserId,
      email: cleanEmail,
      status: 'ACTIVO',
      sistema: 'CENTRAL_CORE'
    });
  } catch (err) {
    console.error('Error procesando registro desde panel externo:', err);
    return res.status(500).json({ success: false, message: 'Error interno en la integración del panel externo.' });
  }
}

// Consultar estado de la arquitectura de integración
async function getExternalPanelConfig(req, res) {
  try {
    const configRow = await db.get("SELECT valor FROM configuraciones WHERE clave = 'EXTERNAL_PANEL_API_KEY'");
    return res.status(200).json({
      success: true,
      ready: true,
      status: 'LISTO_PARA_VINCULAR',
      endpoint: '/api/external-panel/sync-user',
      method: 'POST',
      authHeader: 'X-External-Panel-Key',
      apiKeyHint: configRow ? (configRow.valor.substring(0, 10) + '********') : 'No configurado',
      instructions: 'Cuando suministres el panel externo, este endpoint procesará e integrará automáticamente los registros en BOOKFORCE con validación de seguridad.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error consultando estado de integración.' });
  }
}

module.exports = {
  handleExternalUserRegistration,
  getExternalPanelConfig
};
