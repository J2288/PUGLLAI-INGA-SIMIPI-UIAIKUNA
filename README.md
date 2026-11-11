# 🀄 PUGLLAI INGA SIMIPI UIAIKUNA
### Dominó Tradicional en Lengua Inga · Plataforma Educativa e Intercultural

Plataforma educativa y de preservación lingüística interactiva basada en el auténtico juego patrimonial de dominó tradicional de la comunidad **Inga** (Putumayo / Valle de Sibundoy, Colombia). Integra mecánicas tradicionales de dominó Doble-Seis, progresión pedagógica en 6 niveles curriculares, inteligencia artificial andina rival (**Sabio Kindi**), multijugador en tiempo real por código QR y Bluetooth Web BLE, y un sistema de gestión educativa con base de datos relacional SQLite y autenticación basada en roles (RBAC).

---

## 🌟 Características Principales

- **Baraja Patrimonial Auténtica (28 Fichas)**:
  - Fiel al dominó físico patrimonial con 7 conceptos maestros (valores 0 al 6: `ALKU`, `KILLA`, `SUGRATUKAMA`, `CHUNGA I SUGTA`, `NUKA KANI`, `MAMASIÑURA`, `ASUA`).
  - Proporción clásica de torneo 2:1 con perno de latón central, esquineros de valor (pips) y tipografía adaptativa anti-desborde.
  
- **6 Niveles Curriculares Progresivos (1 al 6)**:
  - **Nivel 1 (Shuk)**: Baraja Oficial Inga (Valores 0 al 6, 28 fichas).
  - **Nivel 2 (Ishkay)**: Fauna y Hogar Andino (`SANCHA`, `MISITU`, `ALKU`, `KINDI`, `WAWA`, `WASI`, `KILLA`).
  - **Nivel 3 (Kimsa)**: Naturaleza y Elementos Sagrados (`IAKU`, `INTI`, `SARA`, `NINA`, `WAYRA`, `ALLPA`, `ASUA`).
  - **Nivel 4 (Chusku)**: Territorio, Saludos y Respeto (`RUKU SACHA`, `SUGRATUKAMA`, `ALLI PUNCHA`, `ALLI CHISHI`, `ALLI TUTA`, `PUÑUY`, `ALKU`).
  - **Nivel 5 (Pichika)**: Números Andinos e Identidad (`NUKA KANI`, `SHUK`, `ISHKAY`, `KIMSA`, `CHUSKU`, `PICHIKA`, `SUKTA`).
  - **Nivel 6 (Sukta)**: Sabiduría, Cosmovisión y Buen Vivir (`MAMASIÑURA`, `TAITA`, `YACHACHIJ`, `YACHANA`, `SUMAJ KAWSAY`, `AYLLU`, `KINDI`).

- **Modalidades de Juego**:
  - 🧘 **Solitario / Práctica Libre**: Exploración sin presión para afianzar vocabulario.
  - 🐦 **Duelo vs Sabio Kindi**: Partidas contra IA andina autónoma que analiza extremos y juega con estrategia.
  - 📱 **Multijugador en Vivo (QR / Enlace)**: Conexión entre dispositivos (computador, tablet, celular) en la misma red local.
  - 📶 **Control Inalámbrico Bluetooth (Web BLE)**: Detección y vinculación directa con hardware de mesa o periféricos.

- **Portal Pedagógico Inga**:
  - Carrusel con rotación continua automática cada 4 segundos mostrando imágenes, fonética andina `[ahl-koo]`, pronunciación hablada (Web Speech API) y cápsulas de cosmovisión.
  - Sintonización automática con el vocabulario del nivel seleccionado.

- **Administración y Seguimiento Pedagógico**:
  - Control de accesos RBAC: **ADMINISTRADOR**, **DOCENTE** y **ESTUDIANTE**.
  - Auditoría de partidas en tiempo real en base de datos relacional SQLite (`database/bookforce.sqlite`).
  - Panel docente con métricas de partidas, precisión media y exportación de auditoría.

---

## 🔐 Credenciales de Acceso Rápido

| Rol | Correo Electrónico | Contraseña | Alcance y Funcionalidades |
|---|---|---|---|
| 👑 **ADMINISTRADOR** | `admin@bookforce.com` | `Admin123*` | Control total del sistema, gestión de licencias, usuarios y auditoría central. |
| 👩‍🏫 **DOCENTE** | `docente@bookforce.com` | `Docente123*` | Panel pedagógico, seguimiento del progreso estudiantil y métricas de juego. |
| 🎓 **ESTUDIANTE** | `demo@bookforce.com` | `Demo123*` | Modo demo de 120 minutos, mesa interactiva y niveles curriculares. |

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- [Node.js](https://nodejs.org/) v18 o superior instalado.
- Gestor de paquetes `npm`.

### Pasos de Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/J2288/PUGLLAI-INGA-SIMIPI-UIAIKUNA.git
   cd PUGLLAI-INGA-SIMIPI-UIAIKUNA
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar la aplicación**:
   ```bash
   npm start
   # o directamente:
   node server.js
   ```

4. **Abrir en el navegador**:
   - Acceso local: [http://localhost:3000](http://localhost:3000)
   - Acceso en red local (Wi-Fi para celulares y tablets): Se muestra automáticamente en la consola al iniciar el servidor (ej. `http://192.168.x.x:3000`).

---

## 📁 Estructura del Proyecto

```
PUGLLAI-INGA-SIMIPI-UIAIKUNA/
├── assets/                    # Recursos visuales, iconos y multimedia
├── css/
│   ├── styles.css             # Estilos de la mesa, fichas de dominó y niveles
│   └── bookforce.css          # Estilos del portal y panel administrativo
├── database/
│   ├── bookforce.sqlite       # Base de datos SQLite inicial sembrada
│   ├── db.js                  # Conexión, migraciones y modelos relacionales
│   └── schema.sql             # Esquema DDL de tablas e índices
├── js/
│   ├── app.js                 # Lógica interactiva del cliente, mesa y niveles
│   ├── bookforce.js           # Lógica del panel administrativo y autenticación
│   ├── game.js                # Reglas reglamentarias de dominó e IA Sabio Kindi
│   ├── vocabulary.js          # Vocabulario oficial Inga y los 6 niveles
│   ├── bluetooth.js           # Conectividad Web Bluetooth API
│   └── qrcode.min.js          # Librería cliente para generación de QR
├── index.html                 # Aplicación SPA completa
├── package.json               # Configuración y dependencias del proyecto
├── server.js                  # Servidor Express Full Stack y API REST
└── README.md                  # Documentación oficial del proyecto
```

---

## 📜 Licencia

Desarrollado bajo licencia **MIT** para fines educativos, culturales y de preservación comunitaria de la lengua Inga.
