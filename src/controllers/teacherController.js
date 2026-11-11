const bcrypt = require('bcryptjs');
const { db, getSystemConfig } = require('../../database/db');
const { logAudit } = require('../middleware/auth');
const { formatTimeRemaining } = require('../middleware/demoEnforcer');

// OBTENER ESTUDIANTES Y MÉTRICAS PEDAGÓGICAS DEL DOCENTE
async function getTeacherDashboard(req, res) {
  try {
    const teacherUser = req.user;

    // Buscar perfil de docente
    let teacher = await db.get('SELECT * FROM docentes WHERE usuario_id = ?', [teacherUser.id]);
    if (!teacher) {
      // Si no existe, crear registro base de docente
      await db.run(
        `INSERT INTO docentes (usuario_id, codigo_docente, institucion, total_estudiantes, comision_porcentaje, total_ventas)
         VALUES (?, ?, ?, 0, 15.00, 0)`,
        [teacherUser.id, 'DOC-' + Math.floor(100 + Math.random() * 900), teacherUser.empresa || 'Institución Educativa']
      );
      teacher = await db.get('SELECT * FROM docentes WHERE usuario_id = ?', [teacherUser.id]);
    }

    // Listar estudiantes asignados a este docente
    const students = await db.all(
      `SELECT u.id, u.nombre, u.email, u.empresa, u.institucion, u.grado_aula, u.telefono, u.estado, u.creado_en, u.ultimo_login,
              d.id as demo_id, d.iniciado_en as demo_iniciado_en, d.expira_en as demo_expira_en, d.estado as demo_estado,
              s.id as sub_id, s.plan_nombre as sub_plan, s.estado as sub_estado, s.fecha_vencimiento as sub_vence, s.monto
       FROM usuarios u
       LEFT JOIN pruebas_demo d ON u.id = d.usuario_id
       LEFT JOIN suscripciones s ON u.id = s.usuario_id AND s.id = (
         SELECT id FROM suscripciones WHERE usuario_id = u.id ORDER BY fecha_vencimiento DESC LIMIT 1
       )
       WHERE u.docente_id = ? OR u.vendedor_id = ?
       ORDER BY u.id DESC`,
      [teacherUser.id, teacherUser.id]
    );

    const now = new Date();
    let activeDemosCount = 0;
    let expiredDemosCount = 0;
    let activeSubsCount = 0;
    let totalSalesMonto = 0;

    const formattedStudents = students.map(s => {
      let statusLabel = 'SIN ACCESO';
      let statusBadge = 'badge-secondary';
      let remainingText = 'N/A';

      if (s.estado === 'bloqueado') {
        statusLabel = 'BLOQUEADO';
        statusBadge = 'badge-danger';
      } else if (s.sub_id && s.sub_estado === 'ACTIVA' && new Date(s.sub_vence) > now) {
        statusLabel = `LICENCIA ACTIVA (${s.sub_plan})`;
        statusBadge = 'badge-success';
        remainingText = `Vence: ${new Date(s.sub_vence).toLocaleDateString()}`;
        activeSubsCount++;
        totalSalesMonto += parseFloat(s.monto || 0);
      } else if (s.demo_id) {
        const exp = new Date(s.demo_expira_en);
        const rem = exp.getTime() - now.getTime();
        if (rem > 0 && s.demo_estado !== 'CANCELADO') {
          statusLabel = 'DEMO ACTIVO (120 MIN)';
          statusBadge = 'badge-cyan';
          remainingText = formatTimeRemaining(Math.floor(rem / 1000));
          activeDemosCount++;
        } else {
          statusLabel = 'DEMO VENCIDO';
          statusBadge = 'badge-warning';
          remainingText = 'Tiempo agotado';
          expiredDemosCount++;
        }
      }

      return {
        id: s.id,
        nombre: s.nombre,
        email: s.email,
        institucion: s.institucion || s.empresa,
        gradoAula: s.grado_aula,
        telefono: s.telefono,
        estado: s.estado,
        creadoEn: s.creado_en,
        ultimoLogin: s.ultimo_login,
        statusLabel,
        statusBadge,
        remainingText,
        demoExpiraEn: s.demo_expira_en,
        subVence: s.sub_vence
      };
    });

    return res.status(200).json({
      success: true,
      docente: {
        id: teacher.id,
        codigoDocente: teacher.codigo_docente,
        institucion: teacher.institucion,
        areaAcademica: teacher.area_academica,
        totalEstudiantes: formattedStudents.length,
        activeDemos: activeDemosCount,
        expiredDemos: expiredDemosCount,
        activeSubs: activeSubsCount,
        totalVentas: totalSalesMonto.toFixed(2),
        comisionEstimada: (totalSalesMonto * (teacher.comision_porcentaje / 100)).toFixed(2)
      },
      // Compatibilidad con objeto vendedor anterior
      seller: {
        id: teacher.id,
        codigoVendedor: teacher.codigo_docente,
        totalClientes: formattedStudents.length,
        activeDemos: activeDemosCount,
        expiredDemos: expiredDemosCount,
        activeSubs: activeSubsCount,
        totalVentas: totalSalesMonto.toFixed(2),
        comisionEstimada: (totalSalesMonto * (teacher.comision_porcentaje / 100)).toFixed(2)
      },
      estudiantes: formattedStudents,
      clients: formattedStudents // Alias para retrocompatibilidad
    });
  } catch (err) {
    console.error('Error en teacher dashboard:', err);
    return res.status(500).json({ success: false, message: 'Error cargando panel del docente.' });
  }
}

// REGISTRAR NUEVO ESTUDIANTE POR PARTE DEL DOCENTE
async function registerStudentByTeacher(req, res) {
  try {
    const { nombre, email, password, institucion, gradoAula, telefono } = req.body;
    const teacherUserId = req.user.id;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nombre, email y contraseña requeridos.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.get('SELECT id FROM usuarios WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Este correo electrónico ya está registrado.' });
    }

    // Regla de DEMO
    const existingDemo = await db.get('SELECT id FROM pruebas_demo WHERE email = ?', [cleanEmail]);
    if (existingDemo) {
      return res.status(400).json({ success: false, message: 'Este correo ya agotó su prueba DEMO anteriormente.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await db.run(
      `INSERT INTO usuarios (nombre, email, password_hash, rol_id, docente_id, vendedor_id, institucion, empresa, grado_aula, telefono, estado, email_verificado)
       VALUES (?, ?, ?, 3, ?, ?, ?, ?, ?, ?, 'activo', 1)`,
      [nombre.trim(), cleanEmail, passwordHash, teacherUserId, teacherUserId, institucion || 'Colegio Andino', institucion || 'Colegio Andino', gradoAula || 'Aula General', telefono || null]
    );

    const newId = userRes.lastID;
    const config = await getSystemConfig();
    const demoDuration = config.default_demo_duration_minutes || 120;
    const ahora = new Date();
    const expiraEn = new Date(ahora.getTime() + demoDuration * 60 * 1000);

    await db.run(
      `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado, ip_registro)
       VALUES (?, ?, ?, ?, ?, 'ACTIVO', ?)`,
      [newId, cleanEmail, demoDuration, ahora.toISOString(), expiraEn.toISOString(), clientIp]
    );

    await db.run('UPDATE docentes SET total_estudiantes = total_estudiantes + 1 WHERE usuario_id = ?', [teacherUserId]);
    await logAudit(teacherUserId, req.user.email, 'REGISTRO_ESTUDIANTE_DOCENTE', 'DOCENTES', `Nuevo estudiante registrado por docente: ${cleanEmail} (DEMO ${demoDuration} min)`, clientIp);

    return res.status(201).json({
      success: true,
      message: `Estudiante ${nombre} registrado exitosamente con DEMO de ${demoDuration} minutos asignado a tu grupo.`,
      studentId: newId,
      clientId: newId // Alias retrocompatible
    });
  } catch (err) {
    console.error('Error registrando estudiante por docente:', err);
    return res.status(500).json({ success: false, message: 'Error registrando estudiante.' });
  }
}

module.exports = {
  getTeacherDashboard,
  registerStudentByTeacher,
  // Alias de compatibilidad
  getSellerDashboard: getTeacherDashboard,
  registerClientBySeller: registerStudentByTeacher
};
