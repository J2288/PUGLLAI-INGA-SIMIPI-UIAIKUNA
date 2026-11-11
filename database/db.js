const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'bookforce.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Conexión SQLite
const rawDb = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error fatal al conectar con SQLite BOOKFORCE:', err.message);
  } else {
    console.log('✅ Base de datos relacional SQLite BOOKFORCE conectada:', DB_PATH);
  }
});

// Envolver métodos en Promises para async/await y consultas preparadas (protección contra SQL Injection)
const db = {
  raw: rawDb,
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      rawDb.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};

/**
 * Inicialización de la Base de Datos: Esquema y Seeding Inicial
 * Roles: ADMINISTRADOR, DOCENTE, ESTUDIANTE
 */
async function initDatabase() {
  try {
    // 0. Migración segura de columnas si la base de datos ya existía
    try { await db.run("ALTER TABLE usuarios ADD COLUMN docente_id INTEGER"); } catch (_) {}
    try { await db.run("ALTER TABLE usuarios ADD COLUMN institucion VARCHAR(120)"); } catch (_) {}
    try { await db.run("ALTER TABLE usuarios ADD COLUMN grado_aula VARCHAR(50)"); } catch (_) {}

    // 1. Ejecutar esquema SQL
    if (fs.existsSync(SCHEMA_PATH)) {
      const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      await db.exec(schemaSql);
      console.log('✅ Tablas relacionales e índices verificados.');
    }

    // 2. Insertar o Actualizar Roles del Sistema: ADMINISTRADOR, DOCENTE, ESTUDIANTE
    const existingRoles = await db.all('SELECT * FROM roles');
    if (existingRoles.length === 0) {
      await db.run("INSERT INTO roles (id, nombre, descripcion) VALUES (1, 'ADMINISTRADOR', 'Control total y administración de la plataforma SaaS')");
      await db.run("INSERT INTO roles (id, nombre, descripcion) VALUES (2, 'DOCENTE', 'Gestión pedagógica de grupos de estudiantes, licencias y seguimiento')");
      await db.run("INSERT INTO roles (id, nombre, descripcion) VALUES (3, 'ESTUDIANTE', 'Estudiante con acceso por prueba DEMO de 120 min o Suscripción activa')");
      console.log('✅ Roles predeterminados creados: ADMINISTRADOR, DOCENTE, ESTUDIANTE.');
    } else {
      // Asegurar que los nombres de los roles 2 y 3 reflejen DOCENTE y ESTUDIANTE
      await db.run("UPDATE roles SET nombre = 'DOCENTE', descripcion = 'Gestión pedagógica de grupos de estudiantes, licencias y seguimiento' WHERE id = 2");
      await db.run("UPDATE roles SET nombre = 'ESTUDIANTE', descripcion = 'Estudiante con acceso por prueba DEMO de 120 min o Suscripción activa' WHERE id = 3");
    }

    // 3. Insertar Permisos Académicos y Administrativos
    const existingPerms = await db.all('SELECT COUNT(*) as count FROM permisos');
    if (existingPerms[0].count === 0) {
      const perms = [
        ['ADMIN_ALL', 'Acceso Total Administrador', 'Acceso irrestricto al sistema', 'ADMIN'],
        ['USERS_VIEW', 'Ver Estudiantes y Usuarios', 'Consultar listado general', 'USUARIOS'],
        ['USERS_MANAGE', 'Gestionar Usuarios', 'Crear, editar, bloquear y eliminar', 'USUARIOS'],
        ['DEMO_CONTROL', 'Control de Demos', 'Ampliar, renovar y cancelar pruebas de 120 min', 'DEMOS'],
        ['SUBS_MANAGE', 'Gestionar Suscripciones', 'Activar, renovar y suspender licencias', 'SUSCRIPCIONES'],
        ['DOCENTE_VIEW', 'Panel Docente', 'Ver panel pedagógico y grupo de estudiantes', 'DOCENTES'],
        ['DOCENTE_REGISTER_STUDENT', 'Registrar Estudiantes', 'Alta de estudiantes asignados', 'DOCENTES'],
        ['EXTERNAL_PANEL_SYNC', 'Sincronizar Panel Externo', 'Acceso a webhooks y validaciones externas', 'INTEGRACION']
      ];
      for (const p of perms) {
        await db.run('INSERT INTO permisos (codigo, nombre, descripcion, modulo) VALUES (?, ?, ?, ?)', p);
      }
      console.log('✅ Permisos de RBAC configurados.');
    }

    // 4. Crear Administrador Predeterminado si no existe
    const adminUser = await db.get('SELECT * FROM usuarios WHERE email = ?', ['admin@bookforce.com']);
    if (!adminUser) {
      const hashedAdminPassword = await bcrypt.hash('Admin123*', 10);
      await db.run(
        `INSERT INTO usuarios (nombre, email, password_hash, rol_id, estado, email_verificado)
         VALUES (?, ?, ?, 1, 'activo', 1)`,
        ['Director Administrador', 'admin@bookforce.com', hashedAdminPassword]
      );
      console.log('🔑 Administrador inicial creado: admin@bookforce.com / Admin123*');
    }

    // 5. Crear Docente Predeterminado (y actualizar compatibilidad de vendedor)
    let docenteUser = await db.get('SELECT * FROM usuarios WHERE email = ?', ['docente@bookforce.com']);
    if (!docenteUser) {
      const hashedDocentePassword = await bcrypt.hash('Docente123*', 10);
      const res = await db.run(
        `INSERT INTO usuarios (nombre, email, password_hash, rol_id, estado, email_verificado, empresa, institucion)
         VALUES (?, ?, ?, 2, 'activo', 1, 'Colegio Andino San Francisco', 'Colegio Andino')`,
        ['Prof. Carlos Mendoza', 'docente@bookforce.com', hashedDocentePassword]
      );
      docenteUser = { id: res.lastID };
    }

    // Asegurar registro en tabla docentes
    const docenteRecord = await db.get('SELECT id FROM docentes WHERE usuario_id = ?', [docenteUser.id]);
    if (!docenteRecord) {
      await db.run(
        `INSERT INTO docentes (usuario_id, codigo_docente, institucion, area_academica, total_estudiantes, comision_porcentaje, total_ventas)
         VALUES (?, 'DOC-001', 'Colegio Andino San Francisco', 'Lengua y Saberes Ancestrales', 18, 15.00, 1450.00)`,
        [docenteUser.id]
      );
      console.log('👩‍🏫 Docente académico creado: docente@bookforce.com / Docente123* (Código: DOC-001)');
    }

    // Retrocompatibilidad con vendedor@bookforce.com si existe
    await db.run("UPDATE usuarios SET rol_id = 2 WHERE email = 'vendedor@bookforce.com'");

    // 6. Crear Estudiante DEMO Activo (con 120 minutos reales autoritativos)
    const demoUser = await db.get('SELECT * FROM usuarios WHERE email = ?', ['demo@bookforce.com']);
    if (!demoUser) {
      const hashedDemoPassword = await bcrypt.hash('Demo123*', 10);
      const res = await db.run(
        `INSERT INTO usuarios (nombre, email, password_hash, rol_id, docente_id, estado, email_verificado)
         VALUES (?, ?, ?, 3, ?, 'activo', 1)`,
        ['Estudiante Demo (2 Horas)', 'demo@bookforce.com', hashedDemoPassword, docenteUser.id]
      );

      const ahora = new Date();
      const expiraEn = new Date(ahora.getTime() + 120 * 60 * 1000);

      await db.run(
        `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado, ip_registro)
         VALUES (?, ?, 120, ?, ?, 'ACTIVO', '127.0.0.1')`,
        [res.lastID, 'demo@bookforce.com', ahora.toISOString(), expiraEn.toISOString()]
      );
      console.log('🎓 Estudiante DEMO creado: demo@bookforce.com / Demo123* (120 min activos)');
    } else {
      // Asegurar que el rol sea ESTUDIANTE (3)
      await db.run("UPDATE usuarios SET rol_id = 3 WHERE email = 'demo@bookforce.com'");
    }

    // Crear también estudiante@bookforce.com como alias explícito
    const estudianteUser = await db.get('SELECT * FROM usuarios WHERE email = ?', ['estudiante@bookforce.com']);
    if (!estudianteUser) {
      const hashedEstPass = await bcrypt.hash('Estudiante123*', 10);
      const resEst = await db.run(
        `INSERT INTO usuarios (nombre, email, password_hash, rol_id, docente_id, estado, email_verificado, institucion)
         VALUES (?, ?, ?, 3, ?, 'activo', 1, 'Colegio Andino')`,
        ['Samy Estudiante Inga', 'estudiante@bookforce.com', hashedEstPass, docenteUser.id]
      );

      const ahora = new Date();
      const expiraEn = new Date(ahora.getTime() + 120 * 60 * 1000);
      await db.run(
        `INSERT INTO pruebas_demo (usuario_id, email, duracion_minutos, iniciado_en, expira_en, estado, ip_registro)
         VALUES (?, ?, 120, ?, ?, 'ACTIVO', '127.0.0.1')`,
        [resEst.lastID, 'estudiante@bookforce.com', ahora.toISOString(), expiraEn.toISOString()]
      );
      console.log('🎓 Estudiante adicional: estudiante@bookforce.com / Estudiante123*');
    }

    // 7. Configuraciones Iniciales
    const existingConfigs = await db.all('SELECT * FROM configuraciones');
    if (existingConfigs.length === 0) {
      await db.run("INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES ('DEMO_DURATION_MINUTES', '120', 'Duración exacta del período de prueba gratuita', 'number')");
      await db.run("INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES ('EXTERNAL_PANEL_ENABLED', 'true', 'Habilitar recepción de altas desde panel externo', 'boolean')");
      await db.run("INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES ('EXTERNAL_PANEL_API_KEY', 'bkforce_live_sec_8923fd9a2e', 'Clave de seguridad para autenticar llamadas de panel externo', 'string')");
      await db.run("INSERT INTO configuraciones (clave, valor, descripcion, tipo) VALUES ('SYSTEM_NAME', 'PUGLLAI INGA SIMIPI UIAIKUNA', 'Nombre corporativo de la plataforma', 'string')");
      console.log('⚙️ Configuraciones maestras inicializadas.');
    } else {
      await db.run("UPDATE configuraciones SET valor = 'PUGLLAI INGA SIMIPI UIAIKUNA' WHERE clave = 'SYSTEM_NAME' AND (valor LIKE '%BOOKFORCE%' OR valor = '')");
    }

    // 8. Tabla de Configuración General Específica (Nombre Oficial y Duración DEMO Dinámica)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS configuracion_general (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_name TEXT NOT NULL DEFAULT 'PUGLLAI INGA SIMIPI UIAIKUNA',
        default_demo_duration_minutes INTEGER NOT NULL DEFAULT 120,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        FOREIGN KEY (updated_by) REFERENCES usuarios(id)
      );
    `);

    const existingGenConfig = await db.get('SELECT * FROM configuracion_general ORDER BY id DESC LIMIT 1');
    if (!existingGenConfig) {
      await db.run(
        `INSERT INTO configuracion_general (platform_name, default_demo_duration_minutes, updated_at)
         VALUES ('PUGLLAI INGA SIMIPI UIAIKUNA', 120, CURRENT_TIMESTAMP)`
      );
      console.log('⚙️ Parámetros de operación guardados: PUGLLAI INGA SIMIPI UIAIKUNA (DEMO: 120m)');
    } else {
      if (existingGenConfig.platform_name.includes('BOOKFORCE')) {
        await db.run(
          `UPDATE configuracion_general SET platform_name = 'PUGLLAI INGA SIMIPI UIAIKUNA', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [existingGenConfig.id]
        );
      }
    }

    // 9. Inicialización y Seeding del Vocabulario Oficial Inga (28 Fichas de Dominó)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS vocabulario_inga (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo VARCHAR(40) NOT NULL UNIQUE,
        palabra_inga VARCHAR(60) NOT NULL,
        traduccion_es VARCHAR(100) NOT NULL,
        fonetica VARCHAR(80),
        valor_domino INTEGER NOT NULL,
        etiqueta_valor VARCHAR(30) NOT NULL,
        color_hex VARCHAR(20) NOT NULL,
        icono VARCHAR(20),
        categoria VARCHAR(50),
        nivel_dificultad INTEGER DEFAULT 1,
        nota_cultural TEXT,
        activo BOOLEAN DEFAULT 1,
        creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const vocabCount = await db.get('SELECT COUNT(*) as count FROM vocabulario_inga');
    if (vocabCount.count === 0) {
      try {
        const { INGA_DOMINO_CONCEPTS } = require('../js/vocabulary');
        for (const item of INGA_DOMINO_CONCEPTS) {
          await db.run(
            `INSERT INTO vocabulario_inga 
             (codigo, palabra_inga, traduccion_es, fonetica, valor_domino, etiqueta_valor, color_hex, icono, categoria, nivel_dificultad, nota_cultural)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.inga,
              item.es,
              item.phonetic,
              item.value,
              item.dotName,
              item.color,
              item.icon,
              item.category,
              item.level,
              item.funFact
            ]
          );
        }
        console.log('🃏 Baraja Oficial Inga (7 conceptos maestros / 28 fichas) sembrada en base de datos.');
      } catch (vocabErr) {
        console.warn('Advertencia sembrando vocabulario:', vocabErr.message);
      }
    }

    console.log('🚀 Base de datos PUGLLAI INGA SIMIPI UIAIKUNA actualizada con roles: ADMINISTRADOR, DOCENTE, ESTUDIANTE.');
  } catch (err) {
    console.error('❌ Error inicializando base de datos:', err);
  }
}

/**
 * Obtener la configuración actual del sistema
 */
async function getSystemConfig() {
  try {
    let config = await db.get('SELECT * FROM configuracion_general ORDER BY id DESC LIMIT 1');
    if (!config) {
      const nameRow = await db.get("SELECT valor FROM configuraciones WHERE clave = 'SYSTEM_NAME'");
      const demoRow = await db.get("SELECT valor FROM configuraciones WHERE clave = 'DEMO_DURATION_MINUTES'");
      config = {
        platform_name: nameRow ? nameRow.valor : 'PUGLLAI INGA SIMIPI UIAIKUNA',
        default_demo_duration_minutes: demoRow ? (parseInt(demoRow.valor) || 120) : 120
      };
    }
    return {
      platform_name: config.platform_name || 'PUGLLAI INGA SIMIPI UIAIKUNA',
      default_demo_duration_minutes: parseInt(config.default_demo_duration_minutes) || 120,
      updated_at: config.updated_at,
      updated_by: config.updated_by
    };
  } catch (_) {
    return {
      platform_name: 'PUGLLAI INGA SIMIPI UIAIKUNA',
      default_demo_duration_minutes: 120
    };
  }
}

module.exports = {
  db,
  initDatabase,
  getSystemConfig
};
