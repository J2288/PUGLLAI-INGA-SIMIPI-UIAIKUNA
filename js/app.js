/**
 * PUGLLAI INGA SIMIPI UIAIKUNA - Lógica de Interfaz y Mesa Tradicional de Dominó
 * Manejo de estado, renderizado 3D de fichas, sonido auténtico y reglas reales.
 */

// Helper selector
const $ = (id) => document.getElementById(id);

// Estado de la partida
let currentLevel = 1;
let deck = [];
let hand = [];
let chain = [];
let points = 0;
let saraCoins = 50;
let soundEnabled = true;
let isBotActive = true; // Activo por defecto para una experiencia de juego real
let botHand = [];
let turn = 'player'; // 'player' | 'bot'
let selectedTileIndex = null;
let moveStartTime = Date.now();
let totalMoves = 0;
let correctMoves = 0;
let streak = 0;
let matchesHistory = [];
let isMusicPlaying = false;
let musicTimer = null;

// Temas de mesa y materiales de fichas
const TABLE_THEMES = ['', 'table-theme-wood', 'table-theme-night', 'table-theme-gold'];
const THEME_NAMES = ['Verde Esmeralda Torneo', 'Caoba Andina', 'Noche del Putumayo', 'Sol de Sibundoy'];
let currentThemeIndex = 0;

// Audio Context sintético para efectos sonoros de dominó realista
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Genera el auténtico golpe ("CLAC!") de una ficha de dominó de hueso/marfil
 * chocando contra el tapete de la mesa o contra otra ficha.
 */
function playDominoClack() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Ruido blanco de impacto rápido (chasquido de hueso)
    const bufferSize = ctx.sampleRate * 0.04; // 40ms
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(2.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.035);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // 2. Resonancia grave del cuerpo de la mesa de madera
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.06);

    oscGain.gain.setValueAtTime(0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  } catch (err) {
    console.warn("Audio error:", err);
  }
}

/**
 * Sonidos complementarios del sistema
 */
function playSound(type) {
  if (!soundEnabled) return;
  if (type === 'clack') {
    playDominoClack();
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'correct') {
      playDominoClack();
      // Armónico sutil de logro
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'draw') {
      // Ficha arrastrada
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.25, now + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.4);
        o.start(now + i * 0.12);
        o.stop(now + i * 0.12 + 0.45);
      });
    }
  } catch (e) {
    console.warn("Sound error", e);
  }
}

// Síntesis de voz para pronunciación de palabras en lengua Inga con prosodia andina
function speakWord(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  // Diccionario fonético para entonación y acentuación andina precisa
  const phoneticMap = {
    'ALKU': 'Alku',
    'KILLA': 'Kílla',
    'SUGRATUKAMA': 'Sugratukáma',
    'CHUNGA I SUGTA': 'Chunga i sugta',
    'NUKA KANI': 'Ñuka kani',
    'MAMASIÑURA': 'Mamasíñura',
    'ASUA': 'Ásua',
    'SANCHA': 'Sáncha',
    'MISITU': 'Misítu',
    'IAKU': 'Íaku',
    'RUKU SACHA': 'Rúku sácha',
    'KINDI': 'Kíndi'
  };

  const key = (text || '').trim().toUpperCase();
  const speakText = phoneticMap[key] || text;
  const utterance = new SpeechSynthesisUtterance(speakText);
  utterance.lang = 'es-CO'; // Español andino / colombiano
  utterance.rate = 0.85;
  utterance.pitch = 1.05;

  try {
    const voices = window.speechSynthesis.getVoices();
    const latinVoice = voices.find(v => v.lang === 'es-CO' || v.lang === 'es-419' || v.lang.startsWith('es-'));
    if (latinVoice) utterance.voice = latinVoice;
  } catch (_) {}

  window.speechSynthesis.speak(utterance);
}

// Iniciar una nueva partida
function startGame() {
  const currentConcepts = getVocabularyForLevel(currentLevel);
  deck = shuffle(createDeck(currentConcepts));

  // Para la baraja oficial de 28 fichas (2 jugadores), 7 fichas por jugador según la norma internacional
  const dealCount = deck.length >= 28 ? 7 : 5;
  hand = deck.splice(0, dealCount);

  // Fichas al rival bot (Sabio Kindi)
  if (isBotActive) {
    botHand = deck.splice(0, dealCount);
  } else {
    botHand = [];
  }

  chain = [];
  points = 0;
  turn = 'player';
  selectedTileIndex = null;
  moveStartTime = Date.now();
  totalMoves = 0;
  correctMoves = 0;

  if (currentConcepts.length > 0) {
    updateLearnCard(currentConcepts[0]);
  }
  initLearnCardAutoRotation();

  if ($("status")) {
    $("status").textContent = "Tu turno";
    $("status").className = "";
  }
  if ($("passTurn")) $("passTurn").style.display = "none";
  render();
}

// ============================================================================
// MOTOR DE ROTACIÓN CONTINUA DEL PORTAL PEDAGÓGICO INGA
// ============================================================================
let currentLearnIndex = 0;
let isLearnAutoRotatePaused = false;
let isLearnHovered = false;
let learnTimerInterval = null;
let learnTimerProgressMs = 0;
const LEARN_INTERVAL_MS = 4000; // Cambio constante cada 4 segundos
const LEARN_TICK_MS = 100;

function getLearnVocabularyList() {
  if (typeof getVocabularyForLevel === 'function') {
    const lvlVocab = getVocabularyForLevel(currentLevel);
    if (lvlVocab && lvlVocab.length > 0) return lvlVocab;
  }
  if (typeof VOCABULARY !== 'undefined' && VOCABULARY.length > 0) {
    return VOCABULARY;
  }
  if (typeof INGA_DOMINO_CONCEPTS !== 'undefined' && INGA_DOMINO_CONCEPTS.length > 0) {
    return INGA_DOMINO_CONCEPTS;
  }
  return [];
}

// Actualizar la tarjeta lateral de estudio con animación e imagen
function updateLearnCard(concept, shouldResetTimer = true) {
  if (!concept) return;

  const vocabList = getLearnVocabularyList();
  const foundIdx = vocabList.findIndex(c => c.id === concept.id || c.inga === concept.inga);
  if (foundIdx !== -1) {
    currentLearnIndex = foundIdx;
  }

  if (shouldResetTimer) {
    learnTimerProgressMs = 0;
  }

  const wordEl = $("learnWord");
  const phoneticEl = $("learnPhonetic");
  const transEl = $("learnTranslation");
  const factEl = $("learnFact");
  const iconEl = $("learnIcon");
  const badgeEl = $("learnBadgeValue");
  const counterEl = $("learnCounterBadge");
  const displayBox = $("learnDisplayContainer") || document.querySelector(".word-display");

  // Animación fluida de entrada al cambiar de imagen/concepto
  if (displayBox) {
    displayBox.classList.remove("learn-animate");
    void displayBox.offsetWidth; // Forzar reflow
    displayBox.classList.add("learn-animate");
  }

  // 1. Imagen / Icono destacado
  if (iconEl) {
    iconEl.innerHTML = concept.icon || '🏷️';
    if (concept.color) {
      iconEl.style.filter = `drop-shadow(0 4px 14px ${concept.color}99)`;
    }
  }

  // 2. Etiqueta de valor de dominó / categoría
  if (badgeEl) {
    if (concept.value !== undefined) {
      badgeEl.textContent = `Valor ${concept.value} · ${concept.dotName || ''}`;
      badgeEl.style.backgroundColor = concept.color || '#8B002B';
      badgeEl.style.display = 'inline-block';
    } else if (concept.level) {
      badgeEl.textContent = `Nivel ${concept.level} · ${concept.category || ''}`;
      badgeEl.style.backgroundColor = '#0284C7';
      badgeEl.style.display = 'inline-block';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  // 3. Palabra en lengua Inga
  if (wordEl) {
    wordEl.textContent = concept.inga;
  }

  // 4. Fonética andina
  if (phoneticEl) {
    phoneticEl.textContent = `[${concept.phonetic || concept.inga}]`;
  }

  // 5. Traducción al español
  if (transEl) {
    transEl.textContent = concept.tileEs || (concept.es || '').split('/')[0].trim();
  }

  // 6. Significado cultural / Cosmovisión
  if (factEl) {
    const cat = concept.category ? concept.category.toUpperCase() : 'CULTURA INGA';
    const fact = concept.funFact || "Concepto clave para el diálogo en lengua Inga.";
    factEl.innerHTML = `<strong>${cat}:</strong> ${fact}`;
    if (concept.color) {
      factEl.style.borderLeftColor = concept.color;
    }
  }

  // 7. Contador "1 / 14"
  if (counterEl && vocabList.length > 0) {
    counterEl.textContent = `${currentLearnIndex + 1} / ${vocabList.length}`;
  }
}

// Avanzar o retroceder concepto en el carrusel
function advanceLearnCard(direction = 1) {
  const vocabList = getLearnVocabularyList();
  if (!vocabList || vocabList.length === 0) return;
  currentLearnIndex = (currentLearnIndex + direction + vocabList.length) % vocabList.length;
  updateLearnCard(vocabList[currentLearnIndex], true);
}

// Iniciar rotación continua automática del portal pedagógico
function initLearnCardAutoRotation() {
  if (learnTimerInterval) clearInterval(learnTimerInterval);

  learnTimerInterval = setInterval(() => {
    // Si está pausado por el usuario o con el cursor encima, no avanza el temporizador
    if (isLearnAutoRotatePaused || isLearnHovered) {
      return;
    }

    learnTimerProgressMs += LEARN_TICK_MS;
    const progressPercent = Math.min((learnTimerProgressMs / LEARN_INTERVAL_MS) * 100, 100);
    const progressEl = $("learnTimerProgress");
    if (progressEl) {
      progressEl.style.width = `${progressPercent}%`;
    }

    if (learnTimerProgressMs >= LEARN_INTERVAL_MS) {
      learnTimerProgressMs = 0;
      advanceLearnCard(1);
    }
  }, LEARN_TICK_MS);

  // Controles de navegación manual
  const prevBtn = $("learnPrevBtn");
  if (prevBtn) {
    prevBtn.onclick = () => {
      advanceLearnCard(-1);
      learnTimerProgressMs = 0;
    };
  }

  const nextBtn = $("learnNextBtn");
  if (nextBtn) {
    nextBtn.onclick = () => {
      advanceLearnCard(1);
      learnTimerProgressMs = 0;
    };
  }

  const pauseBtn = $("learnPauseToggleBtn");
  if (pauseBtn) {
    pauseBtn.onclick = () => {
      isLearnAutoRotatePaused = !isLearnAutoRotatePaused;
      pauseBtn.textContent = isLearnAutoRotatePaused ? '▶' : '⏸';
      pauseBtn.title = isLearnAutoRotatePaused ? 'Reanudar rotación automática' : 'Pausar rotación automática';
      pauseBtn.style.color = isLearnAutoRotatePaused ? '#FFC629' : '#E2E8F0';
    };
  }

  // Pausar suavemente al pasar el ratón por encima para poder leer sin interrupciones
  const card = $("pedagogiaCard");
  if (card) {
    card.addEventListener("mouseenter", () => { isLearnHovered = true; });
    card.addEventListener("mouseleave", () => { isLearnHovered = false; });
  }
}

// Formateo visual fiel de las palabras en lengua Inga para las mitades de ficha
function formatIngaTileDisplay(concept) {
  if (!concept) return '';
  if (Array.isArray(concept.displayLines) && concept.displayLines.length > 1) {
    return concept.displayLines.map(line => `<span class="inga-row">${line}</span>`).join('');
  }
  const word = (concept.inga || '').toUpperCase().trim();
  if (word === 'CHUNGA I SUGTA') {
    return '<span class="inga-row">CHUNGA</span><span class="inga-row">I SUGTA</span>';
  }
  if (word === 'NUKA KANI') {
    return '<span class="inga-row">NUKA</span><span class="inga-row">KANI</span>';
  }
  if (word === 'RUKU SACHA') {
    return '<span class="inga-row">RUKU</span><span class="inga-row">SACHA</span>';
  }
  return `<span class="inga-row">${word}</span>`;
}

/**
 * Renderizado de una ficha de dominó auténtica
 * @param {Object} tile - Objeto de la ficha
 * @param {Function} onClick - Callback de clic
 * @param {boolean} isBoardTile - Si se encuentra en el tapete de la mesa
 */
function renderTile(tile, onClick, isBoardTile = false) {
  const button = document.createElement("button");
  
  // En la mesa, las fichas dobles se colocan perpendiculares (verticales) como en el dominó real!
  const isVertical = isBoardTile && tile.isDouble;
  button.className = `tile ${isVertical ? 'vertical' : 'horizontal'}` + (isBoardTile ? " board-tile" : "");
  button.type = "button";
  button.setAttribute("aria-label", `${tile.left.inga} con ${tile.right.inga}`);

  // Perno central metálico de latón característico de los dominós reales
  const pin = document.createElement("div");
  pin.className = "domino-pin";
  button.append(pin);

  [
    { concept: tile.left, side: 'first' },
    { concept: tile.right, side: 'second' }
  ].forEach((item, idx) => {
    const half = document.createElement("div");
    half.className = `half half-${item.side}`;

    // 1. Indicador del valor numérico del dominó (0 al 6) con su color oficial
    if (item.concept.value !== undefined) {
      const pipTag = document.createElement("span");
      pipTag.className = `domino-pip-tag pip-${item.side}`;
      pipTag.style.backgroundColor = item.concept.color || '#3B0F1E';
      pipTag.textContent = item.concept.value;
      pipTag.title = `${item.concept.dotName || ''} (${item.concept.value})`;
      half.append(pipTag);
    }

    // 2. Contenedor vertical centrado para Imagen + Nombre + Traducción
    const body = document.createElement("div");
    body.className = "half-body";

    // A. Imagen / Icono representativo
    if (item.concept.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "concept-icon";
      iconSpan.innerHTML = item.concept.icon;
      body.append(iconSpan);
    }

    // B. Nombre oficial en lengua Inga (Destacado, mayúsculas, centrado, sin cortes)
    const name = document.createElement("span");
    const ingaText = (item.concept.inga || '').trim().toUpperCase();
    const isMulti = ingaText.includes(' ') || (item.concept.displayLines && item.concept.displayLines.length > 1);
    
    let specificClass = '';
    if (ingaText === 'SUGRATUKAMA') {
      specificClass = 'concept-sugratukama';
    } else if (ingaText === 'MAMASIÑURA') {
      specificClass = 'concept-mamasinura';
    } else if (isMulti) {
      specificClass = 'concept-multiline';
    } else if (ingaText.length >= 8) {
      specificClass = 'concept-long';
    }

    name.className = `concept ${specificClass}`;
    name.innerHTML = formatIngaTileDisplay(item.concept);
    body.append(name);

    // C. Traducción pedagógica al español (Concisa, 1 sola línea, sin desbordes)
    const shortEs = item.concept.tileEs || (item.concept.es || '').split('/')[0].trim();
    if (shortEs) {
      const translation = document.createElement("span");
      translation.className = "translation";
      translation.textContent = shortEs;
      translation.title = item.concept.es || shortEs;
      body.append(translation);
    }

    half.append(body);
    button.append(half);
  });

  if (onClick) {
    button.addEventListener("click", onClick);
  }

  return button;
}

/**
 * Selección o jugada de una ficha desde el atril del jugador
 */
function onHandTileClick(index) {
  if (turn !== 'player') return;

  const tile = hand[index];
  if (!tile) return;

  // Si la mesa está vacía, colocar la ficha inmediatamente en el centro
  if (chain.length === 0) {
    chain.push(tile);
    onSuccessfulMove(index, tile);
    return;
  }

  const leftEnd = chain[0].left;
  const rightEnd = chain[chain.length - 1].right;
  const canLeft = canConnect(tile, leftEnd);
  const canRight = canConnect(tile, rightEnd);

  if (!canLeft && !canRight) {
    // No coincide
    streak = 0;
    if ($("streakCount")) $("streakCount").textContent = '0';
    playSound('error');
    $("status").textContent = `No coincide. "${tile.left.inga}" significa "${tile.left.es}". ¡Busca una ficha que coincida con ${leftEnd.inga} o ${rightEnd.inga}!`;
    $("status").className = "alert";
    updateLearnCard(tile.left);
    selectedTileIndex = null;
    render();
    return;
  }

  // Si coincide con ambos extremos, marcar la ficha como seleccionada y permitir elegir el lado
  if (canLeft && canRight) {
    selectedTileIndex = index;
    $("status").textContent = `Ficha elegida: [${tile.left.inga} | ${tile.right.inga}]. Haz clic en el extremo donde deseas conectarla.`;
    $("status").className = "";
    render();
    return;
  }

  // Si coincide únicamente con uno, jugarla directamente en ese extremo
  if (canRight) {
    playTileAtEnd(index, 'rightEnd');
  } else {
    playTileAtEnd(index, 'leftEnd');
  }
}

/**
 * Conecta la ficha seleccionada al extremo especificado
 */
function playTileAtEnd(index, end) {
  const tile = hand[index];
  if (!tile) return;

  totalMoves++;

  if (end === 'rightEnd') {
    const rightEnd = chain[chain.length - 1].right;
    if (!canConnect(tile, rightEnd)) return;
    const oriented = orientTile(tile, rightEnd, 'rightEnd');
    chain.push(oriented);
  } else {
    const leftEnd = chain[0].left;
    if (!canConnect(tile, leftEnd)) return;
    const oriented = orientTile(tile, leftEnd, 'leftEnd');
    chain.unshift(oriented);
  }

  selectedTileIndex = null;
  onSuccessfulMove(index, tile);
}

/**
 * Tratamiento de jugada válida
 */
function onSuccessfulMove(index, tile) {
  hand.splice(index, 1);
  correctMoves++;
  streak++;
  if ($("streakCount")) $("streakCount").textContent = streak;
  playSound('correct');

  // Puntuación:
  // Conexión correcta: +10 pts
  let earnedPoints = 10;
  let bonusTag = "+10";

  // Jugada rápida (< 5 seg): +5 pts
  const elapsedSeconds = (Date.now() - moveStartTime) / 1000;
  if (elapsedSeconds <= 5) {
    earnedPoints += 5;
    bonusTag += " ⚡+5 Rápido";
  }

  // Ficha doble (perpendicular): +20 pts
  if (tile.isDouble) {
    earnedPoints += 20;
    bonusTag += " ⭐+20 Doble";
  }

  // Bonificación por Racha Continua
  if (streak >= 3) {
    const streakBonus = streak * 2;
    earnedPoints += streakBonus;
    bonusTag += ` 🔥+${streakBonus} Racha x${streak}!`;
  }

  points += earnedPoints;
  saraCoins += 2;

  // Efecto visual de puntos flotantes sobre la mesa
  showFloatingBadge(bonusTag);

  updateLearnCard(tile.right || tile.left);
  moveStartTime = Date.now();

  // Victoria del jugador
  if (hand.length === 0) {
    handleWin('¡Ganaste la partida!', true);
    return;
  }

  const myName = getMyPlayerName();
  $("status").textContent = `¡Buena jugada, ${myName}! (+${earnedPoints} pts)`;
  $("status").className = "";
  render();

  // Turno de Sabio Kindi
  if (isBotActive) {
    turn = 'bot';
    $("status").textContent = "🐦 Sabio Kindi pensando su jugada...";
    setTimeout(botPlayTurn, 900);
  } else if (window.DominoBluetooth && window.DominoBluetooth.roomId) {
    turn = 'remote';
    $("status").textContent = `Turno de ${window.DominoBluetooth.peerName || 'tu compañero Bluetooth'}...`;
    window.DominoBluetooth.broadcastMove({
      type: 'play',
      tile: tile,
      end: (chain[0].left.id === tile.left.id || chain[0].left.id === tile.right.id) ? 'leftEnd' : 'rightEnd',
      remainingCount: hand.length
    });
  }
}

/**
 * Turno automático de Sabio Kindi
 */
function botPlayTurn() {
  if (!isBotActive || turn !== 'bot') return;

  const move = chooseBotMove(botHand, chain);

  if (move) {
    const { tile, index, targetEnd } = move;
    botHand.splice(index, 1);

    if (targetEnd === 'rightEnd') {
      const rightEnd = chain[chain.length - 1].right;
      chain.push(orientTile(tile, rightEnd, 'rightEnd'));
    } else {
      const leftEnd = chain[0].left;
      chain.unshift(orientTile(tile, leftEnd, 'leftEnd'));
    }

    playSound('clack');

    if (botHand.length === 0) {
      handleWin('🐦 ¡Sabio Kindi ha colocado su última ficha y ganó la mano!', false);
      return;
    }

    $("status").textContent = "Kindi colocó una ficha en la mesa. ¡Tu turno!";
  } else {
    // Si el bot no tiene jugada, roba del pozo si hay
    if (deck.length > 0) {
      botHand.push(deck.pop());
      playSound('draw');
      $("status").textContent = "Kindi no tenía ficha y robó del pozo. ¡Tu turno!";
    } else {
      $("status").textContent = "Kindi no tiene jugada y pasó. ¡Tu turno!";
      // Verificar si el jugador tampoco puede y la partida se cierra (tranca)
      checkGameLock();
    }
  }

  turn = 'player';
  moveStartTime = Date.now();
  render();
}

/**
 * Verifica si la partida se bloquea (Tranca de dominó tradicional)
 */
function checkGameLock() {
  const playerMoves = getPlayableTiles(hand, chain);
  const botMoves = getPlayableTiles(botHand, chain);

  if (deck.length === 0 && playerMoves.length === 0 && botMoves.length === 0) {
    const playerWeight = calculateHandWeight(hand);
    const botWeight = calculateHandWeight(botHand);

    if (playerWeight < botWeight) {
      handleWin(`¡Partida cerrada (Tranca)! Tienes ${playerWeight} fichas vs ${botWeight} de Kindi. ¡Ganas por menos fichas!`, true);
    } else if (botWeight < playerWeight) {
      handleWin(`¡Partida cerrada (Tranca)! Kindi tiene ${botWeight} fichas vs ${playerWeight} tuyas. Gana Kindi.`, false);
    } else {
      handleWin(`¡Partida cerrada (Tranca) con empate a ${playerWeight} fichas!`, true);
    }
  }
}

/**
 * Manejo de fin de partida
 */
function handleWin(message, isPlayerWin = true) {
  render();
  playSound('win');
  if (isPlayerWin) {
    launchConfetti();
  }

  const accuracy = totalMoves > 0 ? Math.round((correctMoves / totalMoves) * 100) : 100;
  const matchResult = {
    id: matchesHistory.length + 1,
    mode: isBotActive ? 'duelo_kindi' : 'solitario',
    level: currentLevel,
    score: points,
    accuracy: accuracy,
    result: isPlayerWin ? 'victoria' : 'derrota',
    playedAt: new Date().toLocaleTimeString()
  };

  matchesHistory.unshift(matchResult);
  saveMatchToServer(matchResult);

  if ($("winModalTitle")) $("winModalTitle").textContent = isPlayerWin ? "🎉 ¡Sumak! ¡Victoria!" : "🤝 ¡Buena Partida!";
  if ($("winModalIcon")) $("winModalIcon").textContent = isPlayerWin ? "🏆" : "🐦";
  if ($("winModalMessage")) $("winModalMessage").textContent = message;
  if ($("winModalScore")) $("winModalScore").textContent = `Puntaje final: ${points} puntos (${accuracy}% de precisión)`;
  openModal('winModal');
}

// Envío a la API Node.js
function saveMatchToServer(matchData) {
  fetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(matchData)
  }).then(res => res.json()).catch(() => {});
}

/**
 * Renderizado de la mesa, el atril y los componentes
 */
function render() {
  if ($("score")) $("score").textContent = `${points} pts`;
  if ($("handCount")) $("handCount").textContent = `${hand.length} fichas`;
  if ($("deckCount")) $("deckCount").textContent = `${deck.length}`;
  if ($("saraCoins")) $("saraCoins").textContent = `${saraCoins}`;

  // Actualizar atril del rival (Sabio Kindi)
  const opponentRack = $("opponentRack");
  if (opponentRack) {
    opponentRack.replaceChildren();
    if ($("botTileCount")) $("botTileCount").textContent = `${botHand.length} fichas`;
    botHand.forEach(() => {
      const tileBack = document.createElement("div");
      tileBack.className = "tile-face-down";
      tileBack.title = "Ficha de Sabio Kindi boca abajo";
      opponentRack.append(tileBack);
    });
  }

  // Fichas jugables en la mano
  const playableMoves = getPlayableTiles(hand, chain);

  // Actualizar atril del jugador
  const handContainer = $("hand");
  if (handContainer) {
    handContainer.replaceChildren();

    hand.forEach((tile, index) => {
      const isPlayable = playableMoves.some(m => m.tile.id === tile.id);
      const tileElem = renderTile(tile, () => onHandTileClick(index), false);
      
      if (isPlayable) {
        tileElem.classList.add("playable");
      }
      if (selectedTileIndex === index) {
        tileElem.classList.add("selected");
      }

      handContainer.append(tileElem);
    });
  }

  // Actualizar cadena de dominó en la mesa
  const chainContainer = $("chain");
  if (chainContainer) {
    chainContainer.replaceChildren();

    if (chain.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.style.color = "rgba(255,255,255,0.8)";
      empty.textContent = "Coloca una ficha de tu atril en el centro de la mesa para abrir la partida.";
      chainContainer.append(empty);
    } else {
      const leftEnd = chain[0].left;
      const rightEnd = chain[chain.length - 1].right;

      // Si hay una ficha seleccionada que coincide con el extremo izquierdo, mostrar botón interactivo
      if (selectedTileIndex !== null) {
        const selTile = hand[selectedTileIndex];
        if (canConnect(selTile, leftEnd)) {
          const leftTarget = document.createElement("button");
          leftTarget.className = "drop-target-btn";
          leftTarget.innerHTML = `<span>◀ Conectar</span><strong>${leftEnd.inga}</strong>`;
          leftTarget.onclick = () => playTileAtEnd(selectedTileIndex, 'leftEnd');
          chainContainer.append(leftTarget);
        }
      }

      // Fichas en el tapete de fieltro
      chain.forEach(tile => {
        chainContainer.append(renderTile(tile, null, true));
      });

      // Si hay una ficha seleccionada que coincide con el extremo derecho, mostrar botón interactivo
      if (selectedTileIndex !== null) {
        const selTile = hand[selectedTileIndex];
        if (canConnect(selTile, rightEnd)) {
          const rightTarget = document.createElement("button");
          rightTarget.className = "drop-target-btn";
          rightTarget.innerHTML = `<span>Conectar ▶</span><strong>${rightEnd.inga}</strong>`;
          rightTarget.onclick = () => playTileAtEnd(selectedTileIndex, 'rightEnd');
          chainContainer.append(rightTarget);
        }
      }

      // Auto-scroll para mantener visibles los extremos
      const scrollArea = $("chainScrollArea");
      if (scrollArea) {
        setTimeout(() => {
          scrollArea.scrollLeft = scrollArea.scrollWidth;
        }, 40);
      }
    }
  }

  // Determinar si el jugador debe robar o pasar
  const statusEl = $("status");
  const passBtn = $("passTurn");
  const canPlayerMove = playableMoves.length > 0;
  if (!canPlayerMove && chain.length > 0) {
    if (deck.length > 0) {
      if (statusEl) {
        statusEl.textContent = "No tienes fichas para jugar. Roba del pozo.";
        statusEl.className = "alert";
      }
      if (passBtn) passBtn.style.display = "none";
    } else {
      if (statusEl) {
        statusEl.textContent = "Sin jugada posible y el pozo está vacío. Pasa tu turno.";
        statusEl.className = "alert";
      }
      if (passBtn) passBtn.style.display = "inline-flex";
    }
  } else {
    if (passBtn) passBtn.style.display = "none";
  }

  updateTeacherPanel();
}

// Helper para registrar eventos de manera segura si el elemento existe en el DOM
const safeOn = (id, event, handler) => {
  const el = $(id);
  if (el) el.addEventListener(event, handler);
};

// Botón: Robar del pozo
safeOn("draw", "click", () => {
  if (deck.length > 0) {
    const drawn = deck.pop();
    hand.push(drawn);
    playSound('draw');
    if ($("status")) {
      $("status").textContent = `Has tomado una ficha del pozo.`;
      $("status").className = "";
    }
    selectedTileIndex = null;
    if (window.DominoBluetooth && window.DominoBluetooth.roomId) {
      window.DominoBluetooth.broadcastMove({ type: 'draw' });
    }
    render();
  } else {
    if ($("status")) {
      $("status").textContent = "El pozo está vacío. No quedan más fichas para robar.";
      $("status").className = "alert";
    }
    render();
  }
});

// Botón: Pasar turno
safeOn("passTurn", "click", () => {
  if (isBotActive) {
    turn = 'bot';
    if ($("status")) $("status").textContent = "Has pasado tu turno. Juega Sabio Kindi.";
    setTimeout(botPlayTurn, 900);
  } else if (window.DominoBluetooth && window.DominoBluetooth.roomId) {
    turn = 'remote';
    if ($("status")) $("status").textContent = `Has pasado turno. Esperando a ${window.DominoBluetooth.peerName || 'tu compañero'}...`;
    window.DominoBluetooth.broadcastMove({ type: 'pass' });
  } else {
    checkGameLock();
  }
});

// Botón: Ordenar mano
safeOn("sortHandBtn", "click", () => {
  hand.sort((a, b) => {
    if (a.isDouble && !b.isDouble) return -1;
    if (!a.isDouble && b.isDouble) return 1;
    return a.left.inga.localeCompare(b.left.inga);
  });
  playSound('draw');
  render();
});

// Botón: Nueva partida
safeOn("newGame", "click", () => {
  startGame();
});

// Toggle Bot / Solitario
safeOn("toggleBotBtn", "click", () => {
  isBotActive = !isBotActive;
  if ($("gameModeBadge")) $("gameModeBadge").textContent = isBotActive ? "Duelo vs Sabio Kindi" : "Modo Solitario (Práctica)";
  if ($("opponentBar")) $("opponentBar").style.display = isBotActive ? "flex" : "none";
  startGame();
});

// Pronunciar la palabra actualmente en pantalla
safeOn("speakWordBtn", "click", () => {
  const word = $("learnWord") ? $("learnWord").textContent : 'ALKU';
  speakWord(word);
});

// Toggle sonido
safeOn("toggleSoundBtn", "click", () => {
  soundEnabled = !soundEnabled;
  if ($("toggleSoundBtn")) $("toggleSoundBtn").textContent = soundEnabled ? "🔊" : "🔇";
});

// Toggle alto contraste
safeOn("toggleContrastBtn", "click", () => {
  document.body.classList.toggle("high-contrast");
});

// Modales
function openModal(id) {
  if (id === 'game') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    return;
  }
  const modal = $(id);
  if (modal) modal.classList.add("active");
  if (id === 'vocabModal') renderDictionary();
  if (id === 'levelsModal') renderLevelsGrid();
  if (id === 'teacherModal') {
    updateTeacherPanel();
    loadSqlPreview();
  }
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove("active");
}

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("active");
  });
});

// Panel docente
function updateTeacherPanel() {
  $("teacherTotalMatches").textContent = matchesHistory.length;
  if (matchesHistory.length > 0) {
    const avg = Math.round(matchesHistory.reduce((acc, m) => acc + m.accuracy, 0) / matchesHistory.length);
    const maxScore = Math.max(...matchesHistory.map(m => m.score));
    $("teacherAvgAccuracy").textContent = `${avg}%`;
    $("teacherHighScore").textContent = `${maxScore} pts`;

    const tbody = $("matchesTableBody");
    tbody.replaceChildren();
    matchesHistory.forEach(m => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>#${m.id}</td>
        <td><code>${m.mode}</code></td>
        <td>Nivel ${m.level}</td>
        <td><strong>${m.score} pts</strong></td>
        <td>${m.accuracy}%</td>
        <td><span style="color:${m.result === 'victoria' ? '#35B86B' : '#E5338A'}; font-weight:700;">${m.result}</span></td>
        <td>${m.playedAt}</td>
      `;
      tbody.append(row);
    });
  }
}

function loadSqlPreview() {
  fetch('/database/schema.sql')
    .then(r => r.text())
    .then(txt => {
      $("sqlPreviewBlock").textContent = txt.slice(0, 1200) + "\n\n-- [... Ver database/schema.sql para el esquema completo de 12 tablas ...]";
    })
    .catch(() => {
      $("sqlPreviewBlock").textContent = "-- Archivo disponible en database/schema.sql";
    });
}

let isDominoBoardVisible = false;

function toggleDominoBoardVisualizer() {
  isDominoBoardVisible = !isDominoBoardVisible;
  const boardEl = $("dominoBoard28Container");
  const btn = $("toggleDominoBoardBtn");
  if (!boardEl) return;
  if (isDominoBoardVisible) {
    boardEl.style.display = "block";
    if (btn) btn.innerHTML = "👁️ Ocultar Baraja de 28 Fichas";
    renderDominoBoard28();
  } else {
    boardEl.style.display = "none";
    if (btn) btn.innerHTML = "👁️ Ver Baraja Oficial (28 Fichas)";
  }
}

function formatTileCardText(text) {
  if (!text) return '';
  const upper = text.toUpperCase().trim();
  if (upper === 'CHUNGA I SUGTA') {
    return '<span class="inga-row">CHUNGA</span><span class="inga-row">I SUGTA</span>';
  }
  if (upper === 'NUKA KANI') {
    return '<span class="inga-row">NUKA</span><span class="inga-row">KANI</span>';
  }
  if (upper === 'RUKU SACHA') {
    return '<span class="inga-row">RUKU</span><span class="inga-row">SACHA</span>';
  }
  return `<span class="inga-row">${upper}</span>`;
}

function renderDominoBoard28() {
  const container = $("dominoBoard28Container");
  if (!container) return;
  container.replaceChildren();

  const boardWrap = document.createElement("div");
  boardWrap.className = "domino-board-28";

  // Filas idénticas al juego físico oficial de la fotografía patrimonial
  const rows = [
    { name: "Blanco", val: 0, bgLabel: "#8B002B" },
    { name: "Uno", val: 1, bgLabel: "#D97706" },
    { name: "Dos", val: 2, bgLabel: "#16A34A" },
    { name: "Tres", val: 3, bgLabel: "#0284C7" },
    { name: "Cuatro", val: 4, bgLabel: "#7C3AED" },
    { name: "Cinco", val: 5, bgLabel: "#EC4899" }
  ];

  rows.forEach(r => {
    const rowEl = document.createElement("div");
    rowEl.className = "domino-row-wrap";

    const label = document.createElement("div");
    label.className = "domino-row-label";
    label.style.backgroundColor = r.bgLabel;
    label.textContent = r.name;
    rowEl.append(label);

    const tilesWrap = document.createElement("div");
    tilesWrap.className = "domino-row-tiles";

    // Fichas de esta fila según DOMINO_OFFICIAL_SET_28
    const rowTiles = (typeof DOMINO_OFFICIAL_SET_28 !== 'undefined' ? DOMINO_OFFICIAL_SET_28 : []).filter(t => t.rowName === r.name);

    rowTiles.forEach(t => {
      const card = document.createElement("div");
      card.className = "domino-card-preview";
      card.title = `${t.leftText} | ${t.rightText} (Clic para pronunciar)`;
      card.setAttribute("aria-label", `${t.leftText} y ${t.rightText}`);

      const leftConcept = (typeof getConceptById === 'function' ? getConceptById(t.leftId) : null) || { inga: t.leftText, icon: "🏷️", es: "" };
      const rightConcept = (typeof getConceptById === 'function' ? getConceptById(t.rightId) : null) || { inga: t.rightText, icon: "🏷️", es: "" };

      const topHalf = document.createElement("div");
      topHalf.className = "domino-card-half";
      topHalf.innerHTML = `
        <span class="domino-card-icon">${leftConcept.icon || '🏷️'}</span>
        <span class="domino-card-name">${formatTileCardText(t.leftText)}</span>
        ${leftConcept.es ? `<span class="domino-card-es">${leftConcept.es}</span>` : ''}
      `;

      const botHalf = document.createElement("div");
      botHalf.className = "domino-card-half";
      botHalf.innerHTML = `
        <span class="domino-card-icon">${rightConcept.icon || '🏷️'}</span>
        <span class="domino-card-name">${formatTileCardText(t.rightText)}</span>
        ${rightConcept.es ? `<span class="domino-card-es">${rightConcept.es}</span>` : ''}
      `;

      card.append(topHalf, botHalf);
      card.onclick = () => {
        speakWord(t.leftText);
        setTimeout(() => speakWord(t.rightText), 850);
      };

      tilesWrap.append(card);
    });

    rowEl.append(tilesWrap);
    boardWrap.append(rowEl);
  });

  container.append(boardWrap);
}

function renderDictionary() {
  const container = $("vocabDictionaryContainer");
  if (!container) return;
  container.replaceChildren();

  // Banner Superior Oficial de la Baraja
  const headerBox = document.createElement("div");
  headerBox.className = "vocab-header-card";
  headerBox.style.cssText = "background:linear-gradient(135deg, rgba(139,0,43,0.08) 0%, rgba(2,132,199,0.08) 100%); border:1px solid rgba(255,198,41,0.4); border-radius:12px; padding:14px 18px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;";
  headerBox.innerHTML = `
    <div>
      <h3 style="margin:0 0 4px 0; color:var(--wine); font-size:1.15rem; display:flex; align-items:center; gap:8px;">
        <span>🃏</span> Baraja Oficial de Dominó Inga (28 Fichas)
      </h3>
      <p style="margin:0; font-size:0.85rem; color:var(--muted);">
        Conjunto patrimonial auténtico · 7 Conceptos maestros (Valores 0 a 6) · Doble Mayor: <strong>ASUA (6-6)</strong>
      </p>
    </div>
    <button id="toggleDominoBoardBtn" class="button sm" style="background:var(--wine); color:#FFF; font-weight:700;" onclick="toggleDominoBoardVisualizer()">
      ${isDominoBoardVisible ? '👁️ Ocultar Baraja de 28 Fichas' : '👁️ Ver Baraja Oficial (28 Fichas)'}
    </button>
  `;
  container.append(headerBox);

  // Contenedor interactivo del tablero de 28 fichas
  const boardContainer = document.createElement("div");
  boardContainer.id = "dominoBoard28Container";
  boardContainer.style.display = isDominoBoardVisible ? "block" : "none";
  boardContainer.style.marginBottom = "20px";
  container.append(boardContainer);
  if (isDominoBoardVisible) {
    renderDominoBoard28();
  }

  // Cuadrícula de tarjetas de vocabulario pedagógico
  const grid = document.createElement("div");
  grid.className = "vocab-grid";

  VOCABULARY.forEach(item => {
    const card = document.createElement("div");
    card.className = "vocab-card";
    const valTag = (item.value !== undefined) ? 
      `<span style="background:${item.color || '#8B002B'}; color:#FFF; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:12px; display:inline-block; margin-bottom:6px;">
        Valor ${item.value} · ${item.dotName || ''}
      </span>` : `<span class="badge-pill" style="font-size:0.7rem; padding:2px 8px; margin-bottom:6px; display:inline-block;">Nivel ${item.level}</span>`;

    card.innerHTML = `
      <div style="font-size:2rem; margin-bottom:4px;">${item.icon || '📌'}</div>
      ${valTag}
      <strong style="color:var(--wine); font-size:1.18rem; display:block; letter-spacing:0.5px; text-transform:uppercase;">${item.inga}</strong>
      <span style="color:var(--turquoise-dark); font-size:0.82rem; font-weight:700; display:block;">[${item.phonetic}]</span>
      <span style="color:var(--muted); font-size:0.92rem; font-weight:600; display:block; margin:4px 0;">${item.es}</span>
      <p style="font-size:0.78rem; color:#555; margin:6px 0 10px; line-height:1.35; text-align:center;">${item.funFact || ''}</p>
      <button class="button sm outline" style="margin-top:auto;" onclick="speakWord('${item.inga}')">🔊 Pronunciar</button>
    `;
    grid.append(card);
  });

  container.append(grid);
}

function renderLevelsGrid() {
  const container = $("levelsContainer");
  if (!container) return;
  container.replaceChildren();

  LEVELS.forEach(lvl => {
    const isActive = (lvl.id === currentLevel);
    const card = document.createElement("div");
    card.className = "level-card" + (isActive ? " active-level" : "");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.onclick = () => selectLevel(lvl.id);

    // Obtener los 7 conceptos de este nivel para generar chips de previsualización
    const concepts = (typeof getVocabularyForLevel === 'function') 
      ? getVocabularyForLevel(lvl.id) 
      : [];

    const chipsHtml = concepts.map(c => `
      <span class="level-concept-chip" style="--chip-color:${c.color || '#3B0F1E'};" title="${c.es} [${c.phonetic || ''}]">
        <span class="chip-icon">${c.icon || '🏷️'}</span>
        <span class="chip-text">
          <strong class="chip-inga">${c.inga}</strong>
          <small class="chip-es">${c.tileEs || (c.es || '').split('/')[0].trim()}</small>
        </span>
      </span>
    `).join('');

    card.innerHTML = `
      <div class="level-card-header">
        <div class="level-badge-wrap">
          <span class="level-num-badge">${lvl.id}</span>
          <div class="level-header-titles">
            <span class="level-inga-subtitle">Nivel ${lvl.id} · ${lvl.ingaName.toUpperCase()}</span>
            <h4 class="level-card-title">${lvl.name}</h4>
          </div>
        </div>
        <div class="level-status-pill ${isActive ? 'is-active' : ''}">
          ${isActive ? '✓ En Juego' : `${lvl.deckSize || 28} Fichas`}
        </div>
      </div>

      <div class="level-card-body">
        <div class="level-meta-row">
          <span class="level-meta-tag theme-tag">🌿 ${lvl.theme}</span>
          <span class="level-meta-tag age-tag">🎯 ${lvl.age}</span>
        </div>
        <p class="level-card-desc">${lvl.description}</p>

        <div class="level-preview-section">
          <div class="level-preview-heading">
            <span>Vocabulario del Nivel (7 conceptos / 28 fichas):</span>
          </div>
          <div class="level-concepts-chips-grid">
            ${chipsHtml}
          </div>
        </div>
      </div>

      <div class="level-card-footer">
        <button type="button" class="level-action-btn ${isActive ? 'active-btn' : ''}" onclick="event.stopPropagation(); selectLevel(${lvl.id})">
          ${isActive 
            ? '<span>✓ Nivel Seleccionado Actualmente</span>' 
            : `<span>Jugar Nivel ${lvl.id} (${lvl.ingaName})</span> <span class="arrow-icon">➔</span>`}
        </button>
      </div>
    `;

    container.append(card);
  });
}

function selectLevel(lvlId) {
  const targetId = Number(lvlId);
  currentLevel = targetId;
  const levelObj = LEVELS.find(l => l.id === targetId);

  if (levelObj) {
    if ($("currentLevelName")) {
      $("currentLevelName").textContent = `Nivel ${targetId} · ${levelObj.ingaName} - ${levelObj.name}`;
    }
    if ($("profileLevelDisplay")) {
      $("profileLevelDisplay").textContent = `${targetId} - ${levelObj.ingaName}`;
    }
  }

  closeModal('levelsModal');
  currentLearnIndex = 0;
  startGame();

  if (typeof showToast === 'function' && levelObj) {
    showToast(`🏆 Nivel ${targetId} (${levelObj.ingaName}): Baraja de 28 fichas lista`, 'success');
  }

  // Desplazamiento suave al tapete del dominó
  const felt = document.querySelector('.domino-felt');
  if (felt) felt.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setAvatar(avatarId, name) {
  if ($("profileAvatarDisplay")) $("profileAvatarDisplay").textContent = avatarId === 'kuyi' ? '🐹' : '🦅';
  if ($("profileNameDisplay")) $("profileNameDisplay").textContent = name;
  closeModal('profileModal');
}

// ============================================================================
// FUNCIONES DE CONTROL BLUETOOTH / INALÁMBRICO
// ============================================================================

async function handleScanNativeBluetooth() {
  const btn = $("btScanBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "<span>⏳</span> Buscando dispositivos...";
  }
  try {
    const result = await window.DominoBluetooth.requestNativeDevice();
    updateBluetoothUI();
    if ($("btModalStateTitle")) $("btModalStateTitle").textContent = `🟢 Conectado vía BLE: ${result.deviceName}`;
    if ($("btModalStateDesc")) $("btModalStateDesc").textContent = `Dispositivo vinculado con éxito. ID: ${result.id.slice(0, 8)}...`;
    alert(`¡Dispositivo Bluetooth "${result.deviceName}" vinculado exitosamente!`);
  } catch (err) {
    alert(err.message || "No se pudo conectar al dispositivo Bluetooth.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "<span>🔍</span> Escanear Dispositivos Bluetooth Cercanos";
    }
  }
}

async function handleCreateWirelessRoom() {
  try {
    const myName = ($("profileNameDisplay") && $("profileNameDisplay").textContent) ? $("profileNameDisplay").textContent.split(' ')[0] : 'Jugador 1';
    const res = await window.DominoBluetooth.createWirelessRoom(myName);
    const pinBox = $("createdRoomPinBox");
    if (pinBox) {
      pinBox.style.display = 'block';
      pinBox.innerHTML = `✅ PIN MESA: <span style="font-size:1.25rem; letter-spacing:1px; color:var(--wine);">${res.roomId}</span>`;
    }
    
    // Desactivar bot porque ahora jugamos con compañero inalámbrico
    isBotActive = false;
    if ($("gameModeBadge")) {
      $("gameModeBadge").textContent = `Mesa Bluetooth: ${res.roomId}`;
      $("gameModeBadge").style.background = "#e6f8fa";
      $("gameModeBadge").style.color = "#0b6875";
    }
    
    updateBluetoothUI();
    if ($("btModalStateTitle")) $("btModalStateTitle").textContent = `📡 Mesa Creada: ${res.roomId}`;
    if ($("btModalStateDesc")) $("btModalStateDesc").textContent = `Comparte el PIN ${res.roomId} con tu compañero para que se una a tu partida.`;
  } catch (err) {
    alert("Error creando mesa inalámbrica: " + err.message);
  }
}

async function handleJoinWirelessRoom() {
  const pinInput = $("joinRoomPinInput").value.trim().toUpperCase();
  const nameInput = $("joinPlayerNameInput") ? $("joinPlayerNameInput").value.trim() : '';
  const myName = nameInput || getMyPlayerName() || 'Jugador 2';
  setMyPlayerName(myName);

  if (!pinInput) {
    alert("Por favor escribe el PIN de la mesa (Ejemplo: BT-4821)");
    return;
  }
  try {
    const res = await window.DominoBluetooth.joinWirelessRoom(pinInput, myName);
    
    isBotActive = false;
    $("gameModeBadge").textContent = `Mesa Multijugador: ${pinInput}`;
    $("gameModeBadge").style.background = "#e6f8fa";
    $("gameModeBadge").style.color = "#0b6875";

    updateBluetoothUI();
    closeModal('btModal');
    startGame();
    alert(`¡Hola ${myName}! Te has conectado exitosamente a la mesa de ${res.hostName}. ¡Comienza la partida!`);
  } catch (err) {
    alert("No se pudo unir: " + err.message);
  }
}

function handleDisconnectBluetooth() {
  if (window.DominoBluetooth) {
    window.DominoBluetooth.disconnect();
  }
  isBotActive = true;
  $("gameModeBadge").textContent = "Duelo vs Sabio Kindi";
  $("gameModeBadge").style.background = "#eef6fc";
  $("gameModeBadge").style.color = "#185a9d";
  updateBluetoothUI();
  startGame();
}

function updateBluetoothUI() {
  const bt = window.DominoBluetooth;
  const isConnected = !!(bt && (bt.connectedDevice || bt.roomId));
  const badgeBtn = $("btStatusBtn");
  const badgeText = $("btStatusText");
  const disconnectBtn = $("btDisconnectBtn");

  if (isConnected) {
    const name = bt.peerName || bt.roomId || "Enlace";
    if (badgeText) badgeText.textContent = `🟢 Enlace: ${name}`;
    if (badgeBtn) {
      badgeBtn.style.background = "rgba(46, 213, 115, 0.3)";
      badgeBtn.style.borderColor = "#2ed573";
    }
    if (disconnectBtn) disconnectBtn.style.display = "inline-flex";

    // Actualizar nombre del oponente en la mesa
    const oppName = $("opponentBar") ? $("opponentBar").querySelector("span:nth-child(2)") : null;
    if (oppName) {
      oppName.textContent = `${name} (Compañero)`;
    }
  } else {
    if (badgeText) badgeText.textContent = "Off";
    if (badgeBtn) {
      badgeBtn.style.background = "rgba(18, 181, 203, 0.25)";
      badgeBtn.style.borderColor = "var(--turquoise)";
    }
    if (disconnectBtn) disconnectBtn.style.display = "none";
  }
}

// Configurar receptor de jugadas remotas
if (window.DominoBluetooth) {
  window.DominoBluetooth.onPeerMoveCallback = (move) => {
    if (move.type === 'play') {
      const tile = move.tile;
      if (move.end === 'leftEnd') {
        const leftEnd = chain.length ? chain[0].left : null;
        chain.unshift(orientTile(tile, leftEnd, 'leftEnd'));
      } else {
        const rightEnd = chain.length ? chain[chain.length - 1].right : null;
        chain.push(orientTile(tile, rightEnd, 'rightEnd'));
      }
      playDominoClack();
      if (botHand.length > 0) botHand.pop();
      turn = 'player';
      $("status").textContent = `Tu compañero jugó [${tile.left.inga} | ${tile.right.inga}]. ¡Tu turno!`;
      render();
    } else if (move.type === 'draw') {
      if (deck.length > 0) {
        deck.pop();
        botHand.push({});
      }
      playSound('draw');
      $("status").textContent = "Tu compañero robó del pozo. ¡Tu turno!";
      render();
    } else if (move.type === 'pass') {
      turn = 'player';
      $("status").textContent = "Tu compañero pasó turno. ¡Tu turno!";
      render();
    }
  };

  window.DominoBluetooth.onStateChangeCallback = () => {
    updateBluetoothUI();
  };
}

// ============================================================================
// FUNCIONES DE CONTROL QR CODE Y MULTIJUGADOR
// ============================================================================

// ============================================================================
// FUNCIONES DE CONTROL DE JUGADORES, NOMBRES Y QR CODE
// ============================================================================

let KNOWN_WIFI_IP = '192.168.1.13';
let SERVER_PORT = window.location.port || '3000';

async function syncServerNetworkInfo() {
  try {
    const res = await fetch('/api/network-info');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        KNOWN_WIFI_IP = data.ip;
        if (data.port) SERVER_PORT = String(data.port);
      }
    }
  } catch (_) {}
}
syncServerNetworkInfo();

function getMyPlayerName() {
  try {
    const saved = localStorage.getItem('domino_player_name');
    if (saved) return saved;
  } catch (_) {}
  const profDisplay = $("profileNameDisplay");
  const fallback = (profDisplay && profDisplay.textContent) ? profDisplay.textContent.split(' ')[0] : 'Jugador 1';
  return fallback || 'Jugador 1';
}

function setMyPlayerName(name) {
  if (!name) return;
  try {
    localStorage.setItem('domino_player_name', name);
  } catch (_) {}
  const rackTitle = $("rackPlayerTitle");
  if (rackTitle) {
    rackTitle.textContent = `Atril de ${name}`;
  }
  const profDisplay = $("profileNameDisplay");
  if (profDisplay) {
    profDisplay.textContent = name;
  }
}

function getValidQrUrl(pin) {
  let host = window.location.hostname;
  let port = window.location.port;

  // Si hostname está vacío (file:///) o es localhost, siempre usar la IP Wi-Fi
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '') {
    host = KNOWN_WIFI_IP;
    port = SERVER_PORT;
  }
  const portPart = port ? `:${port}` : '';
  return `http://${host}${portPart}/?join=${pin}`;
}

async function openQrModal() {
  await syncServerNetworkInfo();
  const hostInput = $("hostPlayerNameInput");
  if (hostInput) {
    hostInput.value = getMyPlayerName();
  }

  let pin = window.DominoBluetooth ? window.DominoBluetooth.roomId : null;

  // Si no hay mesa activa, crear una nueva con el nombre personalizado
  if (!pin) {
    const myName = (hostInput && hostInput.value.trim()) ? hostInput.value.trim() : getMyPlayerName();
    setMyPlayerName(myName);
    const res = await window.DominoBluetooth.createWirelessRoom(myName);
    pin = res.roomId;
    isBotActive = false;
    $("gameModeBadge").textContent = `Mesa Multijugador: ${pin}`;
    $("gameModeBadge").style.background = "#e6f8fa";
    $("gameModeBadge").style.color = "#0b6875";
    updateBluetoothUI();
  }

  renderQrForPin(pin);
  openModal('qrModal');
}

function updateHostNameAndQr() {
  const hostInput = $("hostPlayerNameInput");
  if (hostInput && hostInput.value.trim()) {
    const newName = hostInput.value.trim();
    setMyPlayerName(newName);
    alert(`¡Nombre guardado como "${newName}"!`);
    let pin = window.DominoBluetooth ? window.DominoBluetooth.roomId : null;
    if (pin) {
      renderQrForPin(pin);
    }
  }
}

function renderQrForPin(pin) {
  const qrUrl = getValidQrUrl(pin);

  $("qrPinDisplay").textContent = pin;
  $("qrUrlDisplay").textContent = qrUrl;

  const container = $("qrCanvasContainer");
  if (!container) return;
  container.innerHTML = '<canvas id="qrCanvas" width="200" height="200" style="display:block; margin:auto;"></canvas>';
  const canvas = $("qrCanvas");

  // Renderizado oficial estándar ISO/IEC 18004 con alta legibilidad
  const qrLib = window.QRCodeLib || window.QRCode;
  if (qrLib && qrLib.toCanvas) {
    qrLib.toCanvas(canvas, qrUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#7A1F3D',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    }, function(err) {
      if (err) console.error("Error renderizando QR canvas:", err);
    });
  } else {
    // Fallback: Generar por endpoint oficial de Node.js
    fetch(`/api/qr?text=${encodeURIComponent(qrUrl)}`)
      .then(r => r.json())
      .then(d => {
        if (d.dataUrl) {
          container.innerHTML = `<img src="${d.dataUrl}" alt="Código QR de Conexión" width="200" height="200" style="display:block; margin:auto; border-radius:8px;">`;
        }
      })
      .catch(() => {});
  }
}

async function generateNewQrRoom() {
  const hostInput = $("hostPlayerNameInput");
  const myName = (hostInput && hostInput.value.trim()) ? hostInput.value.trim() : getMyPlayerName();
  setMyPlayerName(myName);
  const res = await window.DominoBluetooth.createWirelessRoom(myName);
  renderQrForPin(res.roomId);
  $("gameModeBadge").textContent = `Mesa Multijugador: ${res.roomId}`;
  updateBluetoothUI();
}

function copyQrLink() {
  const url = $("qrUrlDisplay").textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      alert("¡Enlace copiado al portapapeles! Puedes enviarlo por WhatsApp o chat.");
    }).catch(() => {
      prompt("Copia este enlace de conexión:", url);
    });
  } else {
    prompt("Copia este enlace de conexión:", url);
  }
}

// Variables para auto-unión por escaneo QR en celular
let pendingAutoJoinPin = null;

function promptQuickJoin(pin) {
  pendingAutoJoinPin = pin;
  const input = $("quickJoinNameInput");
  if (input) input.value = getMyPlayerName() || '';
  openModal('quickJoinModal');
}

async function confirmQuickJoin() {
  const input = $("quickJoinNameInput");
  const myName = (input && input.value.trim()) ? input.value.trim() : 'Jugador Celular';
  setMyPlayerName(myName);
  closeModal('quickJoinModal');

  if (pendingAutoJoinPin) {
    await handleJoinWirelessRoomDirect(pendingAutoJoinPin, myName);
    pendingAutoJoinPin = null;
  }
}

async function handleJoinWirelessRoomDirect(pin, customName) {
  const myName = customName || getMyPlayerName() || 'Jugador 2';
  try {
    const res = await window.DominoBluetooth.joinWirelessRoom(pin, myName);
    isBotActive = false;
    $("gameModeBadge").textContent = `Mesa Multijugador: ${pin}`;
    $("gameModeBadge").style.background = "#e6f8fa";
    $("gameModeBadge").style.color = "#0b6875";
    updateBluetoothUI();
    startGame();
    $("status").textContent = `Conectado con ${res.hostName}. ¡Mesa multijugador lista!`;
  } catch (err) {
    console.warn("Auto-join error:", err);
  }
}

// ============================================================================
// EXPERIENCIA PREMIUM AAA: EFECTOS, MÚSICA, TEMAS Y CONFETI
// ============================================================================

function showFloatingBadge(text) {
  const table = document.querySelector(".domino-felt");
  if (!table) return;

  const badge = document.createElement("div");
  badge.className = "floating-points";
  badge.innerHTML = text;
  badge.style.left = '50%';
  badge.style.top = '50%';
  badge.style.transform = 'translate(-50%, -50%)';
  table.appendChild(badge);

  setTimeout(() => {
    if (badge.parentNode) badge.parentNode.removeChild(badge);
  }, 1400);
}

function launchConfetti() {
  const canvas = $("confettiCanvas");
  if (!canvas || typeof canvas.getContext !== 'function') return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#FFC629', '#7A1F3D', '#12B5CB', '#35B86B', '#FF7B1C', '#FFFFFF', '#E5338A'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 260,
      y: canvas.height / 3 + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 9 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      alpha: 1
    });
  }

  const startTime = Date.now();
  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed > 4000) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.24; // Gravedad suave
      p.rotation += p.vRot;
      if (elapsed > 2500) {
        p.alpha = Math.max(0, 1 - (elapsed - 2500) / 1500);
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    requestAnimationFrame(animate);
  }
  animate();
}

function toggleAmbientMusic() {
  const btn = $("toggleMusicBtn");
  if (isMusicPlaying) {
    stopAmbientMusic();
    if (btn) btn.textContent = '🎵';
  } else {
    startAmbientMusic();
    if (btn) btn.textContent = '⏹️';
  }
}

function startAmbientMusic() {
  isMusicPlaying = true;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Escala pentatónica menor andina (flauta / quena)
  const notes = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 587.33, 659.25];

  function playNextNote() {
    if (!isMusicPlaying) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      const freq = notes[Math.floor(Math.random() * notes.length)];
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.35); // Ataque de aire
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3); // Resonancia larga

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.35);
    } catch (_) {}

    musicTimer = setTimeout(playNextNote, 1300 + Math.random() * 900);
  }

  playNextNote();
}

function stopAmbientMusic() {
  isMusicPlaying = false;
  if (musicTimer) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

function cycleTableTheme() {
  TABLE_THEMES.forEach(t => { if (t) document.body.classList.remove(t); });
  currentThemeIndex = (currentThemeIndex + 1) % TABLE_THEMES.length;
  const newTheme = TABLE_THEMES[currentThemeIndex];
  if (newTheme) {
    document.body.classList.add(newTheme);
  }
  try { localStorage.setItem('domino_table_theme', newTheme); } catch(_) {}
  $("status").textContent = `🎨 Tapete de mesa: "${THEME_NAMES[currentThemeIndex]}"`;
}

function toggleTileMaterial() {
  const isObsidian = document.body.classList.toggle('tile-theme-obsidian');
  try { localStorage.setItem('domino_tile_material', isObsidian ? 'obsidian' : 'ivory'); } catch(_) {}
  $("status").textContent = isObsidian ? '🀄 Fichas: Obsidiana Volcánica Negra' : '🀄 Fichas: Marfil Imperial Clásico';
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function speakWordWithSpeed(rate = 1.0) {
  const word = $("learnWord") ? $("learnWord").textContent : 'iaku';
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'es-CO';
  utterance.rate = rate;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

// Cargar temas y preferencias guardadas
try {
  const savedTheme = localStorage.getItem('domino_table_theme');
  if (savedTheme) {
    const idx = TABLE_THEMES.indexOf(savedTheme);
    if (idx !== -1) {
      currentThemeIndex = idx;
      document.body.classList.add(savedTheme);
    }
  }
  const savedTile = localStorage.getItem('domino_tile_material');
  if (savedTile === 'obsidian') {
    document.body.classList.add('tile-theme-obsidian');
  }
} catch (_) {}

// Event listeners de la barra superior premium
if ($("toggleMusicBtn")) $("toggleMusicBtn").addEventListener("click", toggleAmbientMusic);
if ($("toggleThemeBtn")) $("toggleThemeBtn").addEventListener("click", cycleTableTheme);
if ($("toggleTileMaterialBtn")) $("toggleTileMaterialBtn").addEventListener("click", toggleTileMaterial);
if ($("toggleFullscreenBtn")) $("toggleFullscreenBtn").addEventListener("click", toggleFullscreen);

// Iniciar partida al cargar y configurar nombre
setMyPlayerName(getMyPlayerName());
startGame();
updateBluetoothUI();

// Detección automática al abrir enlace QR en celular (?join=BT-XXXX)
if (typeof window !== 'undefined' && window.location.search) {
  const urlParams = new URLSearchParams(window.location.search);
  const autoJoinPin = urlParams.get('join');
  if (autoJoinPin) {
    setTimeout(() => {
      promptQuickJoin(autoJoinPin);
    }, 600);
  }
}

// Exportar globalmente funciones maestras para integración con BOOKFORCE SaaS
if (typeof window !== 'undefined') {
  window.startGame = startGame;
  window.initGame = startGame;
  window.startDominoGame = startGame;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.openGameModal = openModal;
  window.closeGameModal = closeModal;
  window.openQrModal = openQrModal;
  window.updateHostNameAndQr = updateHostNameAndQr;
  window.generateNewQrRoom = generateNewQrRoom;
  window.copyQrLink = copyQrLink;
  window.handleJoinWirelessRoom = handleJoinWirelessRoom;
  window.confirmQuickJoin = confirmQuickJoin;
  window.setMyPlayerName = setMyPlayerName;
  window.getMyPlayerName = getMyPlayerName;
  window.selectLevel = selectLevel;
  window.speakWord = speakWord;
  window.toggleDominoBoardVisualizer = toggleDominoBoardVisualizer;
  window.renderDominoBoard28 = renderDominoBoard28;
}

