const bcrypt = require('bcryptjs');
const { db, getSystemConfig } = require('../../database/db');
const { logAudit } = require('../middleware/auth');
const { checkUserAccessStatus, formatTimeRemaining } = require('../middleware/demoEnforcer');

// OBTENER ESTADÍSTICAS DEL DASHBOARD ADMINISTRATIVO
async function getAdminStats(req, res) {
  try {
    const totalUsers = (await db.get('SELECT COUNT(*) as count FROM usuarios')).count;
    const activeUsers = (await db.get("SELECT COUNT(*) as count FROM usuarios WHERE estado = 'activo'")).count;
    const blockedUsers = (await db.get("SELECT COUNT(*) as count FROM usuarios WHERE estado = 'bloqueado'")).count;

    // Métricas de DEMO
    const activeDemos = (await db.get("SELECT COUNT(*) as count FROM pruebas_demo WHERE estado = 'ACTIVO' AND expira_en > datetime('now')")).count;
    const expiredDemos = (await db.get("SELECT COUNT(*) as count FROM pruebas_demo WHERE estado = 'VENCIDO' OR expira_en <= datetime('now')")).count;

    // Métricas de Suscripciones
    const activeSubs = (await db.get("SELECT COUNT(*) as count FROM suscripciones WHERE estado = 'ACTIVA' AND fecha_vencimiento > datetime('now')")).count;
    const expiredSubs = (await db.get("SELECT COUNT(*) as count FROM suscripciones WHERE estado = 'VENCIDA' OR fecha_vencimiento <= datetime('now')")).count;

    // Ingresos totales acumulados
    const revenueRow = await db.get("SELECT SUM(monto) as total FROM suscripciones WHERE estado = 'ACTIVA'");
    const totalRevenue = revenueRow ? (revenueRow.total || 0) : 0;

    // Total de Docentes
    const totalDocentes = (await db.get("SELECT COUNT(*) as count FROM usuarios WHERE rol_id = 2")).count;
    const totalSellers = totalDocentes;

    // Tendencia de registros de los últimos 7 días
    const dailyRegistrations = await db.all(
      `SELECT date(creado_en) as dia, COUNT(*) as cantidad
       FROM usuarios
       WHERE creado_en >= datetime('now', '-7 days')
       GROUP BY date(creado_en)
       ORDER BY dia ASC`
    );

    // Distribución de usuarios por rol
    const usersByRole = await db.all(
      `SELECT r.nombre as rol, COUNT(u.id) as cantidad
       FROM roles r
       LEFT JOIN usuarios u ON u.rol_id = r.id
       GROUP BY r.id, r.nombre`
    );

    // Suscripciones próximas a vencer (en los próximos 5 días)
    const expiringSoon = await db.all(
      `SELECT s.id, u.nombre, u.email, s.plan_nombre, s.fecha_vencimiento
       FROM suscripciones s
       JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.estado = 'ACTIVA' 
         AND s.fecha_vencimiento BETWEEN datetime('now') AND datetime('now', '+5 days')
       ORDER BY s.fecha_vencimiento ASC`
    );

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        activeDemos,
        expiredDemos,
        activeSubs,
        expiredSubs,
        blockedUsers,
        totalDocentes,
        totalSellers,
        totalRevenue: parseFloat(totalRevenue).toFixed(2),
        currency: 'USD'
      },
      charts: {
        dailyRegistrations,
        usersByRole
      },
      expiringSoon
    });
  } catch (err) {
    console.error('Error obteniendo stats admin:', err);
    return res.status(500).json({ success: false, message: 'Error consultando estadísticas del sistema.' });
  }
}

// LISTAR USUARIOS CON FILTROS, BÚSQUEDA Y ESTADO DE DEMO / SUSCRIPCIÓN
async function getUsers(req, res) {
  try {
    const { q, estado, rol, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT u.id, u.nombre, u.email, u.estado, u.rol_id, r.nombre as rol_nombre,
             u.empresa, u.telefono, u.creado_en, u.ultimo_login, u.ip_ultimo_login,
             d.id as demo_id, d.iniciado_en as demo_iniciado_en, d.expira_en as demo_expira_en, d.estado as demo_estado,
             s.id as sub_id, s.plan_nombre as sub_plan, s.estado as sub_estado, s.fecha_vencimiento as sub_vence
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      LEFT JOIN pruebas_demo d ON u.id = d.usuario_id
      LEFT JOIN suscripciones s ON u.id = s.usuario_id AND s.id = (
        SELECT id FROM suscripciones WHERE usuario_id = u.id ORDER BY fecha_vencimiento DESC LIMIT 1
      )
      WHERE 1=1
    `;

    const params = [];

    // Búsqueda en tiempo real por nombre o correo
    if (q) {
      query += ` AND (u.nombre LIKE ? OR u.email LIKE ? OR u.empresa LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    // Filtros por estado
    if (estado && estado !== 'todos') {
      if (estado === 'activos') {
        query += ` AND u.estado = 'activo'`;
      } else if (estado === 'demo') {
        query += ` AND d.estado = 'ACTIVO' AND d.expira_en > datetime('now')`;
      } else if (estado === 'vencidos') {
        query += ` AND (d.estado = 'VENCIDO' OR d.expira_en <= datetime('now') OR s.estado = 'VENCIDA')`;
      } else if (estado === 'bloqueados') {
        query += ` AND u.estado = 'bloqueado'`;
      }
    }

    // Filtro por rol
    if (rol && rol !== 'todos') {
      query += ` AND r.nombre = ?`;
      params.push(rol.toUpperCase());
    }

    query += ` ORDER BY u.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const rows = await db.all(query, params);

    // Calcular estado dinámico de cada usuario
    const now = new Date();
    const formattedUsers = rows.map(u => {
      let accessLabel = 'SIN ACCESO';
      let accessColor = 'badge-secondary';
      let remainingText = 'N/A';

      if (u.estado === 'bloqueado') {
        accessLabel = 'BLOQUEADO';
        accessColor = 'badge-danger';
      } else if (u.sub_id && u.sub_estado === 'ACTIVA' && new Date(u.sub_vence) > now) {
        accessLabel = `SUSCRIPCIÓN ACTIVA (${u.sub_plan})`;
        accessColor = 'badge-success';
        remainingText = `Vence: ${new Date(u.sub_vence).toLocaleDateString()}`;
      } else if (u.demo_id) {
        const demoExp = new Date(u.demo_expira_en);
        const remMs = demoExp.getTime() - now.getTime();
        if (remMs > 0 && u.demo_estado !== 'CANCELADO') {
          accessLabel = 'DEMO ACTIVO (120 MIN)';
          accessColor = 'badge-cyan';
          remainingText = formatTimeRemaining(Math.floor(remMs / 1000));
        } else {
          accessLabel = 'DEMO VENCIDO';
          accessColor = 'badge-warning';
          remainingText = 'Tiempo agotado';
        }
      }

      return {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol_nombre,
        rolId: u.rol_id,
        estado: u.estado,
        empresa: u.empresa,
        telefono: u.telefono,
        creadoEn: u.creado_en,
        ultimoLogin: u.ultimo_login,
        ipUltimoLogin: u.ip_ultimo_login,
        demo: u.demo_id ? {
          id: u.demo_id,
          iniciadoEn: u.demo_iniciado_en,
          expiraEn: u.demo_expira_en,
          estado: u.demo_estado
        } : null,
        suscripcion: u.sub_id ? {
          id: u.sub_id,
          plan: u.sub_plan,
          estado: u.sub_estado,
          vencimiento: u.sub_vence
        } : null,
        accessLabel,
        accessColor,
        remainingText
      };
    });

    return res.status(200).json({
      success: true,
      users: formattedUsers,
      totalCount: formattedUsers.length
    });
  } catch (err) {
    console.error('Error listando usuarios:', err);
    return res.status(500).json({ success: false, message: 'Error consultando usuarios.' });
  }
}

// REGISTRAR USUARIO MANUALMENTE POR EL ADMINISTRADOR
async function createUser(req, res) {
  try {
    const config = await getSystemConfig();
    const defaultDuration = config.default_demo_duration_minutes || 120;
    const { nombre, email, password, rolId = 3, empresa, telefono, estado = 'activo', tipoAcceso = 'demo', duracionDemoMin = defaultDuration, planSuscripcion = 'PRO_MENSUAL' } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, email y contraseña requeridos.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.get('SELECT id FROM usuarios WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await db.run(
      `INSERT INTO usuarios (nombre, email, password_hash, rol_id, empresa, telefono, estado, email_verificado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [nombre.trim(), cleanEmail, passwordHash, parseInt(rolId), empresa || null, telefono || null, estado]
    );

    const newUserId = userRes.lastID;
    const now = new Date();

    // Tipo de acceso configurado por el Administrador
    if (tipoAcceso === 'demo') {
      const demoMinutes = parseInt(duracionDemoMin) || defaultDuration;
      const expiraEn = new Date(now.getTime() + demoMinutes * 60 * 1000);
      await db.run(
        `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado, ip_registro)
         VALUES (?, ?, ?, ?, ?, 'ACTIVO', 'MANUAL_ADMIN')`,
        [newUserId, cleanEmail, demoMinutes, now.toISOString(), expiraEn.toISOString()]
      );
    } else if (tipoAcceso === 'suscripcion') {
      const subExpira = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días
      await db.run(
        `INSERT INTO suscripciones (usuario_id, plan_nombre, estado, monto, fecha_inicio, fecha_vencimiento, creado_por, metodo_pago)
         VALUES (?, ?, 'ACTIVA', 49.00, ?, ?, ?, 'MANUAL_ADMIN')`,
        [newUserId, planSuscripcion, now.toISOString(), subExpira.toISOString(), req.user.id]
      );
    }

    await logAudit(req.user.id, req.user.email, 'CREAR_USUARIO_MANUAL', 'ADMIN_USUARIOS', `Usuario creado manualmente: ${cleanEmail} (ID: ${newUserId})`, req.ip);

    return res.status(201).json({
      success: true,
      message: `Usuario ${cleanEmail} creado exitosamente.`,
      userId: newUserId
    });
  } catch (err) {
    console.error('Error creando usuario:', err);
    return res.status(500).json({ success: false, message: 'Error registrando usuario.' });
  }
}

// EDITAR USUARIO
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { nombre, email, rolId, estado, empresa, telefono, newPassword } = req.body;

    const user = await db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    let passwordHash = user.password_hash;
    if (newPassword && newPassword.trim().length >= 6) {
      passwordHash = await bcrypt.hash(newPassword.trim(), 10);
    }

    await db.run(
      `UPDATE usuarios 
       SET nombre = ?, email = ?, rol_id = ?, estado = ?, empresa = ?, telefono = ?, password_hash = ?, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nombre.trim(), email.trim().toLowerCase(), parseInt(rolId) || user.rol_id, estado || user.estado, empresa || null, telefono || null, passwordHash, id]
    );

    await logAudit(req.user.id, req.user.email, 'EDITAR_USUARIO', 'ADMIN_USUARIOS', `Usuario modificado: ID ${id} (${email})`, req.ip);

    return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error actualizando usuario.' });
  }
}

// ALTERNAR ESTADO (ACTIVAR / DESACTIVAR / BLOQUEAR / DESBLOQUEAR)
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'activo', 'bloqueado', 'inactivo'

    const user = await db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (user.rol_id === 1 && req.user.id !== user.id && estado === 'bloqueado') {
      return res.status(400).json({ success: false, message: 'No se puede bloquear la cuenta principal de administrador.' });
    }

    await db.run('UPDATE usuarios SET estado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?', [estado, id]);
    await logAudit(req.user.id, req.user.email, 'CAMBIO_ESTADO_USUARIO', 'ADMIN_USUARIOS', `Estado de usuario ID ${id} cambiado a: ${estado}`, req.ip);

    return res.status(200).json({
      success: true,
      message: `El usuario ahora tiene estado: ${estado.toUpperCase()}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error cambiando estado.' });
  }
}

// ELIMINAR USUARIO CON CONFIRMACIÓN
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const user = await db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    if (user.rol_id === 1 && user.email === 'admin@bookforce.com') {
      return res.status(403).json({ success: false, message: 'No es posible eliminar al Administrador principal del sistema.' });
    }

    // Limpieza referencial
    await db.run('DELETE FROM pruebas_demo WHERE usuario_id = ?', [id]);
    await db.run('DELETE FROM suscripciones WHERE usuario_id = ?', [id]);
    await db.run('DELETE FROM historial_accesos WHERE usuario_id = ?', [id]);
    await db.run('DELETE FROM usuarios WHERE id = ?', [id]);

    await logAudit(req.user.id, req.user.email, 'ELIMINAR_USUARIO', 'ADMIN_USUARIOS', `Usuario eliminado permanentemente: ID ${id} (${user.email})`, req.ip);

    return res.status(200).json({ success: true, message: `Usuario ${user.email} eliminado exitosamente.` });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    return res.status(500).json({ success: false, message: 'Error eliminando usuario.' });
  }
}

// CONTROL DE PRUEBAS DEMO: AMPLIAR, RENOVAR O CANCELAR
async function manageDemo(req, res) {
  try {
    const { id } = req.params; // usuario_id
    const { action, minutos = 120 } = req.body; // 'extend', 'renew', 'cancel'

    const user = await db.get('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    let demo = await db.get('SELECT * FROM pruebas_demo WHERE usuario_id = ?', [id]);
    const now = new Date();

    if (action === 'extend') {
      // Extiende los minutos sobre el vencimiento actual si aún es futuro, o desde ahora si ya venció
      const baseTime = demo && new Date(demo.expira_en) > now ? new Date(demo.expira_en) : now;
      const newExpire = new Date(baseTime.getTime() + parseInt(minutos) * 60 * 1000);

      if (demo) {
        await db.run(
          `UPDATE pruebas_demo 
           SET expira_en = ?, estado = 'ACTIVO', veces_extendido = veces_extendido + 1, actualizado_en = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [newExpire.toISOString(), demo.id]
        );
      } else {
        await db.run(
          `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado)
           VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
          [user.id, user.email, parseInt(minutos), now.toISOString(), newExpire.toISOString()]
        );
      }

      await db.run("UPDATE usuarios SET estado = 'activo' WHERE id = ?", [user.id]);
      await logAudit(req.user.id, req.user.email, 'AMPLIAR_DEMO', 'DEMO_CONTROL', `DEMO de ${user.email} ampliado por ${minutos} minutos.`, req.ip);

      return res.status(200).json({
        success: true,
        message: `Prueba DEMO ampliada con éxito (+${minutos} minutos).`,
        newExpire: newExpire.toISOString()
      });
    } else if (action === 'renew') {
      // Reinicia el contador completo con la duración configurada o especificada
      const config = await getSystemConfig();
      const renewMinutes = parseInt(minutos) || config.default_demo_duration_minutes || 120;
      const newExpire = new Date(now.getTime() + renewMinutes * 60 * 1000);
      if (demo) {
        await db.run(
          `UPDATE pruebas_demo 
           SET iniciado_en = ?, expira_en = ?, duracion_minutos = ?, estado = 'ACTIVO', actualizado_en = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [now.toISOString(), newExpire.toISOString(), renewMinutes, demo.id]
        );
      } else {
        await db.run(
          `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado)
           VALUES (?, ?, ?, ?, ?, 'ACTIVO')`,
          [user.id, user.email, renewMinutes, now.toISOString(), newExpire.toISOString()]
        );
      }

      await db.run("UPDATE usuarios SET estado = 'activo' WHERE id = ?", [user.id]);
      await logAudit(req.user.id, req.user.email, 'RENOVAR_DEMO', 'DEMO_CONTROL', `DEMO de ${user.email} renovado a ${renewMinutes} minutos.`, req.ip);

      return res.status(200).json({
        success: true,
        message: `Prueba DEMO renovada por ${renewMinutes} minutos.`,
        newExpire: newExpire.toISOString()
      });
    } else if (action === 'cancel') {
      if (demo) {
        await db.run("UPDATE pruebas_demo SET estado = 'CANCELADO', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?", [demo.id]);
      }
      await db.run("UPDATE usuarios SET estado = 'demo_vencido' WHERE id = ?", [user.id]);
      await logAudit(req.user.id, req.user.email, 'CANCELAR_DEMO', 'DEMO_CONTROL', `DEMO de ${user.email} cancelado manualmente.`, req.ip);

      return res.status(200).json({ success: true, message: 'Prueba DEMO cancelada.' });
    }

    return res.status(400).json({ success: false, message: 'Acción no válida.' });
  } catch (err) {
    console.error('Error gestionando DEMO:', err);
    return res.status(500).json({ success: false, message: 'Error gestionando prueba DEMO.' });
  }
}

// GESTIÓN DE SUSCRIPCIONES (CREAR, RENOVAR, SUSPENDER)
async function manageSubscription(req, res) {
  try {
    const { usuarioId, planNombre = 'PRO_MENSUAL', duracionMeses = 1, monto = 49.00, accion = 'CREAR' } = req.body;

    const user = await db.get('SELECT * FROM usuarios WHERE id = ?', [usuarioId]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const now = new Date();
    const subExpire = new Date(now.getTime() + parseInt(duracionMeses) * 30 * 24 * 60 * 60 * 1000);

    const subRes = await db.run(
      `INSERT INTO suscripciones (usuario_id, plan_nombre, estado, monto, fecha_inicio, fecha_vencimiento, creado_por, metodo_pago)
       VALUES (?, ?, 'ACTIVA', ?, ?, ?, ?, 'PANEL_ADMINISTRATIVO')`,
      [usuarioId, planNombre, parseFloat(monto), now.toISOString(), subExpire.toISOString(), req.user.id]
    );

    // Registrar en historial de suscripciones
    await db.run(
      `INSERT INTO historial_suscripciones (suscripcion_id, usuario_id, accion, duracion_dias, fecha_nueva_vencimiento, detalles, realizado_por)
       VALUES (?, ?, 'ACTIVACION', ?, ?, 'Suscripción asignada desde panel de administración', ?)`,
      [subRes.lastID, usuarioId, parseInt(duracionMeses) * 30, subExpire.toISOString(), req.user.id]
    );

    await db.run("UPDATE usuarios SET estado = 'activo' WHERE id = ?", [usuarioId]);
    await logAudit(req.user.id, req.user.email, 'ASIGNAR_SUSCRIPCION', 'SUSCRIPCIONES', `Plan ${planNombre} asignado a ${user.email} hasta ${subExpire.toLocaleDateString()}`, req.ip);

    return res.status(201).json({
      success: true,
      message: `Suscripción ${planNombre} activada exitosamente hasta el ${subExpire.toLocaleDateString()}`,
      subscriptionId: subRes.lastID
    });
  } catch (err) {
    console.error('Error creando suscripción:', err);
    return res.status(500).json({ success: false, message: 'Error procesando suscripción.' });
  }
}

// LISTAR SUSCRIPCIONES
async function listSubscriptions(req, res) {
  try {
    const subs = await db.all(
      `SELECT s.*, u.nombre as usuario_nombre, u.email as usuario_email, u.empresa
       FROM suscripciones s
       JOIN usuarios u ON s.usuario_id = u.id
       ORDER BY s.id DESC`
    );
    return res.status(200).json({ success: true, subscriptions: subs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error listando suscripciones.' });
  }
}

// CORREOS AUTORIZADOS (WHITELIST)
async function getAuthorizedEmails(req, res) {
  try {
    const list = await db.all('SELECT * FROM correos_autorizados ORDER BY id DESC');
    return res.status(200).json({ success: true, emails: list });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error listando correos autorizados.' });
  }
}

async function addAuthorizedEmail(req, res) {
  try {
    const { email, rolAsignado = 'CLIENTE', notas } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Correo obligatorio.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    await db.run(
      `INSERT INTO correos_autorizados (email, rol_asignado, autorizado_por, notas)
       VALUES (?, ?, ?, ?)`,
      [cleanEmail, rolAsignado, req.user.id, notas || 'Pre-autorizado por admin']
    );

    await logAudit(req.user.id, req.user.email, 'AUTORIZAR_CORREO', 'SEGURIDAD', `Correo pre-autorizado: ${cleanEmail}`, req.ip);

    return res.status(201).json({ success: true, message: `Correo ${cleanEmail} agregado a la lista de autorización.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error o correo ya registrado en autorizaciones.' });
  }
}

// AUDITORÍA Y LOGS DE ACTIVIDAD
async function getAuditLogs(req, res) {
  try {
    const logs = await db.all(
      `SELECT * FROM registro_actividades ORDER BY id DESC LIMIT 150`
    );
    return res.status(200).json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error consultando auditoría.' });
  }
}

// CONFIGURACIONES DEL SISTEMA
async function getSettings(req, res) {
  try {
    const general = await getSystemConfig();
    const configs = await db.all('SELECT * FROM configuraciones');
    return res.status(200).json({
      success: true,
      general,
      platform_name: general.platform_name,
      default_demo_duration_minutes: general.default_demo_duration_minutes,
      settings: configs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error consultando configuración.' });
  }
}

async function updateSetting(req, res) {
  try {
    const { platform_name, default_demo_duration_minutes, clave, valor } = req.body;

    // Caso 1: Parámetros de Operación (Nombre Oficial y Duración DEMO Dinámica)
    if (platform_name !== undefined || default_demo_duration_minutes !== undefined) {
      const current = await getSystemConfig();
      const newName = (platform_name !== undefined && String(platform_name).trim().length > 0)
        ? String(platform_name).trim()
        : current.platform_name;

      let newMinutes = current.default_demo_duration_minutes;
      if (default_demo_duration_minutes !== undefined) {
        const parsed = parseInt(default_demo_duration_minutes, 10);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({
            success: false,
            message: 'La duración predeterminada del DEMO debe ser un número entero positivo mayor a cero.'
          });
        }
        newMinutes = parsed;
      }

      // Guardar en tabla configuracion_general
      const existing = await db.get('SELECT id FROM configuracion_general ORDER BY id DESC LIMIT 1');
      if (existing) {
        await db.run(
          `UPDATE configuracion_general 
           SET platform_name = ?, default_demo_duration_minutes = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
           WHERE id = ?`,
          [newName, newMinutes, req.user ? req.user.id : null, existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO configuracion_general (platform_name, default_demo_duration_minutes, updated_at, updated_by)
           VALUES (?, ?, CURRENT_TIMESTAMP, ?)`,
          [newName, newMinutes, req.user ? req.user.id : null]
        );
      }

      // Sincronizar en tabla configuraciones
      await db.run("UPDATE configuraciones SET valor = ?, actualizado_en = CURRENT_TIMESTAMP WHERE clave = 'SYSTEM_NAME'", [newName]);
      await db.run("UPDATE configuraciones SET valor = ?, actualizado_en = CURRENT_TIMESTAMP WHERE clave = 'DEMO_DURATION_MINUTES'", [String(newMinutes)]);

      // Registrar en auditoría
      if (req.user) {
        await logAudit(
          req.user.id,
          req.user.email,
          'ACTUALIZAR_CONFIG_GENERAL',
          'SISTEMA',
          `Parámetros actualizados: Nombre="${newName}", Duración DEMO=${newMinutes} min`,
          req.ip
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Configuración guardada correctamente.',
        nameUpdated: true,
        demoUpdated: true,
        platform_name: newName,
        default_demo_duration_minutes: newMinutes
      });
    }

    // Caso 2: Actualización de clave-valor individual
    if (clave && valor !== undefined) {
      await db.run('UPDATE configuraciones SET valor = ?, actualizado_en = CURRENT_TIMESTAMP WHERE clave = ?', [valor, clave]);
      if (clave === 'SYSTEM_NAME') {
        await db.run("UPDATE configuracion_general SET platform_name = ?, updated_at = CURRENT_TIMESTAMP", [valor]);
      } else if (clave === 'DEMO_DURATION_MINUTES') {
        await db.run("UPDATE configuracion_general SET default_demo_duration_minutes = ?, updated_at = CURRENT_TIMESTAMP", [parseInt(valor) || 120]);
      }
      if (req.user) {
        await logAudit(req.user.id, req.user.email, 'ACTUALIZAR_CONFIG', 'SISTEMA', `Configuración ${clave} actualizada a: ${valor}`, req.ip);
      }
      return res.status(200).json({ success: true, message: 'Configuración actualizada.' });
    }

    return res.status(400).json({ success: false, message: 'Parámetros insuficientes para actualizar.' });
  } catch (err) {
    console.error('Error actualizando configuración:', err);
    return res.status(500).json({ success: false, message: 'Error al guardar la configuración.' });
  }
}

module.exports = {
  getAdminStats,
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  manageDemo,
  manageSubscription,
  listSubscriptions,
  getAuthorizedEmails,
  addAuthorizedEmail,
  getAuditLogs,
  getSettings,
  updateSetting
};
