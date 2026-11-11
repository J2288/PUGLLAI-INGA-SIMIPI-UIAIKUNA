/**
 * BOOKFORCE - PLATAFORMA SAAS PREMIUM
 * Servidor Backend Profesional con Node.js & Express
 * Autenticación RBAC, Control Autoritativo DEMO 120 min, Gestión de Suscripciones y API REST
 */

const express = require('express');
const path = require('path');
const os = require('os');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('./database/db');
const apiRoutes = require('./src/routes/api');

let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (_) {}

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

// Memoria volátil para soporte retrocompatible de partidas y salas Bluetooth
let recordedMatches = [];
let bluetoothRooms = {};

// Obtener IPs de red local (IPv4)
function getLocalNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, address: iface.address });
      }
    }
  }
  return addresses;
}

// Configuración de Seguridad y Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Permite cargar scripts y CDNs locales de forma fluida
  crossOriginEmbedderPolicy: false
}));

// CORS permisivo completo para localhost, IPs LAN y accesos locales file:///
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-External-Panel-Key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// 1. RUTAS DE LA API SAAS PREMIUM (BOOKFORCE)
// ============================================================================
app.use('/api', apiRoutes);

// ============================================================================
// 2. RUTAS RETROCOMPATIBLES Y UTILIDADES DEL SISTEMA (QR, RED, BLUETOOTH)
// ============================================================================

// Generador oficial de Códigos QR
app.get('/api/qr', (req, res) => {
  const textToEncode = req.query.text || 'http://192.168.1.13:3000';
  if (QRCode && QRCode.toDataURL) {
    QRCode.toDataURL(textToEncode, {
      width: 240,
      margin: 2,
      color: { dark: '#0A192F', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    }, (err, url) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ status: 'ok', dataUrl: url });
    });
  } else {
    res.status(501).json({ error: 'Módulo QR no disponible' });
  }
});

// Información de red local e IP
app.get('/api/network-info', (req, res) => {
  const ips = getLocalNetworkIPs();
  const wifiIp = ips.find(i => i.interface.toLowerCase().includes('wi-fi') || i.interface.toLowerCase().includes('inalámbrica') || i.interface.toLowerCase().includes('wlan'));
  const chosen = wifiIp || ips[0] || { address: '192.168.1.13' };
  res.json({
    ip: chosen.address,
    port: PORT,
    url: `http://${chosen.address}:${PORT}`,
    all: ips
  });
});

// Registro y consulta de partidas
app.get('/api/matches', (req, res) => {
  res.json({ matches: recordedMatches, count: recordedMatches.length });
});

app.post('/api/matches', (req, res) => {
  try {
    const matchData = req.body;
    matchData.serverReceivedAt = new Date().toISOString();
    recordedMatches.unshift(matchData);
    res.status(201).json({ status: 'ok', message: 'Partida guardada', match: matchData });
  } catch (e) {
    res.status(400).json({ status: 'error', message: 'Datos inválidos' });
  }
});

// Niveles curriculares oficiales (1 al 6) y vocabulario patrimonial
app.get('/api/levels', (req, res) => {
  const { LEVELS } = require('./js/vocabulary');
  res.json({ success: true, count: LEVELS.length, levels: LEVELS });
});

app.get('/api/vocabulary', (req, res) => {
  const { VOCABULARY, INGA_DOMINO_CONCEPTS } = require('./js/vocabulary');
  res.json({ success: true, officialSet: INGA_DOMINO_CONCEPTS, count: VOCABULARY.length, vocabulary: VOCABULARY });
});

// Salas de interconexión inalámbrica / Bluetooth local
app.get('/api/bluetooth/rooms', (req, res) => {
  const activeRooms = Object.values(bluetoothRooms).map(r => ({
    id: r.id,
    hostName: r.hostName,
    createdAt: r.createdAt,
    isFull: !!r.guestName
  }));
  res.json({ rooms: activeRooms });
});

app.post('/api/bluetooth/rooms', (req, res) => {
  try {
    const { action, playerName, roomId } = req.body;
    if (action === 'create') {
      const newRoomId = 'BT-' + Math.floor(1000 + Math.random() * 9000);
      bluetoothRooms[newRoomId] = {
        id: newRoomId,
        hostName: playerName || 'Jugador 1',
        guestName: null,
        createdAt: new Date().toISOString(),
        lastMove: null,
        lastMoveBy: null,
        lastMoveVersion: 0
      };
      return res.status(201).json({ status: 'ok', roomId: newRoomId, role: 'host' });
    } else if (action === 'join') {
      const targetRoom = bluetoothRooms[roomId];
      if (!targetRoom) {
        return res.status(404).json({ status: 'error', message: 'Mesa Bluetooth no encontrada.' });
      }
      targetRoom.guestName = playerName || 'Jugador 2';
      return res.json({ status: 'ok', roomId, role: 'guest', hostName: targetRoom.hostName });
    }
    return res.status(400).json({ status: 'error', message: 'Acción no válida' });
  } catch (e) {
    res.status(400).json({ status: 'error', message: 'Solicitud inválida' });
  }
});

app.get('/api/bluetooth/rooms/:id/state', (req, res) => {
  const room = bluetoothRooms[req.params.id];
  if (!room) return res.status(404).json({ status: 'error', message: 'Sala no encontrada' });
  res.json({
    status: 'ok',
    roomId: room.id,
    hostName: room.hostName,
    guestName: room.guestName,
    connected: !!room.guestName,
    lastMove: room.lastMove,
    lastMoveBy: room.lastMoveBy,
    lastMoveVersion: room.lastMoveVersion
  });
});

app.post('/api/bluetooth/rooms/:id/move', (req, res) => {
  const room = bluetoothRooms[req.params.id];
  if (!room) return res.status(404).json({ status: 'error', message: 'Sala no encontrada' });
  const { role, move } = req.body;
  room.lastMove = move;
  room.lastMoveBy = role;
  room.lastMoveVersion++;
  res.json({ status: 'ok', version: room.lastMoveVersion });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'active',
    system: 'PUGLLAI INGA SIMIPI UIAIKUNA',
    version: '2.0.0-PRO',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 3. ARCHIVOS ESTÁTICOS Y ENRUTAMIENTO SPA
// ============================================================================
app.use(express.static(BASE_DIR));

// Fallback SPA
app.use((req, res) => {
  res.sendFile(path.join(BASE_DIR, 'index.html'));
});

// Inicializar Servidor e Infraestructura de Datos
async function startServer() {
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalNetworkIPs();
    console.log('\n======================================================');
    console.log('   🚀 PUGLLAI INGA SIMIPI UIAIKUNA - PLATAFORMA SAAS ACTIVA     ');
    console.log('======================================================');
    console.log(`\n  Acceso Principal (Localhost):`);
    console.log(`  👉 http://localhost:${PORT}`);
    console.log(`  👉 http://127.0.0.1:${PORT}`);

    if (ips.length > 0) {
      console.log(`\n  Red Local (Tablets, Celulares y Remoto):`);
      ips.forEach(item => {
        console.log(`  👉 http://${item.address}:${PORT}  (${item.interface})`);
      });
    }

    console.log('\n  Credenciales de Acceso Rápido:');
    console.log('  👑 Administrador: admin@bookforce.com  / Admin123*');
    console.log('  👩‍🏫 Docente:      docente@bookforce.com / Docente123*');
    console.log('  🎓 Estudiante:    demo@bookforce.com    / Demo123* (DEMO Configurable)');
    console.log('======================================================\n');
  });
}

startServer();
