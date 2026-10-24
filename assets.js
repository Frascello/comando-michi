// =====================================================================
//  ASSETS.JS  —  Depósito de recursos y configuración de COMANDO MICHI
//  Acá viven los datos: tamaños, dificultades, escenarios, paletas y
//  las partituras de la música. (Cambiá valores y probá qué pasa.)
//  No hace falta ninguna imagen: todo se dibuja por código con p5.js.
// =====================================================================

// ---- Tamaño del juego ----
const W = 800; // ancho del canvas
const H = 450; // alto del canvas
const GROUND = 380; // altura (y) del suelo

// ---- Paleta del protagonista (michi comando) ----
const PAL_JUGADOR = {
  skin: "#f2a65a",
  ear: "#f2a65a",
  shirt: "#3b6fd0",
  pants: "#34503a",
  hat: "#d64541", // vincha roja
  boots: "#3a2a1a",
  belt: "#7a5a30",
  pack: "#5b4a2f",
};

// ---- Dificultades ----
// vidas: vidas iniciales | hpEnem: multiplicador de vida enemiga
// hpJefe: multiplicador de vida del jefe | cad: cadencia de disparo enemiga
// vel: velocidad enemiga | densidad: cantidad de enemigos
// velBala: velocidad de balas enemigas | mult: multiplicador de puntos
const DIFICULTADES = [
  { nombre: "FÁCIL", vidas: 5, hpEnem: 0.5, hpJefe: 0.6, cad: 0.7, vel: 0.85, densidad: 0.8, velBala: 2.6, mult: 1 },
  { nombre: "NORMAL", vidas: 3, hpEnem: 1, hpJefe: 1, cad: 1, vel: 1, densidad: 1, velBala: 3.2, mult: 2 },
  { nombre: "DIFÍCIL", vidas: 2, hpEnem: 1.5, hpJefe: 1.4, cad: 1.35, vel: 1.2, densidad: 1.3, velBala: 3.8, mult: 3 },
];

// ---- Escenarios (niveles) ----
// plataformas: salientes donde se puede saltar. "francotirador:true" pone un enemigo arriba.
// prisioneros: posiciones x (en el mundo) donde hay prisioneros para rescatar.
const ESCENARIOS = [
  {
    id: "desierto",
    mision: "MISIÓN 1",
    nombre: "DESIERTO ROJO",
    largo: 5600,
    jefe: "tanque",
    jefeNombre: "TANQUE PERRUNO",
    musica: "desierto",
    plataformas: [
      { x: 760, w: 190, y: GROUND - 76, francotirador: true },
      { x: 1700, w: 230, y: GROUND - 76 },
      { x: 1790, w: 110, y: GROUND - 152, francotirador: true },
      { x: 2900, w: 210, y: GROUND - 76, francotirador: true },
      { x: 3900, w: 260, y: GROUND - 76 },
      { x: 3980, w: 110, y: GROUND - 152, francotirador: true },
      { x: 4700, w: 200, y: GROUND - 76, francotirador: true },
    ],
    prisioneros: [1000, 2100, 3300, 4300, 5000],
  },
  {
    id: "ciudad",
    mision: "MISIÓN 2",
    nombre: "CIUDAD EN LLAMAS",
    largo: 6400,
    jefe: "helicoptero",
    jefeNombre: "HELICÓPTERO PERRUNO",
    musica: "ciudad",
    plataformas: [
      { x: 650, w: 200, y: GROUND - 76, francotirador: true },
      { x: 1500, w: 240, y: GROUND - 76 },
      { x: 1590, w: 110, y: GROUND - 152, francotirador: true },
      { x: 2500, w: 220, y: GROUND - 76, francotirador: true },
      { x: 3300, w: 250, y: GROUND - 76, francotirador: true },
      { x: 4200, w: 230, y: GROUND - 76 },
      { x: 4290, w: 110, y: GROUND - 152, francotirador: true },
      { x: 5200, w: 220, y: GROUND - 76, francotirador: true },
    ],
    prisioneros: [900, 1900, 3000, 4000, 5000, 5700],
  },
];

// ---- Música (números = notas MIDI, 0 = silencio). Cada paso es una corchea ----
const MUSICA = {
  menu: {
    bpm: 104,
    bajo: [33,0,0,33, 0,0,40,0, 29,0,0,29, 0,0,36,0, 36,0,0,36, 0,0,43,0, 31,0,0,31, 0,0,38,0],
    lead: [69,0,0,72, 0,0,76,0, 72,0,0,77, 0,0,81,0, 79,0,0,76, 0,0,72,0, 74,0,0,71, 0,0,67,0],
  },
  desierto: {
    bpm: 138,
    bajo: [38,0,38,38, 38,0,45,38, 34,0,34,34, 34,0,41,34, 41,0,41,41, 41,0,48,41, 36,0,36,36, 36,0,43,36],
    lead: [74,0,77,0, 81,0,77,74, 70,0,74,0, 77,0,74,70, 72,0,77,0, 81,0,77,72, 72,0,76,0, 79,0,76,72],
  },
  ciudad: {
    bpm: 154,
    bajo: [40,40,0,40, 52,0,40,43, 36,36,0,36, 48,0,36,40, 38,38,0,38, 50,0,38,42, 35,35,0,35, 47,0,35,39],
    lead: [76,0,79,0, 83,0,79,76, 72,0,76,0, 79,0,76,72, 74,0,78,0, 81,0,78,74, 71,0,74,0, 78,0,74,71],
  },
};
