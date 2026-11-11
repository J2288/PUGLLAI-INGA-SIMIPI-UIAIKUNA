const { db } = require('../../database/db');

/**
 * Evalúa el estado autoritativo en el SERVIDOR de acceso para un usuario:
 * - Roles: ADMINISTRADOR, DOCENTE, ESTUDIANTE
 * - Suscripción Activa (Licencia)
 * - Suscripción Vencida
 * - DEMO Activo de 120 minutos (cálculo de tiempo exacto restante en ms)
 * - DEMO Vencido (bloqueo automático)
 * - Bloqueado
 */
async function checkUserAccessStatus(userId) {
  const user = await db.get(
    `SELECT u.id, u.nombre, u.email, u.estado, u.rol_id, r.nombre as rol_nombre
     FROM usuarios u
     JOIN roles r ON u.rol_id = r.id
     WHERE u.id = ?`,
    [userId]
  );

  if (!user) {
    return {
      allowed: false,
      status: 'NO_EXISTE',
      message: 'Usuario no encontrado.'
    };
  }

  // Administradores y Docentes siempre tienen acceso a sus paneles
  if (user.rol_nombre === 'ADMINISTRADOR') {
    return {
      allowed: true,
      status: 'ADMINISTRADOR',
      role: 'ADMINISTRADOR',
      message: 'Acceso total como Administrador.'
    };
  }

  if (user.rol_nombre === 'DOCENTE' || user.rol_nombre === 'VENDEDOR') {
    return {
      allowed: true,
      status: 'DOCENTE',
      role: 'DOCENTE',
      message: 'Acceso pedagógico habilitado para Docente.'
    };
  }

  // Si el usuario está bloqueado manualmente
  if (user.estado === 'bloqueado') {
    return {
      allowed: false,
      status: 'BLOQUEADO',
      message: 'Cuenta suspendida por la administración de la plataforma.'
    };
  }

  const now = new Date();

  // 1. Verificar Suscripción / Licencia Activa en base de datos
  const activeSub = await db.get(
    `SELECT * FROM suscripciones 
     WHERE usuario_id = ? AND estado = 'ACTIVA' 
     ORDER BY fecha_vencimiento DESC LIMIT 1`,
    [userId]
  );

  if (activeSub) {
    const subExpiresAt = new Date(activeSub.fecha_vencimiento);
    if (subExpiresAt > now) {
      return {
        allowed: true,
        status: 'SUSCRIPCIÓN ACTIVA',
        plan: activeSub.plan_nombre,
        expiresAt: activeSub.fecha_vencimiento,
        startsAt: activeSub.fecha_inicio,
        monto: activeSub.monto,
        message: 'Licencia estudiantil activa.'
      };
    } else {
      // La suscripción venció según la hora del servidor
      await db.run("UPDATE suscripciones SET estado = 'VENCIDA' WHERE id = ?", [activeSub.id]);
    }
  }

  // 2. Verificar Prueba DEMO para el Estudiante (Control estricto de 120 minutos en servidor)
  const demo = await db.get(
    `SELECT * FROM pruebas_demo WHERE usuario_id = ?`,
    [userId]
  );

  if (demo) {
    const expiresAt = new Date(demo.expira_en);
    const remainingMs = expiresAt.getTime() - now.getTime();

    if (remainingMs > 0 && demo.estado !== 'CANCELADO') {
      const remainingSeconds = Math.floor(remainingMs / 1000);
      const remainingMinutes = Math.floor(remainingSeconds / 60);

      return {
        allowed: true,
        status: 'DEMO ACTIVO',
        demoId: demo.id,
        durationMinutes: demo.duracion_minutos,
        startedAt: demo.iniciado_en,
        expiresAt: demo.expira_en,
        remainingMs,
        remainingSeconds,
        remainingMinutes,
        formattedRemaining: formatTimeRemaining(remainingSeconds),
        message: `Prueba DEMO activa: quedan ${Math.ceil(remainingMinutes)} minutos.`
      };
    } else {
      // El tiempo en el servidor ya se cumplió (superó los 120 minutos)
      if (demo.estado !== 'VENCIDO') {
        await db.run("UPDATE pruebas_demo SET estado = 'VENCIDO', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?", [demo.id]);
        await db.run("UPDATE usuarios SET estado = 'demo_vencido' WHERE id = ?", [userId]);
      }

      return {
        allowed: false,
        status: 'DEMO VENCIDO',
        demoId: demo.id,
        durationMinutes: demo.duracion_minutos,
        startedAt: demo.iniciado_en,
        expiresAt: demo.expira_en,
        remainingMs: 0,
        remainingSeconds: 0,
        formattedRemaining: '00:00:00',
        message: `Tu período de prueba gratuita (${demo.duracion_minutos || 120} minutos) ha finalizado.`,
        instructions: 'Para continuar en PUGLLAI INGA SIMIPI UIAIKUNA, solicita la activación de una licencia a tu Docente o Administrador.'
      };
    }
  }

  // Si no tiene ni suscripción ni demo
  return {
    allowed: false,
    status: 'SIN_SUSCRIPCION',
    message: 'No posee una licencia activa ni una prueba DEMO registrada.',
    instructions: 'Comuníquese con su docente para autorizar su acceso.'
  };
}

// Formateador de tiempo a HH:MM:SS
function formatTimeRemaining(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Middleware Express que bloquea el paso si el DEMO venció o no tiene suscripción
async function requireActiveAccess(req, res, next) {
  try {
    const access = await checkUserAccessStatus(req.user.id);
    req.accessStatus = access;

    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_RESTRICTED',
        status: access.status,
        message: access.message,
        instructions: access.instructions || 'Contacte a su docente o administrador.',
        expiresAt: access.expiresAt || null
      });
    }

    next();
  } catch (err) {
    console.error('Error validando acceso:', err);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Error validando estado de acceso.' });
  }
}

module.exports = {
  checkUserAccessStatus,
  formatTimeRemaining,
  requireActiveAccess
};
