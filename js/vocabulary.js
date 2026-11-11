/**
 * PUGLLAI INGA SIMIPI UIAIKUNA - Vocabulario Oficial de la Lengua Inga
 * Baraja Oficial Tradicional de 28 Fichas de Dominó (Doble Seis: 0 a 6)
 * Basado en el conjunto patrimonial auténtico del pueblo Inga (Putumayo / Sibundoy).
 * 
 * Cada concepto posee:
 *  - id: Identificador único
 *  - inga: Palabra / frase en lengua Inga (en mayúsculas oficiales)
 *  - es: Traducción al Español
 *  - phonetic: Guía fonética para pronunciación andina
 *  - value: Valor numérico oficial de dominó (0 al 6)
 *  - dotName: Nombre tradicional del valor ('Blanco', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis')
 *  - color: Color representativo según la fila oficial de la baraja
 *  - icon: Representación gráfica / emoji
 *  - category: Categoría semántica y cultural
 *  - level: Nivel curricular (1 para la baraja oficial de 28 fichas)
 *  - funFact: Significado cultural y pedagógico en la cosmovisión Inga
 */

// 1. LOS 7 CONCEPTOS MAESTROS DE LA BARAJA OFICIAL (VALORES 0 AL 6)
const INGA_DOMINO_CONCEPTS = [
  {
    id: "alku",
    inga: "ALKU",
    displayLines: ["ALKU"],
    es: "Perro",
    tileEs: "Perro",
    phonetic: "ahl-koo",
    value: 0,
    dotName: "Blanco",
    color: "#8B002B", // Carmesí / Vinotinto oficial Fila Blanco
    icon: "🐕",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="14" fill="#C28340"/><ellipse cx="10" cy="18" rx="3" ry="8" fill="#7A4B1A"/><ellipse cx="30" cy="18" rx="3" ry="8" fill="#7A4B1A"/><circle cx="16" cy="18" r="2" fill="#000"/><circle cx="24" cy="18" r="2" fill="#000"/><ellipse cx="20" cy="24" rx="4" ry="3" fill="#000"/></svg>`,
    category: "animales y guardianes",
    level: 1,
    funFact: "En la comunidad Inga, ALKU es el leal guardián del hogar, protector de la chagra familiar y compañero en los senderos andinos."
  },
  {
    id: "killa",
    inga: "KILLA",
    displayLines: ["KILLA"],
    es: "Luna / Mes",
    tileEs: "Luna",
    phonetic: "kee-lyah",
    value: 1,
    dotName: "Uno",
    color: "#D97706", // Dorado / Amarillo oficial Fila Uno
    icon: "🌙",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><path d="M26,8 C16,9 12,20 18,29 C24,36 32,31 32,31 C20,33 12,23 16,14 C18,10 22,8 26,8 Z" fill="#F59E0B"/></svg>`,
    category: "astronomía y tiempo",
    level: 1,
    funFact: "KILLA representa la Luna y el ciclo mensual. Sus fases guían las épocas sagradas de siembra y cosecha en el Valle de Sibundoy."
  },
  {
    id: "sugratukama",
    inga: "SUGRATUKAMA",
    displayLines: ["SUGRATUKAMA"],
    es: "Hasta luego / Hasta otra ocasión",
    tileEs: "Hasta luego",
    phonetic: "soo-grah-too-kah-mah",
    value: 2,
    dotName: "Dos",
    color: "#16A34A", // Verde oficial Fila Dos
    icon: "👋",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="15" fill="#16A34A"/><text x="20" y="27" font-size="18" font-weight="900" fill="#FFFFFF" text-anchor="middle">👋</text></svg>`,
    category: "saludos y respeto",
    level: 1,
    funFact: "Despedida respetuosa comunitaria ('sug' = otro, 'tukama' = hasta). Expresa el deseo fraterno de volverse a encontrar en armonía."
  },
  {
    id: "chunga_i_sugta",
    inga: "CHUNGA I SUGTA",
    displayLines: ["CHUNGA", "I SUGTA"],
    es: "Dieciséis (16)",
    tileEs: "Dieciséis",
    phonetic: "choon-gah ee soog-tah",
    value: 3,
    dotName: "Tres",
    color: "#0284C7", // Azul oficial Fila Tres
    icon: "🔢",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><rect x="5" y="5" width="30" height="30" rx="8" fill="#0284C7"/><text x="20" y="26" font-size="15" font-weight="900" fill="#FFFFFF" text-anchor="middle">16</text></svg>`,
    category: "números andinos",
    level: 1,
    funFact: "Sistema numérico tradicional: 'chunga' (diez) + 'i' (y) + 'sugta' (seis) = 16. Muestra la base decimal y aditiva de la matemática Inga."
  },
  {
    id: "nuka_kani",
    inga: "NUKA KANI",
    displayLines: ["NUKA", "KANI"],
    es: "Yo soy",
    tileEs: "Yo soy",
    phonetic: "nyoo-kah kah-nee",
    value: 4,
    dotName: "Cuatro",
    color: "#7C3AED", // Morado / Púrpura oficial Fila Cuatro
    icon: "🙋",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="15" fill="#7C3AED"/><text x="20" y="27" font-size="18" font-weight="900" fill="#FFFFFF" text-anchor="middle">🙋</text></svg>`,
    category: "identidad y ser",
    level: 1,
    funFact: "Fórmula de autoafirmación de la identidad personal y cultural: 'Nuka kani Inga' (Yo soy Inga). Refuerza la dignidad y pertenencia ancestral."
  },
  {
    id: "mamasinura",
    inga: "MAMASIÑURA",
    displayLines: ["MAMASIÑURA"],
    es: "Señora / Abuela / Matriarca",
    tileEs: "Abuela",
    phonetic: "mah-mah-see-nyoo-rah",
    value: 5,
    dotName: "Cinco",
    color: "#EC4899", // Rosa / Fucsia oficial Fila Cinco
    icon: "👵",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="15" fill="#EC4899"/><text x="20" y="27" font-size="18" font-weight="900" fill="#FFFFFF" text-anchor="middle">👵</text></svg>`,
    category: "familia y comunidad",
    level: 1,
    funFact: "Término de alto respeto para las abuelas y madres mayores, transmisoras de la lengua materna, los cantos sagrados y la medicina tradicional."
  },
  {
    id: "asua",
    inga: "ASUA",
    displayLines: ["ASUA"],
    es: "Chicha",
    tileEs: "Chicha",
    phonetic: "ah-swah",
    value: 6,
    dotName: "Seis",
    color: "#B45309", // Ámbar / Chicha sagrada de maíz (Doble Mayor 6-6)
    icon: "🏺",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><path d="M14,10 L26,10 L28,16 C30,22 28,30 20,32 C12,30 10,22 12,16 Z" fill="#B45309"/><ellipse cx="20" cy="10" rx="6" ry="2" fill="#F59E0B"/></svg>`,
    category: "bebida sagrada",
    level: 1,
    funFact: "Bebida ancestral sagrada de maíz fermentado (sara). Símbolo de hospitalidad y unión en el Bëtscnathë (Carnaval del Perdón). Ficha Doble Mayor (6-6)."
  }
];

// 2. VOCABULARIO COMPLETO DEL SISTEMA (NIVEL 1 OFICIAL + NIVELES PEDAGÓGICOS COMPLEMENTARIOS)
const VOCABULARY = [
  ...INGA_DOMINO_CONCEPTS,

  // NIVEL 2 COMPLEMENTARIO: ANIMALES Y ENTORNO
  {
    id: "sancha",
    inga: "SANCHA",
    displayLines: ["SANCHA"],
    es: "Cuy",
    tileEs: "Cuy",
    phonetic: "sahn-chah",
    icon: "🐹",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="22" r="14" fill="#FF7B1C"/><circle cx="16" cy="20" r="2" fill="#302832"/><circle cx="24" cy="20" r="2" fill="#302832"/></svg>`,
    category: "animales",
    level: 2,
    funFact: "En la lengua y tradición Inga, el cuy se denomina sancha, criado en los hogares andinos y la tulpa."
  },
  {
    id: "misitu",
    inga: "MISITU",
    displayLines: ["MISITU"],
    es: "Gato",
    tileEs: "Gato",
    phonetic: "mee-see-too",
    icon: "🐱",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="22" r="13" fill="#12B5CB"/></svg>`,
    category: "animales",
    level: 2,
    funFact: "Misitu es el nombre tradicional y cariñoso para el gato en lengua Inga, ágil compañero del hogar."
  },
  {
    id: "kindi",
    inga: "KINDI",
    displayLines: ["KINDI"],
    es: "Colibrí / Picaflor",
    tileEs: "Colibrí",
    phonetic: "keen-dee",
    icon: "🐦",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="14" fill="#0284C7"/><polygon points="26,16 38,12 28,22" fill="#38BDF8"/><circle cx="17" cy="17" r="2" fill="#FFF"/></svg>`,
    category: "aves sagradas",
    level: 2,
    funFact: "Kindi es el colibrí sagrado en la cosmovisión andina, veloz mensajero de sabiduría, luz y armonía."
  },

  // NIVEL 3 COMPLEMENTARIO: NATURALEZA Y ALIMENTOS
  {
    id: "inti",
    inga: "INTI",
    displayLines: ["INTI"],
    es: "Sol",
    tileEs: "Sol",
    phonetic: "een-tee",
    icon: "☀️",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="9" fill="#FFC629"/></svg>`,
    category: "naturaleza",
    level: 3,
    funFact: "Inti da vida y energía a los cultivos de maíz y frijol."
  },
  {
    id: "iaku",
    inga: "IAKU",
    displayLines: ["IAKU"],
    es: "Agua",
    tileEs: "Agua",
    phonetic: "ee-ah-koo",
    icon: "💧",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><circle cx="20" cy="20" r="10" fill="#12B5CB"/></svg>`,
    category: "naturaleza",
    level: 3,
    funFact: "Iaku es el agua limpia y sagrada que brota desde los páramos andinos hacia la selva del Putumayo."
  },
  {
    id: "ruku_sacha",
    inga: "RUKU SACHA",
    displayLines: ["RUKU", "SACHA"],
    es: "Montaña / Selva Ancestral",
    tileEs: "Montaña",
    phonetic: "roo-koo sah-chah",
    icon: "⛰️",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><polygon points="20,8 34,34 6,34" fill="#35B86B"/></svg>`,
    category: "naturaleza",
    level: 3,
    funFact: "Ruku sacha representa la montaña sagrada y la selva ancestral que resguarda la medicina y memoria Inga."
  },
  {
    id: "sara",
    inga: "SARA",
    displayLines: ["SARA"],
    es: "Maíz",
    tileEs: "Maíz",
    phonetic: "sah-rah",
    icon: "🌽",
    svg: `<svg viewBox="0 0 40 40" width="28" height="28"><ellipse cx="20" cy="20" rx="8" ry="14" fill="#FFC629"/></svg>`,
    category: "alimentos",
    level: 3,
    funFact: "El maíz es el sustento central, base de la chicha (asua) y la vida comunitaria."
  },

  // NIVEL 2 COMPLEMENTARIO: HOGAR Y FAMILIA
  {
    id: "wawa",
    inga: "WAWA",
    displayLines: ["WAWA"],
    es: "Niño / Niña / Bebé",
    tileEs: "Niño",
    phonetic: "wah-wah",
    icon: "👶",
    category: "familia",
    level: 2,
    funFact: "En la comunidad Inga, los niños y niñas son la alegría y el renuevo sagrado de la comunidad."
  },
  {
    id: "wasi",
    inga: "WASI",
    displayLines: ["WASI"],
    es: "Casa / Hogar",
    tileEs: "Casa",
    phonetic: "wah-see",
    icon: "🏡",
    category: "hogar",
    level: 2,
    funFact: "El hogar Inga es el espacio sagrado del fogón (tulpa) donde se comparten historias y consejos."
  },

  // NIVEL 3 COMPLEMENTARIO: ELEMENTOS SAGRADOS
  {
    id: "nina",
    inga: "NINA",
    displayLines: ["NINA"],
    es: "Fuego sagrado",
    tileEs: "Fuego",
    phonetic: "nee-nah",
    icon: "🔥",
    category: "naturaleza",
    level: 3,
    funFact: "El fuego sagrado de la tulpa calienta la casa y purifica los pensamientos de la familia."
  },
  {
    id: "wayra",
    inga: "WAYRA",
    displayLines: ["WAYRA"],
    es: "Viento andino",
    tileEs: "Viento",
    phonetic: "why-rah",
    icon: "💨",
    category: "naturaleza",
    level: 3,
    funFact: "El viento andino refresca las siembras y transporta las semillas por los valles sagrados."
  },
  {
    id: "allpa",
    inga: "ALLPA",
    displayLines: ["ALLPA"],
    es: "Madre Tierra / Suelo fértil",
    tileEs: "Tierra",
    phonetic: "ahl-pah",
    icon: "🌱",
    category: "naturaleza",
    level: 3,
    funFact: "La Allpa sagrada es la madre que alimenta los cultivos y sostiene la vida comunitaria."
  },

  // NIVEL 4 COMPLEMENTARIO: SALUDOS Y TERRITORIO
  {
    id: "alli_puncha",
    inga: "ALLI PUNCHA",
    displayLines: ["ALLI", "PUNCHA"],
    es: "Buenos días",
    tileEs: "Buenos días",
    phonetic: "ah-lyee poon-chah",
    icon: "🌅",
    category: "saludos",
    level: 4,
    funFact: "Saludo tradicional al comenzar el día, deseando claridad, salud y armonía comunitaria."
  },
  {
    id: "alli_chishi",
    inga: "ALLI CHISHI",
    displayLines: ["ALLI", "CHISHI"],
    es: "Buenas tardes",
    tileEs: "Buenas tardes",
    phonetic: "ah-lyee chee-shee",
    icon: "🌇",
    category: "saludos",
    level: 4,
    funFact: "Saludo cordial al atardecer cuando las familias regresan del trabajo en la chagra."
  },
  {
    id: "alli_tuta",
    inga: "ALLI TUTA",
    displayLines: ["ALLI", "TUTA"],
    es: "Buenas noches",
    tileEs: "Buenas noches",
    phonetic: "ah-lyee too-tah",
    icon: "🌌",
    category: "saludos",
    level: 4,
    funFact: "Despedida respetuosa de la noche bajo la protección de Killa (la Luna)."
  },
  {
    id: "punuy",
    inga: "PUÑUY",
    displayLines: ["PUÑUY"],
    es: "Dormir / Descansar",
    tileEs: "Descansar",
    phonetic: "poo-nyooy",
    icon: "💤",
    category: "cotidiano",
    level: 4,
    funFact: "El descanso reparador que renueva la fuerza espiritual y corporal para la siguiente jornada."
  },

  // NIVEL 5 COMPLEMENTARIO: NÚMEROS ANDINOS
  {
    id: "shuk",
    inga: "SHUK",
    displayLines: ["SHUK"],
    es: "Uno (1)",
    tileEs: "Uno",
    phonetic: "shook",
    icon: "☝️",
    category: "números",
    level: 5,
    funFact: "Primer número andino, símbolo de unidad y origen de todas las cosas en el cosmos."
  },
  {
    id: "ishkay",
    inga: "ISHKAY",
    displayLines: ["ISHKAY"],
    es: "Dos (2)",
    tileEs: "Dos",
    phonetic: "eesh-kai",
    icon: "✌️",
    category: "números",
    level: 5,
    funFact: "Principio de dualidad andina: día y noche, sol y luna, hombre y mujer en equilibrio."
  },
  {
    id: "kimsa",
    inga: "KIMSA",
    displayLines: ["KIMSA"],
    es: "Tres (3)",
    tileEs: "Tres",
    phonetic: "keem-sah",
    icon: "🤟",
    category: "números",
    level: 5,
    funFact: "Los tres mundos de la cosmovisión: el mundo de arriba (Hanan), el presente (Kay) y el interior (Uku)."
  },
  {
    id: "chusku",
    inga: "CHUSKU",
    displayLines: ["CHUSKU"],
    es: "Cuatro (4)",
    tileEs: "Cuatro",
    phonetic: "choos-koo",
    icon: "🖐️",
    category: "números",
    level: 5,
    funFact: "Los cuatro puntos cardinales y los cuatro suyos que orientan el territorio ancestral."
  },
  {
    id: "pichika",
    inga: "PICHIKA",
    displayLines: ["PICHIKA"],
    es: "Cinco (5)",
    tileEs: "Cinco",
    phonetic: "pee-chee-kah",
    icon: "✋",
    category: "números",
    level: 5,
    funFact: "Los cinco dedos de la mano trabajadora y las cinco virtudes comunitarias."
  },
  {
    id: "sukta",
    inga: "SUKTA",
    displayLines: ["SUKTA"],
    es: "Seis (6)",
    tileEs: "Seis",
    phonetic: "soog-tah",
    icon: "👌",
    category: "números",
    level: 5,
    funFact: "Número sagrado del equilibrio comunal y culminación del ciclo semanal de la chagra."
  },

  // NIVEL 6 COMPLEMENTARIO: SABIDURÍA ANCESTRAL Y COMUNIDAD
  {
    id: "taita",
    inga: "TAITA",
    displayLines: ["TAITA"],
    es: "Padre / Sabio tradicional",
    tileEs: "Taita / Sabio",
    phonetic: "tai-tah",
    icon: "👴",
    category: "sabiduría",
    level: 6,
    funFact: "Autoridad espiritual, conocedor de las plantas medicinales y guía moral del pueblo Inga."
  },
  {
    id: "yachachij",
    inga: "YACHACHIJ",
    displayLines: ["YACHACHIJ"],
    es: "Maestro / Educador",
    tileEs: "Maestro",
    phonetic: "yah-chah-cheej",
    icon: "👨‍🏫",
    category: "educación",
    level: 6,
    funFact: "El docente o sabio que transmite con amor la lengua materna y las tradiciones ancestrales."
  },
  {
    id: "yachana",
    inga: "YACHANA",
    displayLines: ["YACHANA"],
    es: "Aprender / Sabiduría",
    tileEs: "Aprender",
    phonetic: "yah-chah-nah",
    icon: "📚",
    category: "educación",
    level: 6,
    funFact: "Nombre sagrado de nuestro juego: aprender jugando en comunidad con respeto y alegría."
  },
  {
    id: "sumaj_kawsay",
    inga: "SUMAJ KAWSAY",
    displayLines: ["SUMAJ", "KAWSAY"],
    es: "Buen Vivir",
    tileEs: "Buen Vivir",
    phonetic: "soo-mahk kow-sigh",
    icon: "🌈",
    category: "cosmovisión",
    level: 6,
    funFact: "Filosofía andina de vida en plenitud, armonía con la Madre Tierra y solidaridad comunitaria."
  },
  {
    id: "ayllu",
    inga: "AYLLU",
    displayLines: ["AYLLU"],
    es: "Comunidad / Familia extensa",
    tileEs: "Comunidad",
    phonetic: "eye-lyoo",
    icon: "👨‍👩‍👧‍👦",
    category: "comunidad",
    level: 6,
    funFact: "La gran familia comunitaria donde todos se apoyan en mingas y celebraciones sagradas."
  }
];

// 3. REGISTRO OFICIAL DE LAS 28 FICHAS DE DOMINÓ (IDÉNTICO A LA FOTOGRAFÍA PATRIMONIAL)
// Fila por Fila: Blanco (7 fichas), Uno (6 fichas), Dos (5 fichas), Tres (4 fichas), Cuatro (3 fichas), Cinco y Seis (3 fichas) = Total 28 Fichas
const DOMINO_OFFICIAL_SET_28 = [
  // FILA BLANCO (Valor 0 · 7 Fichas)
  { id: "tile_0_0", rowName: "Blanco", rowValue: 0, leftId: "alku", rightId: "alku", leftText: "ALKU", rightText: "ALKU", leftVal: 0, rightVal: 0, isDouble: true },
  { id: "tile_1_0", rowName: "Blanco", rowValue: 0, leftId: "killa", rightId: "alku", leftText: "KILLA", rightText: "ALKU", leftVal: 1, rightVal: 0, isDouble: false },
  { id: "tile_2_0", rowName: "Blanco", rowValue: 0, leftId: "sugratukama", rightId: "alku", leftText: "SUGRATUKAMA", rightText: "ALKU", leftVal: 2, rightVal: 0, isDouble: false },
  { id: "tile_3_0", rowName: "Blanco", rowValue: 0, leftId: "chunga_i_sugta", rightId: "alku", leftText: "CHUNGA I SUGTA", rightText: "ALKU", leftVal: 3, rightVal: 0, isDouble: false },
  { id: "tile_4_0", rowName: "Blanco", rowValue: 0, leftId: "nuka_kani", rightId: "alku", leftText: "NUKA KANI", rightText: "ALKU", leftVal: 4, rightVal: 0, isDouble: false },
  { id: "tile_5_0", rowName: "Blanco", rowValue: 0, leftId: "mamasinura", rightId: "alku", leftText: "MAMASIÑURA", rightText: "ALKU", leftVal: 5, rightVal: 0, isDouble: false },
  { id: "tile_6_0", rowName: "Blanco", rowValue: 0, leftId: "asua", rightId: "alku", leftText: "ASUA", rightText: "ALKU", leftVal: 6, rightVal: 0, isDouble: false },

  // FILA UNO (Valor 1 · 6 Fichas)
  { id: "tile_1_1", rowName: "Uno", rowValue: 1, leftId: "killa", rightId: "killa", leftText: "KILLA", rightText: "KILLA", leftVal: 1, rightVal: 1, isDouble: true },
  { id: "tile_1_2", rowName: "Uno", rowValue: 1, leftId: "killa", rightId: "sugratukama", leftText: "KILLA", rightText: "SUGRATUKAMA", leftVal: 1, rightVal: 2, isDouble: false },
  { id: "tile_1_3", rowName: "Uno", rowValue: 1, leftId: "killa", rightId: "chunga_i_sugta", leftText: "KILLA", rightText: "CHUNGA I SUGTA", leftVal: 1, rightVal: 3, isDouble: false },
  { id: "tile_1_4", rowName: "Uno", rowValue: 1, leftId: "killa", rightId: "nuka_kani", leftText: "KILLA", rightText: "NUKA KANI", leftVal: 1, rightVal: 4, isDouble: false },
  { id: "tile_1_5", rowName: "Uno", rowValue: 1, leftId: "killa", rightId: "mamasinura", leftText: "KILLA", rightText: "MAMASIÑURA", leftVal: 1, rightVal: 5, isDouble: false },
  { id: "tile_1_6", rowName: "Uno", rowValue: 1, leftId: "killa", rightId: "asua", leftText: "KILLA", rightText: "ASUA", leftVal: 1, rightVal: 6, isDouble: false },

  // FILA DOS (Valor 2 · 5 Fichas)
  { id: "tile_2_2", rowName: "Dos", rowValue: 2, leftId: "sugratukama", rightId: "sugratukama", leftText: "SUGRATUKAMA", rightText: "SUGRATUKAMA", leftVal: 2, rightVal: 2, isDouble: true },
  { id: "tile_2_3", rowName: "Dos", rowValue: 2, leftId: "sugratukama", rightId: "chunga_i_sugta", leftText: "SUGRATUKAMA", rightText: "CHUNGA I SUGTA", leftVal: 2, rightVal: 3, isDouble: false },
  { id: "tile_2_4", rowName: "Dos", rowValue: 2, leftId: "sugratukama", rightId: "nuka_kani", leftText: "SUGRATUKAMA", rightText: "NUKA KANI", leftVal: 2, rightVal: 4, isDouble: false },
  { id: "tile_2_5", rowName: "Dos", rowValue: 2, leftId: "sugratukama", rightId: "mamasinura", leftText: "SUGRATUKAMA", rightText: "MAMASIÑURA", leftVal: 2, rightVal: 5, isDouble: false },
  { id: "tile_2_6", rowName: "Dos", rowValue: 2, leftId: "sugratukama", rightId: "asua", leftText: "SUGRATUKAMA", rightText: "ASUA", leftVal: 2, rightVal: 6, isDouble: false },

  // FILA TRES (Valor 3 · 4 Fichas)
  { id: "tile_3_3", rowName: "Tres", rowValue: 3, leftId: "chunga_i_sugta", rightId: "chunga_i_sugta", leftText: "CHUNGA I SUGTA", rightText: "CHUNGA I SUGTA", leftVal: 3, rightVal: 3, isDouble: true },
  { id: "tile_3_4", rowName: "Tres", rowValue: 3, leftId: "chunga_i_sugta", rightId: "nuka_kani", leftText: "CHUNGA I SUGTA", rightText: "NUKA KANI", leftVal: 3, rightVal: 4, isDouble: false },
  { id: "tile_3_5", rowName: "Tres", rowValue: 3, leftId: "chunga_i_sugta", rightId: "mamasinura", leftText: "CHUNGA I SUGTA", rightText: "MAMASIÑURA", leftVal: 3, rightVal: 5, isDouble: false },
  { id: "tile_3_6", rowName: "Tres", rowValue: 3, leftId: "chunga_i_sugta", rightId: "asua", leftText: "CHUNGA I SUGTA", rightText: "ASUA", leftVal: 3, rightVal: 6, isDouble: false },

  // FILA CUATRO (Valor 4 · 3 Fichas)
  { id: "tile_4_4", rowName: "Cuatro", rowValue: 4, leftId: "nuka_kani", rightId: "nuka_kani", leftText: "NUKA KANI", rightText: "NUKA KANI", leftVal: 4, rightVal: 4, isDouble: true },
  { id: "tile_4_5", rowName: "Cuatro", rowValue: 4, leftId: "nuka_kani", rightId: "mamasinura", leftText: "NUKA KANI", rightText: "MAMASIÑURA", leftVal: 4, rightVal: 5, isDouble: false },
  { id: "tile_4_6", rowName: "Cuatro", rowValue: 4, leftId: "nuka_kani", rightId: "asua", leftText: "NUKA KANI", rightText: "ASUA", leftVal: 4, rightVal: 6, isDouble: false },

  // FILA CINCO Y SEIS (Valor 5 y 6 · 3 Fichas)
  { id: "tile_5_5", rowName: "Cinco", rowValue: 5, leftId: "mamasinura", rightId: "mamasinura", leftText: "MAMASIÑURA", rightText: "MAMASIÑURA", leftVal: 5, rightVal: 5, isDouble: true },
  { id: "tile_5_6", rowName: "Cinco", rowValue: 5, leftId: "mamasinura", rightId: "asua", leftText: "MAMASIÑURA", rightText: "ASUA", leftVal: 5, rightVal: 6, isDouble: false },
  { id: "tile_6_6", rowName: "Cinco", rowValue: 6, leftId: "asua", rightId: "asua", leftText: "ASUA", rightText: "ASUA", leftVal: 6, rightVal: 6, isDouble: true } // Doble Mayor (6-6)
];

// 4. CONFIGURACIÓN COMPLETA DE LOS 6 NIVELES CURRICULARES OFICIALES
const LEVELS = [
  { 
    id: 1, 
    ingaName: "Shuk",
    name: "Baraja Oficial Inga (28 Fichas)", 
    theme: "7 Conceptos Patrimoniales (0 al 6: ALKU a ASUA)", 
    conceptsCount: 7, 
    deckSize: 28,
    age: "Todos los niveles · Iniciación y Torneo", 
    description: "La auténtica baraja patrimonial de dominó Doble-Seis completa (28 fichas), idéntica al juego físico original.",
    conceptIds: ["alku", "killa", "sugratukama", "chunga_i_sugta", "nuka_kani", "mamasinura", "asua"]
  },
  { 
    id: 2, 
    ingaName: "Ishkay",
    name: "Fauna y Hogar Andino", 
    theme: "Animales domésticos y protectores del hogar", 
    conceptsCount: 7, 
    deckSize: 28,
    age: "6 a 9 años · Primaria básica", 
    description: "Vocabulario de los seres queridos y compañeros del hogar en la cosmovisión Inga (Sancha, Misitu, Alku, Kindi, Wawa, Wasi, Killa).",
    conceptIds: ["sancha", "misitu", "alku", "kindi", "wawa", "wasi", "killa"]
  },
  { 
    id: 3, 
    ingaName: "Kimsa",
    name: "Naturaleza y Elementos Sagrados", 
    theme: "El agua limpia, el sol, el maíz y la chagra", 
    conceptsCount: 7, 
    deckSize: 28,
    age: "8 a 11 años · Primaria intermedia", 
    description: "Conexión con los elementos sagrados de la naturaleza y la soberanía alimentaria de la chagra (Iaku, Inti, Sara, Nina, Wayra, Allpa, Asua).",
    conceptIds: ["iaku", "inti", "sara", "nina", "wayra", "allpa", "asua"]
  },
  { 
    id: 4, 
    ingaName: "Chusku",
    name: "Territorio, Saludos y Respeto", 
    theme: "Saludos comunitarios, cortesía y la montaña ancestral", 
    conceptsCount: 7, 
    deckSize: 28,
    age: "10 a 13 años · Básica secundaria", 
    description: "Fórmulas tradicionales de saludo comunitario, respeto mutuo y recorrido por la montaña ancestral (Ruku Sacha, Sugratukama, Alli Puncha, Alli Chishi, Alli Tuta, Puñuy, Alku).",
    conceptIds: ["ruku_sacha", "sugratukama", "alli_puncha", "alli_chishi", "alli_tuta", "punuy", "alku"]
  },
  { 
    id: 5, 
    ingaName: "Pichika",
    name: "Números Andinos e Identidad", 
    theme: "Sistema numérico decimal Inga y autoafirmación", 
    conceptsCount: 7, 
    deckSize: 28,
    age: "12 a 15 años · Secundaria", 
    description: "Estructura matemática andina de conteo decimal y autoafirmación de la identidad cultural propia (Nuka Kani, Shuk, Ishkay, Kimsa, Chusku, Pichika, Sukta).",
    conceptIds: ["nuka_kani", "shuk", "ishkay", "kimsa", "chusku", "pichika", "sukta"]
  },
  { 
    id: 6, 
    ingaName: "Sukta",
    name: "Sabiduría, Cosmovisión y Buen Vivir", 
    theme: "Sabios mayores, convivencia armónica y comunidad", 
    conceptsCount: 7, 
    deckSize: 28,
    age: "14 a 17 años · Secundaria y Media", 
    description: "Máximo nivel de inmersión cultural: transmisión oral de saberes ancestrales, comunidad y Sumaj Kawsay (Mamasiñura, Taita, Yachachij, Yachana, Sumaj Kawsay, Ayllu, Kindi).",
    conceptIds: ["mamasinura", "taita", "yachachij", "yachana", "sumaj_kawsay", "ayllu", "kindi"]
  }
];

const DOMINO_RANK_COLORS = [
  "#8B002B", // 0: Blanco (Carmesí oficial Fila 0)
  "#D97706", // 1: Uno (Dorado / Ámbar Fila 1)
  "#16A34A", // 2: Dos (Verde Esmeralda Fila 2)
  "#0284C7", // 3: Tres (Azul Cielo Fila 3)
  "#7C3AED", // 4: Cuatro (Púrpura / Morado Fila 4)
  "#EC4899", // 5: Cinco (Rosa / Fucsia Fila 5)
  "#B45309"  // 6: Seis (Marrón Ámbar / Chicha Doble Mayor Fila 6)
];
const DOMINO_DOT_NAMES = ["Blanco", "Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis"];

// Función para obtener conceptos según el nivel elegido (Garantiza siempre 7 conceptos con rangos 0 a 6)
function getVocabularyForLevel(level = 1) {
  const lvl = Number(level);
  if (lvl === 1) {
    // Retorna exactamente los 7 conceptos maestros oficiales para generar las 28 fichas
    return INGA_DOMINO_CONCEPTS;
  }
  const targetLevel = LEVELS.find(l => l.id === lvl);
  if (targetLevel && targetLevel.conceptIds) {
    const list = targetLevel.conceptIds
      .map((id, idx) => {
        const raw = getConceptById(id);
        if (!raw) return null;
        return {
          ...raw,
          value: idx,
          dotName: DOMINO_DOT_NAMES[idx] || `Valor ${idx}`,
          color: DOMINO_RANK_COLORS[idx] || '#8B002B'
        };
      })
      .filter(Boolean);
    if (list.length >= 5) return list;
  }
  return INGA_DOMINO_CONCEPTS;
}

// Obtener un concepto por su valor de dominó (0 al 6)
function getConceptByValue(val) {
  return INGA_DOMINO_CONCEPTS.find(c => c.value === Number(val)) || null;
}

// Obtener un concepto por su ID
function getConceptById(id) {
  return VOCABULARY.find(c => c.id === id) || null;
}

// Exportación para compatibilidad Node.js / Express y Navegador Web
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INGA_DOMINO_CONCEPTS,
    VOCABULARY,
    DOMINO_OFFICIAL_SET_28,
    LEVELS,
    DOMINO_RANK_COLORS,
    DOMINO_DOT_NAMES,
    getVocabularyForLevel,
    getConceptByValue,
    getConceptById
  };
}
