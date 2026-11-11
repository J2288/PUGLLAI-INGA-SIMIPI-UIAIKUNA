/**
 * Yachana Dominó - Lógica de Juego y Dominó Tradicional
 * Basado en las reglas oficiales del documento técnico (págs. 3, 5 y 6)
 */

// Formatos visuales para las mitades de ficha: 'inga' (palabra oficial en lengua Inga), 'es' (español), 'icon' (dibujo/svg)
const VISUAL_MODES = ['inga', 'es', 'icon'];

function randomVisualMode() {
  const roll = Math.random();
  // Priorizar fuertemente la lengua Inga oficial como en el dominó real (75%)
  if (roll < 0.75) return 'inga';
  if (roll < 0.90) return 'es';
  return 'icon';
}

/**
 * Crea la baraja de dominó con pares no ordenados de conceptos (triangular N*(N+1)/2)
 */
function createDeck(concepts, assignVisuals = true) {
  const deck = [];
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'tile_' + Math.random().toString(36).substring(2, 9);
  };

  for (let i = 0; i < concepts.length; i++) {
    for (let j = i; j < concepts.length; j++) {
      const leftConcept = concepts[i];
      const rightConcept = concepts[j];
      const isDouble = (leftConcept.id === rightConcept.id);

      // Determinar modo visual de cada mitad para enriquecer el aprendizaje
      let leftMode = assignVisuals ? randomVisualMode() : 'inga';
      let rightMode = assignVisuals ? randomVisualMode() : 'es';
      
      // Si ambos son del mismo concepto (doble), alternar para enriquecer la asociación
      if (isDouble && leftMode === rightMode) {
        rightMode = (leftMode === 'inga') ? 'icon' : 'inga';
      }

      deck.push({
        id: generateId(),
        left: leftConcept,
        right: rightConcept,
        leftVisual: leftMode,
        rightVisual: rightMode,
        isDouble: isDouble,
        orientation: isDouble ? 'vertical' : 'horizontal'
      });
    }
  }
  return deck;
}

/**
 * Baraja las fichas usando el algoritmo Fisher-Yates
 */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Verifica si una ficha puede conectarse con un concepto extremo
 */
function canConnect(tile, endpoint) {
  if (!endpoint || !tile) return false;
  return tile.left.id === endpoint.id || tile.right.id === endpoint.id;
}

/**
 * Orienta la ficha para que su lado coincida con el extremo deseado
 * @param {Object} tile - La ficha a colocar
 * @param {Object} endpoint - El concepto del extremo del tablero
 * @param {string} side - 'leftEnd' (extremo izquierdo) o 'rightEnd' (extremo derecho)
 */
function orientTile(tile, endpoint, side = 'rightEnd') {
  if (!endpoint) return tile;

  if (side === 'rightEnd') {
    // Para el extremo derecho, el lado 'left' de la nueva ficha debe coincidir con el extremo
    if (tile.left.id === endpoint.id) {
      return { ...tile };
    }
    return {
      ...tile,
      left: tile.right,
      right: tile.left,
      leftVisual: tile.rightVisual,
      rightVisual: tile.leftVisual
    };
  } else {
    // Para el extremo izquierdo, el lado 'right' de la nueva ficha debe coincidir con el extremo
    if (tile.right.id === endpoint.id) {
      return { ...tile };
    }
    return {
      ...tile,
      left: tile.right,
      right: tile.left,
      leftVisual: tile.rightVisual,
      rightVisual: tile.leftVisual
    };
  }
}

/**
 * Encuentra qué fichas de una mano pueden jugarse dada la cadena actual
 */
function getPlayableTiles(hand, chain) {
  if (!chain || chain.length === 0) {
    return hand.map((tile, index) => ({ tile, index, canLeft: true, canRight: true }));
  }

  const leftEnd = chain[0].left;
  const rightEnd = chain[chain.length - 1].right;

  const playable = [];
  hand.forEach((tile, index) => {
    const canLeft = canConnect(tile, leftEnd);
    const canRight = canConnect(tile, rightEnd);
    if (canLeft || canRight) {
      playable.push({ tile, index, canLeft, canRight });
    }
  });

  return playable;
}

/**
 * Calcula el valor en mano de un jugador (número de fichas o peso semántico)
 */
function calculateHandWeight(hand) {
  return hand.length;
}

/**
 * Inteligencia Artificial para el rival (Sabio Kindi)
 */
function chooseBotMove(botHand, chain) {
  const playable = getPlayableTiles(botHand, chain);
  if (playable.length === 0) return null;

  // Prioridad 1: Jugar dobles para ganar bonificación y dominio
  const doublePlay = playable.find(p => p.tile.isDouble);
  if (doublePlay) {
    return {
      ...doublePlay,
      targetEnd: doublePlay.canRight ? 'rightEnd' : 'leftEnd'
    };
  }

  // Prioridad 2: Elegir aleatoriamente entre las válidas
  const chosen = playable[Math.floor(Math.random() * playable.length)];
  return {
    ...chosen,
    targetEnd: chosen.canRight ? 'rightEnd' : 'leftEnd'
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VISUAL_MODES,
    randomVisualMode,
    createDeck,
    shuffle,
    canConnect,
    orientTile,
    getPlayableTiles,
    calculateHandWeight,
    chooseBotMove
  };
}

