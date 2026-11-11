-- ============================================================================
-- BOOKFORCE - Plataforma SaaS Premium & Gestión Académica
-- Esquema de Base de Datos Relacional Profesional
-- Compatible con PostgreSQL y SQLite (ANSI SQL Compliant)
-- Roles: ADMINISTRADOR, DOCENTE, ESTUDIANTE
-- ============================================================================

-- 1. Tabla de Roles del Sistema
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE, -- 'ADMINISTRADOR', 'DOCENTE', 'ESTUDIANTE'
    descripcion TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Permisos
CREATE TABLE IF NOT EXISTS permisos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(60) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    modulo VARCHAR(50) NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla Intermedia Roles - Permisos
CREATE TABLE IF NOT EXISTS roles_permisos (
    rol_id INTEGER NOT NULL,
    permiso_id INTEGER NOT NULL,
    PRIMARY KEY (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
);

-- 4. Tabla Central de Usuarios (Docentes, Estudiantes, Administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INTEGER NOT NULL DEFAULT 3, -- 1: ADMINISTRADOR, 2: DOCENTE, 3: ESTUDIANTE
    docente_id INTEGER, -- ID del Docente asignado al estudiante
    vendedor_id INTEGER, -- Compatibilidad retroactiva
    telefono VARCHAR(30),
    empresa VARCHAR(120), -- Institución / Escuela / Colegio
    institucion VARCHAR(120),
    grado_aula VARCHAR(50),
    avatar_url TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'activo', -- 'activo', 'inactivo', 'bloqueado', 'demo_vencido'
    email_verificado BOOLEAN DEFAULT 0,
    google_id VARCHAR(120),
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta DATETIME,
    ultimo_login DATETIME,
    ip_ultimo_login VARCHAR(45),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id),
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (vendedor_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 5. Tabla de Pruebas DEMO (Control Estricto de 120 minutos en Servidor)
CREATE TABLE IF NOT EXISTS pruebas_demo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    email VARCHAR(180) NOT NULL UNIQUE,
    duracion_minutos INTEGER NOT NULL DEFAULT 120,
    iniciado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_en DATETIME NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVO', -- 'ACTIVO', 'VENCIDO', 'EXTENDIDO', 'CANCELADO'
    ip_registro VARCHAR(45),
    veces_extendido INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 6. Tabla de Suscripciones y Licencias
CREATE TABLE IF NOT EXISTS suscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    plan_nombre VARCHAR(60) NOT NULL DEFAULT 'LICENCIA_PRO_MENSUAL', -- 'PLAN_ESTUDIANTE', 'LICENCIA_PRO_MENSUAL', 'CAMPUS_ANUAL', 'PERSONALIZADO'
    estado VARCHAR(30) NOT NULL DEFAULT 'ACTIVA', -- 'ACTIVA', 'VENCIDA', 'SUSPENDIDA', 'CANCELADA'
    monto DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    moneda VARCHAR(10) DEFAULT 'USD',
    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME NOT NULL,
    renovacion_automatica BOOLEAN DEFAULT 0,
    creado_por INTEGER,
    metodo_pago VARCHAR(50) DEFAULT 'PANEL_ADMIN',
    referencia_pago VARCHAR(120),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

-- 7. Historial de Suscripciones (Auditoría de cambios y renovaciones)
CREATE TABLE IF NOT EXISTS historial_suscripciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suscripcion_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    accion VARCHAR(50) NOT NULL, -- 'CREACION', 'RENOVACION', 'CAMBIO_PLAN', 'SUSPENSION', 'CANCELACION'
    duracion_dias INTEGER,
    fecha_anterior_vencimiento DATETIME,
    fecha_nueva_vencimiento DATETIME,
    detalles TEXT,
    realizado_por INTEGER,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (suscripcion_id) REFERENCES suscripciones(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (realizado_por) REFERENCES usuarios(id)
);

-- 8. Tabla de Docentes (Gestión académica de grupos de estudiantes)
CREATE TABLE IF NOT EXISTS docentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    codigo_docente VARCHAR(30) NOT NULL UNIQUE,
    institucion VARCHAR(140),
    area_academica VARCHAR(80) DEFAULT 'Pedagogía e Interculturalidad',
    total_estudiantes INTEGER DEFAULT 0,
    comision_porcentaje DECIMAL(5,2) DEFAULT 15.00,
    total_ventas DECIMAL(12,2) DEFAULT 0.00,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla retrocompatible de vendedores
CREATE TABLE IF NOT EXISTS vendedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL UNIQUE,
    codigo_vendedor VARCHAR(30) NOT NULL UNIQUE,
    comision_porcentaje DECIMAL(5,2) DEFAULT 15.00,
    total_ventas DECIMAL(12,2) DEFAULT 0.00,
    clientes_totales INTEGER DEFAULT 0,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 9. Historial de Accesos (Seguridad y Detección de Intrusiones)
CREATE TABLE IF NOT EXISTS historial_accesos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    email VARCHAR(180) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    exitoso BOOLEAN NOT NULL,
    motivo_fallo VARCHAR(120),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 10. Registro de Actividades Administrativas (Audit Logs de Ciberseguridad)
CREATE TABLE IF NOT EXISTS registro_actividades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    usuario_email VARCHAR(180),
    accion VARCHAR(80) NOT NULL,
    modulo VARCHAR(60) NOT NULL,
    detalles TEXT,
    ip_address VARCHAR(45),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 11. Correos Electrónicos Pre-Autorizados (Whitelist)
CREATE TABLE IF NOT EXISTS correos_autorizados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(180) NOT NULL UNIQUE,
    rol_asignado VARCHAR(30) DEFAULT 'ESTUDIANTE',
    autorizado_por INTEGER,
    notas TEXT,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autorizado_por) REFERENCES usuarios(id)
);

-- 12. Configuraciones Generales de la Plataforma
CREATE TABLE IF NOT EXISTS configuraciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave VARCHAR(80) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) DEFAULT 'string',
    actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12B. Parámetros de Operación Principales (Nombre Oficial y Duración DEMO Dinámica)
CREATE TABLE IF NOT EXISTS configuracion_general (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_name TEXT NOT NULL DEFAULT 'PUGLLAI INGA SIMIPI UIAIKUNA',
    default_demo_duration_minutes INTEGER NOT NULL DEFAULT 120,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES usuarios(id)
);

-- 13. Tabla de Vocabulario Oficial Inga y Fichas de Dominó (Baraja de 28 Fichas)
CREATE TABLE IF NOT EXISTS vocabulario_inga (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    palabra_inga VARCHAR(60) NOT NULL,
    traduccion_es VARCHAR(100) NOT NULL,
    fonetica VARCHAR(80),
    valor_domino INTEGER NOT NULL, -- 0 a 6
    etiqueta_valor VARCHAR(30) NOT NULL, -- 'Blanco', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis'
    color_hex VARCHAR(20) NOT NULL,
    icono VARCHAR(20),
    categoria VARCHAR(50),
    nivel_dificultad INTEGER DEFAULT 1,
    nota_cultural TEXT,
    activo BOOLEAN DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ÍNDICES PARA RENDIMIENTO ÓPTIMO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_docente ON usuarios(docente_id);
CREATE INDEX IF NOT EXISTS idx_pruebas_demo_email ON pruebas_demo(email);
CREATE INDEX IF NOT EXISTS idx_pruebas_demo_expira ON pruebas_demo(expira_en);
CREATE INDEX IF NOT EXISTS idx_suscripciones_usuario ON suscripciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX IF NOT EXISTS idx_historial_accesos_email ON historial_accesos(email);
CREATE INDEX IF NOT EXISTS idx_registro_actividades_modulo ON registro_actividades(modulo);
CREATE INDEX IF NOT EXISTS idx_vocabulario_codigo ON vocabulario_inga(codigo);
CREATE INDEX IF NOT EXISTS idx_vocabulario_valor ON vocabulario_inga(valor_domino);
