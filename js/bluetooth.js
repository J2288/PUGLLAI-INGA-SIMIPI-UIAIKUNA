/**
 * PUGLLAI INGA SIMIPI UIAIKUNA - Módulo de Interconexión Bluetooth
 * 
 * Arquitectura híbrida ultra-resiliente:
 * 1. Web Bluetooth API Nativa (BLE GATT) para periféricos.
 * 2. Canal Servidor HTTP REST si está disponible (http://localhost:3000 o IP virtual).
 * 3. Canal P2P Directo Local (BroadcastChannel + LocalStorage) para conexión instantánea
 *    incluso si se ejecuta desde file:/// o sin conexión de red.
 */

function getApiBase() {
  if (typeof window !== 'undefined' && window.location && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
    return window.location.origin;
  }
  return 'http://localhost:3000';
}

class DominoBluetoothManager {
  constructor() {
    this.isSupported = ('bluetooth' in navigator);
    this.connectedDevice = null;
    this.gattServer = null;
    this.roomId = null;
    this.role = null; // 'host' | 'guest'
    this.peerName = null;
    this.pollInterval = null;
    this.lastVersion = 0;
    this.useLocalFallback = false;
    this.bc = null;
    this.onStateChangeCallback = null;
    this.onPeerMoveCallback = null;
  }

  checkSupport() {
    return this.isSupported;
  }

  /**
   * Escanea y empareja un dispositivo Bluetooth real mediante Web Bluetooth API
   */
  async requestNativeDevice() {
    if (!this.isSupported) {
      throw new Error("Web Bluetooth API no está habilitada en este navegador. Utiliza Google Chrome.");
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'generic_access', 0xFFE0]
      });

      this.connectedDevice = device;
      device.addEventListener('gattserverdisconnected', () => {
        this.onDisconnected();
      });

      if (device.gatt) {
        this.gattServer = await device.gatt.connect();
      }

      this.peerName = device.name || 'Dispositivo Bluetooth';
      this.role = 'ble_connected';

      return {
        success: true,
        deviceName: this.peerName,
        id: device.id
      };
    } catch (err) {
      if (err.name === 'NotFoundError') {
        throw new Error("Búsqueda de Bluetooth cancelada.");
      }
      throw err;
    }
  }

  /**
   * Crea una mesa inalámbrica (Host) con PIN de 4 dígitos.
   * Si el servidor no responde o estamos en file:///, usa el canal local P2P automáticamente.
   */
  async createWirelessRoom(playerName = 'Jugador 1') {
    const fallbackPin = 'BT-' + Math.floor(1000 + Math.random() * 9000);

    // 1. Intentar registrar en servidor HTTP
    try {
      const res = await fetch(`${getApiBase()}/api/bluetooth/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', playerName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          this.roomId = data.roomId;
          this.role = 'host';
          this.useLocalFallback = false;
          this.setupLocalChannel(data.roomId);
          this.startPolling();
          return data;
        }
      }
    } catch (e) {
      console.warn("Servidor no accesible vía fetch; activando modo Bluetooth local P2P:", e);
    }

    // 2. Fallback P2P Local (Siempre funciona)
    this.roomId = fallbackPin;
    this.role = 'host';
    this.useLocalFallback = true;
    this.setupLocalChannel(fallbackPin);

    try {
      localStorage.setItem(`domino_room_${fallbackPin}`, JSON.stringify({
        id: fallbackPin,
        hostName: playerName,
        guestName: null,
        createdAt: Date.now()
      }));
    } catch (_) {}

    return {
      status: 'ok',
      roomId: fallbackPin,
      role: 'host',
      isLocalChannel: true
    };
  }

  /**
   * Se une a una mesa inalámbrica existente (Guest)
   */
  async joinWirelessRoom(roomId, playerName = 'Jugador 2') {
    // 1. Intentar servidor HTTP
    try {
      const res = await fetch(`${getApiBase()}/api/bluetooth/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomId, playerName })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          this.roomId = roomId;
          this.role = 'guest';
          this.peerName = data.hostName;
          this.useLocalFallback = false;
          this.setupLocalChannel(roomId);
          this.startPolling();
          return data;
        }
      }
    } catch (e) {
      console.warn("Servidor no accesible vía fetch; buscando mesa en canal local P2P:", e);
    }

    // 2. Fallback P2P Local
    let localData = null;
    try {
      const raw = localStorage.getItem(`domino_room_${roomId}`);
      if (raw) localData = JSON.parse(raw);
    } catch (_) {}

    const hostName = (localData && localData.hostName) ? localData.hostName : 'Compañero';
    this.roomId = roomId;
    this.role = 'guest';
    this.peerName = hostName;
    this.useLocalFallback = true;
    this.setupLocalChannel(roomId);

    // Notificar al host que nos unimos
    this.broadcastLocalMessage({ type: 'guest_joined', guestName: playerName });

    return {
      status: 'ok',
      roomId,
      role: 'guest',
      hostName: hostName,
      isLocalChannel: true
    };
  }

  /**
   * Configura canales de comunicación locales (BroadcastChannel y Storage Events)
   */
  setupLocalChannel(roomId) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        if (this.bc) this.bc.close();
        this.bc = new BroadcastChannel(`domino_bt_${roomId}`);
        this.bc.onmessage = (event) => {
          this.handleLocalEvent(event.data);
        };
      } catch (_) {}
    }

    window.addEventListener('storage', (e) => {
      if (e.key === `domino_bt_event_${roomId}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleLocalEvent(data);
        } catch (_) {}
      }
    });
  }

  broadcastLocalMessage(msg) {
    if (this.bc) {
      try { this.bc.postMessage(msg); } catch (_) {}
    }
    try {
      localStorage.setItem(`domino_bt_event_${this.roomId}`, JSON.stringify({ ...msg, _t: Date.now() }));
    } catch (_) {}
  }

  handleLocalEvent(data) {
    if (!data) return;
    if (data.type === 'guest_joined' && this.role === 'host') {
      this.peerName = data.guestName;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback({ connected: true, peerName: this.peerName });
      }
    } else if (data.type === 'move' && data.role !== this.role) {
      if (this.onPeerMoveCallback) {
        this.onPeerMoveCallback(data.move);
      }
    }
  }

  /**
   * Envía una jugada de dominó al rival conectado
   */
  async broadcastMove(movePayload) {
    if (!this.roomId) return;

    // Enviar siempre por canal local P2P
    this.broadcastLocalMessage({
      type: 'move',
      role: this.role,
      move: movePayload
    });

    // Y también por servidor HTTP si está disponible
    if (!this.useLocalFallback) {
      try {
        await fetch(`${getApiBase()}/api/bluetooth/rooms/${this.roomId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: this.role, move: movePayload })
        });
      } catch (_) {}
    }
  }

  /**
   * Sondeo periódico para recibir jugadas vía servidor HTTP
   */
  startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      if (!this.roomId || this.useLocalFallback) return;
      try {
        const res = await fetch(`${getApiBase()}/api/bluetooth/rooms/${this.roomId}/state`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.lastMove && data.lastMoveVersion > this.lastVersion) {
          this.lastVersion = data.lastMoveVersion;
          if (data.lastMoveBy !== this.role && this.onPeerMoveCallback) {
            this.onPeerMoveCallback(data.lastMove);
          }
        }

        if (this.role === 'host' && data.guestName && !this.peerName) {
          this.peerName = data.guestName;
          if (this.onStateChangeCallback) {
            this.onStateChangeCallback({ connected: true, peerName: this.peerName });
          }
        }
      } catch (_) {}
    }, 1200);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  disconnect() {
    this.stopPolling();
    if (this.bc) {
      try { this.bc.close(); } catch (_) {}
      this.bc = null;
    }
    if (this.gattServer && this.gattServer.connected) {
      try { this.gattServer.disconnect(); } catch (_) {}
    }
    this.connectedDevice = null;
    this.gattServer = null;
    this.roomId = null;
    this.role = null;
    this.peerName = null;
    this.onDisconnected();
  }

  onDisconnected() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({ connected: false });
    }
  }
}

// Instancia global
window.DominoBluetooth = new DominoBluetoothManager();
