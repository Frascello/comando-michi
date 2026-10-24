// =====================================================================
//  GAME.JS  —  El cerebro de COMANDO MICHI
//  Menú, controles, enemigos, jefes, puntaje, audio sintetizado y música.
//  Todo con p5.js + p5.sound (sin librerías extra).
// =====================================================================

// ⬇️⬇️⬇️  CONTADOR DE PROMPTS / ITERACIONES (Logro "Auditoría severa")  ⬇️⬇️⬇️
// Sumá 1 cada vez que le pidas algo nuevo a la IA. Se muestra en el menú y en el HUD.
const PROMPTS_USADOS = 2;
// ⬆️⬆️⬆️ ----------------------------------------------------------- ⬆️⬆️⬆️

// ---------- Estado global ----------
let estado = "menu"; // menu | comoJugar | salir | jugando | pausa | nivelCompleto | gameover | victoria
let sel = 0;
let difIdx = 1;
let nivelInicial = 0;
let vehSel = 0; // 0 = michi a pie, 1 = tanque

let camX = 0, camMax = 0, shake = 0;
let jugador;
let balas = [], balasEnemigas = [], granadas = [], enemigos = [], items = [];
let prisioneros = [], particulas = [], explosiones = [], plataformas = [], cola = [], popups = [];
let jefe = null, jefeActivo = false, alertaT = 0;
let nivelIdx = 0, vidas = 3, puntaje = 0, record = 0;
let puntajeInicioNivel = 0, rescatados = 0, tiempoNivel = 0, introT = 0, bonusTiempo = 0;
let rngNivel;

const ITEMS_MENU = 5;

// ---------- Utilidades ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function solapan(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function distPuntoRect(qx, qy, r) {
  const cx = constrain(qx, r.x, r.x + r.w);
  const cy = constrain(qy, r.y, r.y + r.h);
  return dist(qx, qy, cx, cy);
}
function enPantalla(o) {
  return o.x + o.w > camX + 4 && o.x < camX + W - 4;
}
function dif() {
  return DIFICULTADES[difIdx];
}
function escenario() {
  return ESCENARIOS[nivelIdx];
}

// =====================================================================
//  AUDIO (p5.sound): efectos sintetizados + música chiptune
// =====================================================================
let audioOK = false;
let vocesSfx = [], idxSfx = 0;
let ruidoB, envRB, ruidoR, envRR, ruidoH, envRH;
let oscLead, envLead, oscBass, envBass;
let cancion = null, pasoCancion = 0, proximoPaso = 0, velMusica = 1;

const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

function iniciarAudio() {
  try {
    for (let i = 0; i < 4; i++) {
      const o = new p5.Oscillator("square");
      const e = new p5.Envelope();
      o.start();
      o.amp(0);
      vocesSfx.push({ o, e });
    }
    ruidoB = new p5.Noise("white");
    envRB = new p5.Envelope();
    ruidoB.start();
    ruidoB.amp(0);
    ruidoR = new p5.Noise("brown");
    envRR = new p5.Envelope();
    ruidoR.start();
    ruidoR.amp(0);
    ruidoH = new p5.Noise("white");
    envRH = new p5.Envelope();
    ruidoH.start();
    ruidoH.amp(0);
    oscLead = new p5.Oscillator("square");
    envLead = new p5.Envelope();
    oscLead.start();
    oscLead.amp(0);
    oscBass = new p5.Oscillator("triangle");
    envBass = new p5.Envelope();
    oscBass.start();
    oscBass.amp(0);
    audioOK = true;
  } catch (err) {
    console.warn("Audio no disponible:", err);
    audioOK = false;
  }
}

function tono(f1, f2, dur, vol, tipo) {
  if (!audioOK || soundMuted) return;
  const v = vocesSfx[idxSfx++ % vocesSfx.length];
  v.o.setType(tipo || "square");
  v.e.setADSR(0.002, dur, 0, 0.01);
  v.e.setRange(vol, 0);
  v.o.freq(f1);
  if (f2 && f2 !== f1) v.o.freq(f2, dur);
  v.e.play(v.o);
}
function ruido(tipo, dur, vol) {
  if (!audioOK || soundMuted) return;
  const n = tipo === "b" ? ruidoR : ruidoB;
  const e = tipo === "b" ? envRR : envRB;
  e.setADSR(0.001, dur, 0, 0.01);
  e.setRange(vol, 0);
  e.play(n);
}
function jingle(notas) {
  notas.forEach(([f, d, t]) => setTimeout(() => tono(f, f, d, 0.12, "square"), t));
}

// Efectos
function sfxDisparo(hmg) {
  tono(hmg ? 1100 : 900, hmg ? 400 : 260, hmg ? 0.05 : 0.07, 0.1, "square");
  ruido("w", 0.04, 0.05);
}
function sfxDisparoEnemigo() {
  tono(520, 180, 0.09, 0.07, "sawtooth");
}
function sfxSalto() {
  tono(260, 560, 0.12, 0.08, "square");
}
function sfxGranada() {
  tono(320, 160, 0.12, 0.08, "triangle");
}
function sfxImpacto() {
  tono(700, 420, 0.04, 0.06, "square");
  ruido("w", 0.03, 0.04);
}
function sfxExplosion(grande) {
  ruido("b", grande ? 0.55 : 0.3, grande ? 0.5 : 0.3);
  tono(grande ? 130 : 180, 40, grande ? 0.5 : 0.25, 0.14, "sawtooth");
}
function sfxCanon() {
  tono(220, 60, 0.12, 0.12, "sawtooth");
  ruido("b", 0.12, 0.2);
}
function sfxItem() {
  jingle([[660, 0.07, 0], [880, 0.07, 70], [1320, 0.12, 140]]);
}
function sfxPrisionero() {
  jingle([[523, 0.08, 0], [659, 0.08, 90], [784, 0.08, 180], [1047, 0.18, 270]]);
}
function sfxMuerteJugador() {
  tono(620, 70, 0.55, 0.14, "sawtooth");
  ruido("b", 0.4, 0.3);
}
function sfxMenu() {
  tono(440, 440, 0.05, 0.07, "square");
}
function sfxElegir() {
  jingle([[660, 0.06, 0], [990, 0.1, 60]]);
}

// Música
function reproducirMusica(nombre) {
  cancion = nombre ? MUSICA[nombre] : null;
  pasoCancion = 0;
  proximoPaso = millis();
  velMusica = 1;
}
function actualizarMusica() {
  if (!cancion) return;
  if (!audioOK || soundMuted) {
    proximoPaso = millis();
    return;
  }
  const ms = 60000 / (cancion.bpm * velMusica) / 2;
  if (millis() - proximoPaso > 400) proximoPaso = millis();
  let guardia = 0;
  while (millis() >= proximoPaso && guardia++ < 4) {
    tocarPaso();
    proximoPaso += ms;
  }
}
function tocarPaso() {
  const n = cancion.bajo.length;
  const i = pasoCancion % n;
  pasoCancion++;
  const b = cancion.bajo[i];
  const l = cancion.lead[i];
  if (b) {
    oscBass.freq(mtof(b));
    envBass.setADSR(0.005, 0.12, 0.35, 0.06);
    envBass.setRange(0.16, 0);
    envBass.play(oscBass);
  }
  if (l) {
    oscLead.freq(mtof(l));
    envLead.setADSR(0.005, 0.08, 0.25, 0.05);
    envLead.setRange(0.06, 0);
    envLead.play(oscLead);
  }
  if (i % 2 === 1) {
    envRH.setADSR(0.001, 0.03, 0, 0.01);
    envRH.setRange(0.035, 0);
    envRH.play(ruidoH);
  }
}

// =====================================================================
//  SETUP / DRAW
// =====================================================================
function setup() {
  const c = createCanvas(W, H);
  c.parent("game-container");
  noSmooth();
  textFont("Courier New");
  textStyle(BOLD);
  iniciarAudio();
  construirFondos();
  try {
    record = parseInt(localStorage.getItem("comando_michi_record") || "0") || 0;
  } catch (e) {}
  irAMenu();
}

function irAMenu() {
  estado = "menu";
  sel = 0;
  camX = 0;
  reproducirMusica("menu");
}

function draw() {
  actualizarMusica();
  switch (estado) {
    case "menu":
      dibujarMenu();
      break;
    case "comoJugar":
      dibujarComoJugar();
      break;
    case "salir":
      dibujarSalir();
      break;
    case "vehiculo":
      dibujarVehiculo();
      break;
    default:
      if (estado === "jugando") actualizarJuego();
      dibujarJuego();
      if (estado === "pausa") overlayPausa();
      if (estado === "nivelCompleto") overlayNivelCompleto();
      if (estado === "gameover") overlayGameOver();
      if (estado === "victoria") overlayVictoria();
  }
}

// =====================================================================
//  INICIO DE PARTIDA / NIVEL
// =====================================================================
function comenzarJuego() {
  vidas = dif().vidas;
  puntaje = 0;
  iniciarNivel(nivelInicial);
}

function iniciarNivel(idx) {
  nivelIdx = idx;
  const E = escenario();
  camX = 0;
  camMax = E.largo - W;
  jefe = null;
  jefeActivo = false;
  alertaT = 0;
  balas = [];
  balasEnemigas = [];
  granadas = [];
  enemigos = [];
  items = [];
  particulas = [];
  explosiones = [];
  popups = [];
  plataformas = E.plataformas.map((p) => Object.assign({}, p));
  prisioneros = E.prisioneros.map((x) => ({ x, y: GROUND - 30, w: 24, h: 30, liberado: false, t: 0, f: -1 }));
  rescatados = 0;
  tiempoNivel = 0;
  introT = 0;
  puntajeInicioNivel = puntaje;
  construirCola();
  nuevoJugador();
  estado = "jugando";
  reproducirMusica(E.musica);
}

function nuevoJugador() {
  const tk = vehSel === 1;
  jugador = {
    vehiculo: tk ? "tanque" : "michi", escudo: 2, hBase: tk ? 38 : 44,
    x: 80, y: GROUND - (tk ? 38 : 44), w: tk ? 70 : 24, h: tk ? 38 : 44, vx: 0, vy: 0, f: 1,
    enSuelo: true, agachado: false, apunta: "side", moviendo: false,
    arma: "pistola", ammo: 0, granadas: 10, cd: 0, flash: 0, invuln: 90,
    muerto: false, muertoT: 0, t: 0, ignorarPlat: 0,
  };
}

function construirCola() {
  const E = escenario();
  const D = dif();
  rngNivel = mulberry32(nivelIdx * 977 + 13);
  cola = [];
  let x = 520;
  while (x < E.largo - W - 200) {
    const p = x / E.largo;
    const pesos = [["rifle", 4]];
    if (p > 0.12) pesos.push(["corredor", 2.5]);
    if (p > 0.28) pesos.push(["granadero", E.id === "ciudad" ? 2.5 : 1.6]);
    if (E.id === "ciudad" && p > 0.08) pesos.push(["dron", 2.5]);
    let total = 0;
    pesos.forEach((q) => (total += q[1]));
    let r = rngNivel() * total;
    let tipo = pesos[0][0];
    for (const q of pesos) {
      if (r < q[1]) {
        tipo = q[0];
        break;
      }
      r -= q[1];
    }
    cola.push({ x, tipo });
    if (tipo !== "dron" && rngNivel() < 0.3) cola.push({ x: x + 70, tipo: "rifle" });
    x += (rngNivel() * 140 + 230) / D.densidad;
  }
  E.plataformas.forEach((p, i) => {
    if (p.francotirador) cola.push({ x: p.x - 60, tipo: "francotirador", plat: i });
  });
  cola.sort((a, b) => a.x - b.x);
}

// =====================================================================
//  ACTUALIZACIÓN DEL JUEGO
// =====================================================================
function actualizarJuego() {
  tiempoNivel++;
  introT++;
  shake *= 0.88;
  if (shake < 0.3) shake = 0;
  actualizarJugador();
  actualizarCamara();
  generarEnemigos();
  for (const e of enemigos) actualizarEnemigo(e);
  actualizarJefe();
  actualizarBalas();
  actualizarGranadas();
  actualizarBalasEnemigas();
  actualizarItems();
  actualizarPrisioneros();
  for (const e of explosiones) e.t++;
  explosiones = explosiones.filter((e) => e.t < e.max);
  for (const q of particulas) {
    q.x += q.vx;
    q.y += q.vy;
    q.vy += 0.18;
    q.l--;
  }
  particulas = particulas.filter((q) => q.l > 0);
  for (const p of popups) {
    p.y -= 0.6;
    p.t++;
  }
  popups = popups.filter((p) => p.t < 55);
  enemigos = enemigos.filter((e) => !e.eliminar && !(e.muerto && e.morirT > 40) && e.x > camX - 200);
  if (alertaT > 0) alertaT--;
}

function actualizarCamara() {
  if (jefeActivo) {
    camX = camMax;
    return;
  }
  const obj = jugador.x - 320;
  if (obj > camX) camX = Math.min(camX + Math.max(2, (obj - camX) * 0.2), camMax);
  if (camX >= camMax - 1 && !jefeActivo && !jefe) crearJefe();
}

// ---------- Jugador ----------
function actualizarJugador() {
  const j = jugador;
  if (j.invuln > 0) j.invuln--;
  if (j.flash > 0) j.flash--;
  if (j.cd > 0) j.cd--;
  if (j.ignorarPlat > 0) j.ignorarPlat--;

  if (j.muerto) {
    j.muertoT++;
    if (j.muertoT > 90) {
      if (vidas > 0) reaparecer();
      else irAGameOver();
    }
    return;
  }

  const izq = keyIsDown(LEFT_ARROW) || keyIsDown(65);
  const der = keyIsDown(RIGHT_ARROW) || keyIsDown(68);
  const arr = keyIsDown(UP_ARROW) || keyIsDown(87);
  const aba = keyIsDown(DOWN_ARROW) || keyIsDown(83);
  const disp = keyIsDown(88) || keyIsDown(32);

  if (izq && !der) j.f = -1;
  if (der && !izq) j.f = 1;
  j.agachado = aba && j.enSuelo && !arr && j.vehiculo !== "tanque";
  j.apunta = arr ? "up" : aba && !j.enSuelo && j.vehiculo !== "tanque" ? "down" : "side";

  // altura del hitbox (conserva los pies en el mismo lugar)
  const nh = j.agachado ? 28 : j.hBase;
  if (nh !== j.h) {
    j.y += j.h - nh;
    j.h = nh;
  }

  j.vx = j.agachado ? 0 : ((der ? 1 : 0) - (izq ? 1 : 0)) * (j.vehiculo === "tanque" ? 2.1 : 2.7);
  j.moviendo = j.vx !== 0;
  if (j.moviendo) j.t++;
  j.x = constrain(j.x + j.vx, camX + 4, Math.min(camX + W - j.w - 4, escenario().largo - j.w - 6));

  // gravedad y colisiones verticales
  const prevBottom = j.y + j.h;
  j.vy += 0.55;
  j.y += j.vy;
  j.enSuelo = false;
  const bottom = j.y + j.h;
  if (j.vy >= 0) {
    if (bottom >= GROUND) {
      j.y = GROUND - j.h;
      j.vy = 0;
      j.enSuelo = true;
    } else if (j.ignorarPlat <= 0) {
      for (const p of plataformas) {
        if (prevBottom <= p.y + 2 && bottom >= p.y && j.x + j.w > p.x + 4 && j.x < p.x + p.w - 4) {
          j.y = p.y - j.h;
          j.vy = 0;
          j.enSuelo = true;
          break;
        }
      }
    }
  }

  if (disp && j.cd <= 0) dispararJugador();
  if (jefe && jefe.muerto) return;

  // choque con prisioneros / items se maneja en sus propias funciones
}

function saltar() {
  const j = jugador;
  if (!j || j.muerto || !j.enSuelo) return;
  const aba = keyIsDown(DOWN_ARROW) || keyIsDown(83);
  if (aba && j.y + j.h < GROUND - 2) {
    j.ignorarPlat = 14; // bajar de la plataforma
    j.vy = 1;
    j.enSuelo = false;
    return;
  }
  j.vy = j.vehiculo === "tanque" ? -8.8 : -10.4;
  j.enSuelo = false;
  sfxSalto();
}

function dispararJugador() {
  const j = jugador;
  const hmg = j.arma === "hmg";
  if (j.vehiculo === "tanque") {
    const cx = j.x + j.w / 2;
    const v = hmg ? 11 : 10;
    let ox, oy, vx = 0, vy = 0;
    if (j.apunta === "up") { ox = cx + j.f * 10; oy = j.y - 30; vy = -v; }
    else { ox = cx + j.f * 46; oy = j.y + 9; vx = j.f * v; }
    if (hmg) {
      const jit = random(-0.7, 0.7);
      if (vy !== 0) vx += jit; else vy += jit;
    }
    balas.push({ x: ox, y: oy, vx, vy, dmg: hmg ? 1 : 3, hmg, big: !hmg });
    j.cd = hmg ? 7 : 20;
    j.flash = 4;
    if (hmg) { j.ammo--; if (j.ammo <= 0) j.arma = "pistola"; sfxDisparo(true); }
    else sfxCanon();
    return;
  }
  const v = hmg ? 12 : 11;
  let ox, oy, vx = 0, vy = 0;
  if (j.apunta === "up") {
    ox = j.x + 12 + j.f * 3;
    oy = j.y - 4;
    vy = -v;
  } else if (j.apunta === "down") {
    ox = j.x + 12;
    oy = j.y + j.h + 2;
    vy = v;
  } else {
    ox = j.x + 12 + j.f * 24;
    oy = j.y + (j.agachado ? 15 : 17);
    vx = j.f * v;
  }
  if (hmg) {
    const jit = random(-0.9, 0.9);
    if (vy !== 0) vx += jit;
    else vy += jit;
  }
  balas.push({ x: ox, y: oy, vx, vy, dmg: 1, hmg });
  j.cd = hmg ? 4 : 11;
  j.flash = 3;
  if (hmg) {
    j.ammo--;
    if (j.ammo <= 0) j.arma = "pistola";
  }
  sfxDisparo(hmg);
}

function lanzarGranada() {
  const j = jugador;
  if (!j || j.muerto || j.granadas <= 0) return;
  j.granadas--;
  granadas.push({ x: j.x + j.w / 2, y: j.y + 8, vx: j.f * 4.2 + j.vx * 0.5, vy: -6.5, t: 0 });
  sfxGranada();
}

function matarJugador() {
  const j = jugador;
  if (j.muerto || j.invuln > 0) return;
  if (j.vehiculo === "tanque" && j.escudo > 0) {
    j.escudo--;
    j.invuln = 75;
    shake = 8;
    explosiones.push({ x: j.x + j.w / 2, y: j.y + 12, r: 34, t: 0, max: 20 });
    chispas(j.x + j.w / 2, j.y + 12, "#ffb347", 10);
    sfxImpacto();
    ruido("b", 0.2, 0.25);
    return;
  }
  j.muerto = true;
  j.muertoT = 0;
  vidas--;
  if (j.vehiculo === "tanque") explosiones.push({ x: j.x + j.w / 2, y: j.y + 14, r: 60, t: 0, max: 30 });
  shake = 8;
  sfxMuerteJugador();
  chispas(j.x + 12, j.y + 20, "#d64541", 14);
}

function reaparecer() {
  const j = jugador;
  j.muerto = false;
  j.x = camX + 60;
  j.y = -60;
  j.vy = 0;
  j.h = j.hBase;
  j.escudo = 2;
  j.invuln = 170;
  j.arma = "pistola";
  j.ammo = 0;
  j.granadas = Math.max(j.granadas, 5);
  balasEnemigas = [];
}

// ---------- Enemigos ----------
function generarEnemigos() {
  if (jefeActivo) return;
  while (cola.length && camX + W + 30 >= cola[0].x) {
    const ev = cola[0];
    const vivos = enemigos.filter((e) => !e.muerto).length;
    if (vivos >= 8 && ev.tipo !== "francotirador") break;
    cola.shift();
    crearEnemigo(ev);
  }
}

function crearEnemigo(ev) {
  const D = dif();
  const t = ev.tipo;
  const e = {
    tipo: t, x: 0, y: 0, w: 24, h: 44, f: -1, t: Math.floor(random(60)), cd: 60, hp: 1,
    muerto: false, morirT: 0, hitT: 0, flash: 0, moviendo: false, estado: "avanza", rafaga: 0, ciclos: 0, vel: 1,
  };
  const hpb = (n) => Math.max(1, Math.round(n * D.hpEnem));
  const xs = Math.max(ev.x, camX + W + 20);
  switch (t) {
    case "rifle":
      e.x = xs; e.y = GROUND - 44; e.hp = hpb(2); e.vel = 1.0 * D.vel; e.distParar = 200 + random(140);
      break;
    case "corredor":
      e.x = xs; e.y = GROUND - 44; e.hp = hpb(1); e.vel = 2.8 * D.vel;
      break;
    case "granadero":
      e.x = xs; e.y = GROUND - 44; e.hp = hpb(3); e.vel = 0.9 * D.vel; e.cd = 70;
      break;
    case "francotirador": {
      const p = plataformas[ev.plat];
      e.x = p.x + p.w / 2 - 12; e.y = p.y - 44; e.hp = hpb(2); e.cd = 90;
      break;
    }
    case "dron":
      e.w = 30; e.h = 18; e.x = camX + W + 30; e.y = 80 + random(80); e.base = e.y; e.hp = hpb(2); e.vel = 1.5 * D.vel; e.cd = 50;
      break;
  }
  enemigos.push(e);
}

function dispararEnemigo(e) {
  const D = dif();
  const sx = e.x + 12 + e.f * 18;
  const sy = e.y + 17;
  const tx = (jugador.x + jugador.w / 2);
  const ty = jugador.y + jugador.h / 2;
  const ang = Math.atan2(ty - sy, tx - sx);
  balasEnemigas.push({ tipo: "bala", x: sx, y: sy, vx: Math.cos(ang) * D.velBala, vy: Math.sin(ang) * D.velBala, t: 0 });
  sfxDisparoEnemigo();
}

function lanzarGranadaEnemiga(e) {
  const sx = e.x + 12;
  const sy = e.y + 8;
  const T = 55;
  const g = 0.3;
  const tx = (jugador.x + jugador.w / 2);
  const ty = GROUND - 6;
  const vx = constrain((tx - sx) / T, -6, 6);
  const vy = (ty - sy - 0.5 * g * T * T) / T;
  balasEnemigas.push({ tipo: "granada", x: sx, y: sy, vx, vy, g, rad: 46, t: 0 });
  sfxGranada();
}

function actualizarEnemigo(e) {
  if (e.muerto) {
    e.morirT++;
    return;
  }
  const D = dif();
  e.t++;
  if (e.hitT > 0) e.hitT--;
  if (e.flash > 0) e.flash--;
  const dx = (jugador.x + jugador.w / 2) - (e.x + e.w / 2);
  e.f = dx >= 0 ? 1 : -1;
  const ad = Math.abs(dx);
  const visible = enPantalla(e);

  switch (e.tipo) {
    case "rifle":
      if (e.estado === "avanza") {
        e.x += e.f * e.vel;
        e.moviendo = true;
        if (ad < e.distParar) {
          e.estado = "dispara";
          e.cd = 25;
          e.moviendo = false;
        }
      } else {
        e.cd--;
        if (e.cd <= 0 && visible) {
          dispararEnemigo(e);
          e.flash = 3;
          e.rafaga++;
          if (e.rafaga >= 2) {
            e.rafaga = 0;
            e.cd = (100 + random(60)) / D.cad;
            e.ciclos++;
            if (e.ciclos >= 3) {
              e.estado = "avanza";
              e.ciclos = 0;
              e.distParar = Math.max(90, ad - random(80, 150));
            }
          } else e.cd = 12;
        }
      }
      break;
    case "francotirador":
      e.cd--;
      if (e.cd <= 0 && visible && ad < 560) {
        dispararEnemigo(e);
        e.flash = 3;
        e.cd = (130 + random(40)) / D.cad;
      }
      break;
    case "corredor":
      e.x += e.f * e.vel;
      e.moviendo = true;
      if (!jugador.muerto && jugador.invuln <= 0 && solapan(e, jugador)) matarJugador();
      break;
    case "granadero":
      e.moviendo = false;
      if (ad < 190 && e.x < camX + W - 50) {
        e.x -= e.f * e.vel * 0.8;
        e.moviendo = true;
      } else if (ad > 320) {
        e.x += e.f * e.vel;
        e.moviendo = true;
      }
      e.cd--;
      if (e.cd <= 0 && ad < 470 && visible) {
        lanzarGranadaEnemiga(e);
        e.cd = (150 + random(60)) / D.cad;
      }
      break;
    case "dron":
      e.x -= e.vel;
      e.y = e.base + Math.sin(e.t * 0.07) * 22;
      e.f = -1;
      e.cd--;
      if (e.cd <= 0 && visible && Math.abs((jugador.x + jugador.w / 2) - (e.x + 15)) < 45) {
        balasEnemigas.push({ tipo: "bomba", x: e.x + 15, y: e.y + 14, vx: 0, vy: 1, g: 0.22, rad: 44, t: 0 });
        e.cd = 75 / D.cad;
        sfxGranada();
      }
      if (e.x < camX - 80) e.eliminar = true;
      break;
  }
}

function danar(e, d) {
  if (e.muerto) return;
  e.hp -= d;
  e.hitT = 4;
  if (e.hp <= 0) matarEnemigo(e);
}

const PUNTOS = { rifle: 100, corredor: 80, granadero: 200, francotirador: 150, dron: 150 };
function matarEnemigo(e) {
  e.muerto = true;
  e.morirT = 0;
  const pts = PUNTOS[e.tipo] * dif().mult;
  puntaje += pts;
  popup(e.x + 12, e.y, "+" + pts);
  if (e.tipo === "dron") {
    explosiones.push({ x: e.x + 15, y: e.y + 9, r: 28, t: 0, max: 22 });
    sfxExplosion(false);
    chispas(e.x + 15, e.y + 9, "#ffb347", 10);
  } else {
    chispas(e.x + 12, e.y + 20, "#c0392b", 8);
    tono(300, 90, 0.18, 0.09, "sawtooth");
    if (random() < 0.12) items.push({ x: e.x, y: GROUND - 22, tipo: random() < 0.6 ? "G" : "H", t: 0 });
  }
}

// ---------- Jefes ----------
function crearJefe() {
  const E = escenario();
  const D = dif();
  if (E.jefe === "tanque") {
    jefe = { tipo: "tanque", x: camX + W + 30, y: GROUND - 70, w: 150, h: 70, hpMax: Math.round(60 * D.hpJefe), baseX: camX + W - 215 };
  } else {
    jefe = { tipo: "helicoptero", x: camX + W + 40, y: 40, w: 140, h: 60, hpMax: Math.round(70 * D.hpJefe), baseX: camX + 380 };
  }
  jefe.hp = jefe.hpMax;
  jefe.t = 0;
  jefe.t0 = 0;
  jefe.estado = "entra";
  jefe.cd1 = 90;
  jefe.cd2 = 60;
  jefe.rafaga = 0;
  jefe.muerto = false;
  jefe.morirT = 0;
  jefe.hitT = 0;
  jefe.fase2 = false;
  jefeActivo = true;
  alertaT = 150;
  cola = [];
  velMusica = 1.12;
  jingle([[220, 0.15, 0], [220, 0.15, 200], [220, 0.3, 400]]);
}

function danarJefe(d) {
  if (!jefe || jefe.muerto) return;
  jefe.hp -= d;
  jefe.hitT = 3;
  if (jefe.hp <= 0) {
    jefe.muerto = true;
    jefe.morirT = 0;
    const pts = 5000 * dif().mult;
    puntaje += pts;
    popup(jefe.x + jefe.w / 2, jefe.y, "+" + pts);
    balasEnemigas = [];
    for (const e of enemigos) if (!e.muerto) matarEnemigo(e);
  }
}

function actualizarJefe() {
  if (!jefe) return;
  const b = jefe;
  const D = dif();
  b.t++;
  if (b.hitT > 0) b.hitT--;

  if (b.muerto) {
    b.morirT++;
    if (b.morirT % 6 === 0) {
      explosiones.push({ x: b.x + random(b.w), y: b.y + random(b.h), r: 34, t: 0, max: 24 });
      shake = 7;
      sfxExplosion(false);
    }
    if (b.morirT === 110) {
      explosiones.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, r: 110, t: 0, max: 40 });
      shake = 16;
      sfxExplosion(true);
    }
    if (b.morirT >= 150 && estado === "jugando") terminarNivel();
    return;
  }

  const fase = b.hp < b.hpMax * 0.5;
  const cad = D.cad * (fase ? 1.3 : 1);

  if (b.tipo === "tanque") {
    if (b.estado === "entra") {
      b.x -= 1.6;
      if (b.x <= b.baseX) {
        b.estado = "combate";
        b.t0 = b.t;
      }
    } else {
      b.x = b.baseX + Math.sin((b.t - b.t0) * 0.014) * 80;
      b.cd1--;
      b.cd2--;
      if (b.cd1 <= 0) {
        const sx = b.x + 10, sy = b.y + 18, T = 70, g = 0.28;
        const tx = (jugador.x + jugador.w / 2), ty = GROUND - 6;
        balasEnemigas.push({ tipo: "obus", x: sx, y: sy, vx: (tx - sx) / T, vy: (ty - sy - 0.5 * g * T * T) / T, g, rad: 58, t: 0 });
        sfxExplosion(false);
        b.cd1 = 190 / cad;
      }
      if (b.cd2 <= 0) {
        const sx = b.x + 20, sy = b.y + 6;
        const ang = Math.atan2(jugador.y + 20 - sy, (jugador.x + jugador.w / 2) - sx);
        balasEnemigas.push({ tipo: "bala", x: sx, y: sy, vx: Math.cos(ang) * D.velBala, vy: Math.sin(ang) * D.velBala, t: 0 });
        sfxDisparoEnemigo();
        b.rafaga++;
        if (b.rafaga >= 3) {
          b.rafaga = 0;
          b.cd2 = 110 / cad;
        } else b.cd2 = 9;
      }
      if (fase && !b.fase2) {
        b.fase2 = true;
        crearEnemigo({ tipo: "corredor", x: camX + W + 20 });
        crearEnemigo({ tipo: "corredor", x: camX + W + 80 });
      }
    }
    if (!jugador.muerto && jugador.invuln <= 0 && solapan(b, jugador)) matarJugador();
  } else {
    if (b.estado === "entra") {
      b.x -= 2;
      b.y = Math.min(b.y + 0.5, 95);
      if (b.x <= b.baseX) {
        b.estado = "combate";
        b.t0 = b.t;
      }
    } else {
      const tt = b.t - b.t0;
      b.x = b.baseX + Math.sin(tt * 0.018) * 270;
      b.y = 95 + Math.sin(tt * 0.035) * 22;
      b.cd1--;
      b.cd2--;
      if (b.cd1 <= 0) {
        const sx = b.x + 40, sy = b.y + 45;
        const a0 = Math.atan2(jugador.y + 20 - sy, (jugador.x + jugador.w / 2) - sx);
        const n = fase ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * 0.2;
          balasEnemigas.push({ tipo: "bala", x: sx, y: sy, vx: Math.cos(a) * (D.velBala + 0.2), vy: Math.sin(a) * (D.velBala + 0.2), t: 0 });
        }
        sfxDisparoEnemigo();
        b.cd1 = 120 / cad;
      }
      if (b.cd2 <= 0 && Math.abs((jugador.x + jugador.w / 2) - (b.x + 70)) < 90) {
        balasEnemigas.push({ tipo: "bomba", x: b.x + 70, y: b.y + 55, vx: 0, vy: 1, g: 0.22, rad: 48, t: 0 });
        sfxGranada();
        b.cd2 = 70 / cad;
      }
    }
    if (!jugador.muerto && jugador.invuln <= 0 && solapan(b, jugador)) matarJugador();
  }
}

// ---------- Proyectiles ----------
function actualizarBalas() {
  for (const b of balas) {
    b.x += b.vx;
    b.y += b.vy;
    let golpe = false;
    for (const e of enemigos) {
      if (e.muerto) continue;
      if (b.x > e.x - 2 && b.x < e.x + e.w + 2 && b.y > e.y - 2 && b.y < e.y + e.h + 2) {
        danar(e, b.dmg);
        golpe = true;
        break;
      }
    }
    if (!golpe && jefe && !jefe.muerto && b.x > jefe.x && b.x < jefe.x + jefe.w && b.y > jefe.y && b.y < jefe.y + jefe.h) {
      danarJefe(b.dmg);
      golpe = true;
    }
    if (golpe) {
      chispas(b.x, b.y, "#ffd23f", 4);
      sfxImpacto();
      b.muerta = true;
    }
    if (b.x < camX - 30 || b.x > camX + W + 30 || b.y < -30 || b.y > H) b.muerta = true;
  }
  balas = balas.filter((b) => !b.muerta);
}

function actualizarGranadas() {
  for (const g of granadas) {
    g.vy += 0.32;
    g.x += g.vx;
    g.y += g.vy;
    g.t++;
    let explota = g.y >= GROUND - 4;
    if (!explota) {
      for (const e of enemigos) {
        if (!e.muerto && g.x > e.x && g.x < e.x + e.w && g.y > e.y && g.y < e.y + e.h) explota = true;
      }
      if (jefe && !jefe.muerto && g.x > jefe.x && g.x < jefe.x + jefe.w && g.y > jefe.y && g.y < jefe.y + jefe.h) explota = true;
    }
    if (explota) {
      explosionar(g.x, Math.min(g.y, GROUND - 6), 62, "jugador", 6);
      g.muerta = true;
    }
    if (g.x < camX - 40 || g.x > camX + W + 40) g.muerta = true;
  }
  granadas = granadas.filter((g) => !g.muerta);
}

function actualizarBalasEnemigas() {
  const j = jugador;
  for (const b of balasEnemigas) {
    b.vy += b.g || 0;
    b.x += b.vx;
    b.y += b.vy;
    b.t++;
    if (b.tipo === "bala") {
      if (!j.muerto && j.invuln <= 0 && b.x > j.x && b.x < j.x + j.w && b.y > j.y && b.y < j.y + j.h) {
        matarJugador();
        b.muerta = true;
      }
    } else {
      if (b.y >= GROUND - 4) {
        explosionar(b.x, GROUND - 6, b.rad, "enemigo", 0);
        b.muerta = true;
      } else if (!j.muerto && b.x > j.x && b.x < j.x + j.w && b.y > j.y && b.y < j.y + j.h) {
        explosionar(b.x, b.y, b.rad, "enemigo", 0);
        b.muerta = true;
      }
    }
    if (b.x < camX - 60 || b.x > camX + W + 60 || b.y < -90 || b.y > H + 20) b.muerta = true;
  }
  balasEnemigas = balasEnemigas.filter((b) => !b.muerta);
}

function explosionar(x, y, r, fuente, dmg) {
  explosiones.push({ x, y, r, t: 0, max: 26 });
  shake = Math.max(shake, r > 50 ? 8 : 5);
  sfxExplosion(r > 50);
  chispas(x, y, "#ffb347", 10);
  if (fuente === "jugador") {
    for (const e of enemigos) if (!e.muerto && distPuntoRect(x, y, e) < r) danar(e, dmg);
    if (jefe && !jefe.muerto && distPuntoRect(x, y, jefe) < r) danarJefe(dmg);
  } else if (!jugador.muerto && jugador.invuln <= 0 && distPuntoRect(x, y, jugador) < r * 0.8) {
    matarJugador();
  }
}

function chispas(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    particulas.push({ x, y, vx: random(-2.5, 2.5), vy: random(-3.5, 0.5), l: 18 + random(14), c: col, s: random(2, 4) });
  }
}
function popup(x, y, s) {
  popups.push({ x, y, s, t: 0 });
}

// ---------- Items y prisioneros ----------
function actualizarItems() {
  const j = jugador;
  for (const it of items) {
    it.t++;
    if (!j.muerto && j.x < it.x + 22 && j.x + j.w > it.x && j.y < it.y + 22 && j.y + j.h > it.y) {
      it.tomado = true;
      sfxItem();
      if (it.tipo === "H") {
        j.arma = "hmg";
        j.ammo = 120;
        popup(it.x, it.y, "AMETRALLADORA!");
      } else if (it.tipo === "G") {
        j.granadas = Math.min(25, j.granadas + 10);
        popup(it.x, it.y, "+10 GRANADAS");
      } else {
        vidas++;
        popup(it.x, it.y, "1UP!");
      }
    }
  }
  items = items.filter((it) => !it.tomado && it.x > camX - 60);
}

function actualizarPrisioneros() {
  const j = jugador;
  for (const p of prisioneros) {
    if (!p.liberado) {
      if (!j.muerto && j.x < p.x + p.w + 6 && j.x + j.w > p.x - 6 && j.y < p.y + p.h && j.y + j.h > p.y) {
        p.liberado = true;
        p.t = 0;
        rescatados++;
        const pts = 1000 * dif().mult;
        puntaje += pts;
        popup(p.x, p.y - 10, "RESCATE +" + pts);
        sfxPrisionero();
        const r = random();
        items.push({ x: p.x + 4, y: GROUND - 22, tipo: r < 0.45 ? "H" : r < 0.85 ? "G" : "V", t: 0 });
      }
    } else {
      p.t++;
      if (p.t > 40) p.x -= 2.2;
    }
  }
  prisioneros = prisioneros.filter((p) => !(p.liberado && p.x < camX - 50));
}

// ---------- Fin de nivel / partida ----------
function guardarRecord() {
  if (puntaje > record) {
    record = puntaje;
    try {
      localStorage.setItem("comando_michi_record", String(record));
    } catch (e) {}
  }
}

function terminarNivel() {
  estado = "nivelCompleto";
  bonusTiempo = Math.max(0, 3000 - Math.floor(tiempoNivel / 60) * 15);
  puntaje += bonusTiempo;
  guardarRecord();
  cancion = null;
  jingle([[523, 0.12, 0], [659, 0.12, 130], [784, 0.12, 260], [1047, 0.35, 390], [784, 0.12, 700], [1047, 0.5, 830]]);
}

function irAGameOver() {
  estado = "gameover";
  guardarRecord();
  cancion = null;
  jingle([[392, 0.25, 0], [330, 0.25, 280], [262, 0.25, 560], [196, 0.7, 840]]);
}

function siguienteNivel() {
  if (nivelIdx + 1 < ESCENARIOS.length) {
    iniciarNivel(nivelIdx + 1);
  } else {
    estado = "victoria";
    jingle([[523, 0.1, 0], [659, 0.1, 110], [784, 0.1, 220], [1047, 0.2, 330], [784, 0.1, 580], [1047, 0.1, 690], [1319, 0.5, 800]]);
  }
}

function reintentarNivel() {
  vidas = dif().vidas;
  puntaje = puntajeInicioNivel;
  iniciarNivel(nivelIdx);
}

// =====================================================================
//  DIBUJO DEL JUEGO
// =====================================================================
function dibujarJuego() {
  const E = escenario();
  dibujarFondo(E.id, camX, frameCount);
  push();
  translate(-Math.floor(camX) + Math.round(random(-shake, shake)), Math.round(random(-shake, shake)));
  dibujarSuelo(E.id, camX, frameCount);
  for (const p of plataformas) if (p.x + p.w > camX - 20 && p.x < camX + W + 20) dibujarPlataforma(p, E.id);
  for (const e of enemigos) if (!e.muerto && e.tipo !== "dron") sombra(e.x + e.w / 2, e.w, e.y + e.h);
  if (!jugador.muerto) sombra(jugador.x + jugador.w / 2, jugador.w, jugador.y + jugador.h);
  if (jefe && jefe.tipo === "tanque" && !jefe.muerto) sombra(jefe.x + jefe.w / 2, jefe.w, jefe.y + jefe.h);
  for (const p of prisioneros) dibujarPrisionero(p);
  for (const it of items) dibujarItem(it);
  for (const e of enemigos) dibujarEnemigo(e, E.id);
  if (jefe) {
    if (jefe.tipo === "tanque") dibujarTanque(jefe);
    else dibujarHelicoptero(jefe);
  }
  dibujarJugador();
  for (const b of balas) dibujarBalaJugador(b);
  for (const g of granadas) dibujarGranadaJugador(g);
  for (const b of balasEnemigas) dibujarBalaEnemiga(b);
  for (const e of explosiones) dibujarExplosion(e);
  noStroke();
  for (const q of particulas) {
    fill(q.c);
    rect(q.x, q.y, q.s, q.s);
  }
  for (const p of popups) texto(p.s, p.x, p.y, 12, "#ffe14d", CENTER);
  pop();
  vineta();
  dibujarHUD();
  dibujarOverlaysDeNivel();
}

function dibujarEnemigo(e, tema) {
  if (e.tipo === "dron") {
    dibujarDron(e);
    return;
  }
  const o = {
    f: e.f, t: e.t, moving: e.moviendo, aim: "side", flash: e.flash, ears: "dog", knife: e.tipo === "corredor",
    pal: paletaEnemigo(e.tipo, tema),
  };
  if (e.muerto) o.dead = e.morirT / 30;
  drawSoldier(e.x, e.y, o);
  if (e.hitT > 0 && !e.muerto) {
    noStroke();
    fill(255, 255, 255, 140);
    rect(e.x - 2, e.y, e.w + 4, e.h);
  }
}

function dibujarJugador() {
  const j = jugador;
  if (j.invuln > 0 && !j.muerto && Math.floor(frameCount / 4) % 2 === 0) return;
  if (j.vehiculo === "tanque") {
    const ot = { f: j.f, t: j.t, moving: j.moviendo, aim: j.apunta, flash: j.flash, escudo: j.escudo };
    if (j.muerto) ot.dead = j.muertoT / 50;
    drawTankJugador(j.x, j.y, ot);
    return;
  }
  const o = {
    f: j.f, t: j.t, moving: j.moviendo, crouch: j.agachado, aim: j.apunta, air: !j.enSuelo,
    flash: j.flash, pal: PAL_JUGADOR, ears: "cat", hmg: j.arma === "hmg",
  };
  if (j.muerto) o.dead = j.muertoT / 50;
  drawSoldier(j.x, j.y, o);
}

function corazon(x, y) {
  noStroke();
  fill("#ff3b5c");
  circle(x - 3, y - 2, 7);
  circle(x + 3, y - 2, 7);
  triangle(x - 6.5, y, x + 6.5, y, x, y + 7);
}

function dibujarHUD() {
  const E = escenario();
  noStroke();
  fill(0, 0, 0, 90);
  rect(0, 0, W, 48);
  if (jugador.vehiculo === "tanque") {
    texto("BLINDAJE", 12, 62, 11, "#9ec1ff");
    for (let i = 0; i < 2; i++) px(84 + i * 18, 57, 14, 10, i < jugador.escudo ? "#6f9bf0" : "#222");
  }
  for (let i = 0; i < Math.min(vidas, 9); i++) corazon(18 + i * 17, 20);
  texto("PUNTOS " + String(puntaje).padStart(6, "0"), 12, 42, 14, "#ffffff");
  texto(E.mision + ": " + E.nombre, W / 2, 16, 13, "#ffe14d", CENTER);
  texto("RÉCORD " + String(Math.max(record, puntaje)).padStart(6, "0"), W / 2, 34, 11, "#cfd6e3", CENTER);
  const j = jugador;
  texto(j.arma === "hmg" ? "AMETRALLADORA " + j.ammo : (jugador.vehiculo === "tanque" ? "CAÑÓN ∞" : "PISTOLA ∞"), W - 12, 16, 13, j.arma === "hmg" ? "#ffa63d" : "#ffffff", RIGHT);
  texto("GRANADAS " + j.granadas, W - 12, 36, 13, "#8be28b", RIGHT);
  texto(dif().nombre + " · PRISIONEROS " + rescatados + "/" + escenario().prisioneros.length, 12, H - 12, 11, "#ffffffcc");
  texto("PROMPTS: " + PROMPTS_USADOS, W - 12, H - 12, 11, "#ffffffcc", RIGHT);

  if (jefeActivo && jefe && !jefe.muerto) {
    const bw = 300;
    const bx = W / 2 - bw / 2;
    texto(E.jefeNombre, W / 2, 56, 11, "#ff8a8a", CENTER);
    px(bx - 2, 64, bw + 4, 12, "#000");
    px(bx, 66, bw, 8, "#400");
    px(bx, 66, bw * Math.max(0, jefe.hp / jefe.hpMax), 8, "#ff3b3b");
  }
  // cartel "AVANZÁ"
  if (estado === "jugando" && !jefeActivo && enemigos.filter((e) => !e.muerto).length === 0 && Math.floor(frameCount / 30) % 2 === 0) {
    texto("¡AVANZÁ ▶", W - 20, 90, 22, "#ffe14d", RIGHT);
  }
}

function dibujarOverlaysDeNivel() {
  const E = escenario();
  if (estado === "jugando" && introT < 170) {
    const a = introT < 140 ? 1 : 1 - (introT - 140) / 30;
    noStroke();
    fill(0, 0, 0, 170 * a);
    rect(0, H / 2 - 70, W, 140);
    push();
    drawingContext.globalAlpha = a;
    texto(E.mision, W / 2, H / 2 - 42, 22, "#ffe14d", CENTER);
    texto(E.nombre, W / 2, H / 2 - 10, 36, "#ffffff", CENTER);
    texto("Llegá al final, rescatá prisioneros y destruí al jefe", W / 2, H / 2 + 28, 14, "#cfd6e3", CENTER);
    texto("Dificultad: " + dif().nombre, W / 2, H / 2 + 50, 12, "#ff9a9a", CENTER);
    pop();
  }
  if (estado === "jugando" && tiempoNivel < 420 && introT >= 170) {
    noStroke();
    fill(0, 0, 0, 120);
    rect(0, H - 54, W, 24);
    texto("←→ mover   ↑ apuntar arriba   Z saltar   X disparar   C granada   P pausa   M audio", W / 2, H - 42, 12, "#ffffff", CENTER);
  }
  if (alertaT > 0 && Math.floor(alertaT / 10) % 2 === 0) texto("¡¡ ALERTA !!  JEFE", W / 2, 130, 30, "#ff3b3b", CENTER);
}

function overlayPausa() {
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, 0, W, H);
  texto("PAUSA", W / 2, H / 2 - 40, 44, "#ffe14d", CENTER);
  texto("P / ENTER: continuar", W / 2, H / 2 + 10, 16, "#ffffff", CENTER);
  texto("ESC: volver al menú", W / 2, H / 2 + 36, 16, "#ffffff", CENTER);
}

function overlayNivelCompleto() {
  noStroke();
  fill(0, 0, 0, 175);
  rect(0, 0, W, H);
  texto("¡MISIÓN COMPLETADA!", W / 2, 80, 36, "#ffe14d", CENTER);
  texto(escenario().mision + " — " + escenario().nombre, W / 2, 118, 16, "#cfd6e3", CENTER);
  texto("Prisioneros rescatados: " + rescatados + " / " + escenario().prisioneros.length, W / 2, 190, 18, "#ffffff", CENTER);
  texto("Bonus de tiempo: +" + bonusTiempo, W / 2, 222, 18, "#ffffff", CENTER);
  texto("PUNTAJE: " + puntaje, W / 2, 270, 26, "#8be28b", CENTER);
  texto("RÉCORD: " + record, W / 2, 300, 14, "#cfd6e3", CENTER);
  if (Math.floor(frameCount / 30) % 2 === 0) {
    const sig = nivelIdx + 1 < ESCENARIOS.length ? "ENTER: siguiente misión" : "ENTER: continuar";
    texto(sig, W / 2, 370, 18, "#ffe14d", CENTER);
  }
}

function overlayGameOver() {
  noStroke();
  fill(0, 0, 0, 190);
  rect(0, 0, W, H);
  texto("GAME OVER", W / 2, 120, 58, "#ff3b3b", CENTER);
  texto("PUNTAJE: " + puntaje, W / 2, 200, 24, "#ffffff", CENTER);
  texto("RÉCORD: " + record, W / 2, 232, 14, "#cfd6e3", CENTER);
  texto("ENTER: reintentar la misión", W / 2, 300, 16, "#ffe14d", CENTER);
  texto("ESC: volver al menú", W / 2, 328, 16, "#ffffff", CENTER);
}

function overlayVictoria() {
  noStroke();
  fill(0, 0, 0, 185);
  rect(0, 0, W, H);
  texto("¡VICTORIA!", W / 2, 90, 58, "#ffe14d", CENTER);
  texto("El Comando Michi recuperó el láser rojo", W / 2, 140, 16, "#cfd6e3", CENTER);
  texto("PUNTAJE FINAL: " + puntaje, W / 2, 205, 26, "#8be28b", CENTER);
  texto("RÉCORD: " + record, W / 2, 238, 14, "#cfd6e3", CENTER);
  texto("Dificultad: " + dif().nombre + "   ·   Prompts usados: " + PROMPTS_USADOS, W / 2, 270, 14, "#ffffff", CENTER);
  if (Math.floor(frameCount / 30) % 2 === 0) texto("ENTER: volver al menú", W / 2, 340, 18, "#ffe14d", CENTER);
}

// =====================================================================
//  MENÚ PRINCIPAL, CÓMO JUGAR Y SALIR
// =====================================================================
function textoOpcion(i) {
  switch (i) {
    case 0: return "JUGAR";
    case 1: return "DIFICULTAD  ◀ " + dif().nombre + " ▶";
    case 2: return "MISIÓN  ◀ " + (nivelInicial + 1) + " · " + ESCENARIOS[nivelInicial].nombre + " ▶";
    case 3: return "CÓMO JUGAR";
    default: return "AUDIO: " + (soundMuted ? "SILENCIO" : "ACTIVADO");
  }
}
const BTN_Y = (i) => 190 + i * 42;

function textoPlano(t, x, y, tam, col, al) {
  noStroke();
  fill(col);
  textAlign(al || LEFT, CENTER);
  textSize(tam);
  text(t, x, y);
}

function fondoMenu() {
  camX += 0.8;
  dibujarFondo("ciudad", camX, frameCount);
  push();
  translate(-Math.floor(camX), 0);
  dibujarSuelo("ciudad", camX, frameCount);
  pop();
}

function dibujarMenu() {
  fondoMenu();
  const g = drawingContext.createLinearGradient(0, 0, 520, 0);
  g.addColorStop(0, "rgba(5,8,16,0.95)");
  g.addColorStop(0.7, "rgba(5,8,16,0.7)");
  g.addColorStop(1, "rgba(5,8,16,0)");
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, 520, H);

  // héroes de la portada
  push();
  translate(560, GROUND);
  scale(1.7);
  drawTankJugador(-35, -38, { f: 1, t: frameCount, moving: true, aim: "side", flash: Math.floor(frameCount / 16) % 4 === 0 ? 4 : 0, escudo: 2 });
  pop();
  push();
  translate(700, GROUND);
  scale(1.7);
  drawSoldier(-12, -44, { f: 1, t: frameCount, moving: true, aim: "side", pal: PAL_JUGADOR, ears: "cat", flash: Math.floor(frameCount / 8) % 3 === 0 ? 2 : 0 });
  pop();

  // título
  texto("COMANDO", 43, 49, 50, "#000", LEFT);
  texto("COMANDO", 40, 46, 50, "#ffc93c", LEFT);
  texto("MICHI", 43, 107, 70, "#000", LEFT);
  texto("MICHI", 40, 104, 70, "#ff5a3c", LEFT);
  textoPlano("OPERACIÓN LÁSER ROJO", 42, 152, 13, "#8be28b");
  textoPlano("Rescatá prisioneros · destruí al jefe · recuperá el láser", 42, 170, 11, "#cfd6e3");

  // botones
  for (let i = 0; i < ITEMS_MENU; i++) {
    const act = i === sel;
    const y = BTN_Y(i);
    noStroke();
    fill(act ? "#ffc93c" : "rgba(255,255,255,0.09)");
    rect(40, y, 340, 36, 8);
    if (!act) {
      noFill();
      stroke(255, 255, 255, 50);
      rect(40, y, 340, 36, 8);
      noStroke();
    }
    textoPlano(textoOpcion(i), 58, y + 19, 15, act ? "#1a1208" : "#ffffff");
  }

  // barra inferior
  noStroke();
  fill(0, 0, 0, 160);
  rect(0, H - 30, W, 30);
  textoPlano("↑↓ elegir · ←→ cambiar · ENTER aceptar · el mouse también funciona · M audio", W / 2, H - 15, 11, "#cfd6e3", CENTER);
  textoPlano("RÉCORD " + record, W - 14, 16, 12, "#ffffff", RIGHT);
  textoPlano("PROMPTS USADOS: " + PROMPTS_USADOS, W - 14, 34, 11, "#cfd6e3", RIGHT);
}

const CARDS = [{ x: 50, y: 80, w: 330, h: 280 }, { x: 420, y: 80, w: 330, h: 280 }];
const INFO_VEH = [
  ["MICHI COMANDO", "Rápido y ágil", "Salta alto y se agacha", "1 impacto = 1 vida"],
  ["TANQUE MICHI", "Cañón potente (3 de daño)", "Blindaje: aguanta 2 golpes extra", "Más lento y más grande"],
];

function dibujarVehiculo() {
  fondoMenu();
  noStroke();
  fill(5, 8, 16, 205);
  rect(0, 0, W, H);
  texto("ELEGÍ TU VEHÍCULO", W / 2, 40, 30, "#ffc93c", CENTER);
  CARDS.forEach((c, i) => {
    const act = i === vehSel;
    noStroke();
    fill(act ? "rgba(255,201,60,0.14)" : "rgba(255,255,255,0.06)");
    rect(c.x, c.y, c.w, c.h, 12);
    noFill();
    stroke(act ? "#ffc93c" : "rgba(255,255,255,0.25)");
    strokeWeight(act ? 3 : 1);
    rect(c.x, c.y, c.w, c.h, 12);
    noStroke();
    const base = c.y + 150;
    px(c.x + 24, base, c.w - 48, 6, "#4a3a28");
    push();
    translate(c.x + c.w / 2, base);
    scale(2);
    if (i === 0) drawSoldier(-12, -44, { f: 1, t: frameCount, moving: act, aim: "side", pal: PAL_JUGADOR, ears: "cat", flash: act && Math.floor(frameCount / 10) % 3 === 0 ? 2 : 0 });
    else drawTankJugador(-35, -38, { f: 1, t: frameCount, moving: act, aim: "side", flash: act && Math.floor(frameCount / 14) % 3 === 0 ? 4 : 0, escudo: 2 });
    pop();
    const inf = INFO_VEH[i];
    textoPlano(inf[0], c.x + c.w / 2, c.y + 182, 20, act ? "#ffc93c" : "#ffffff", CENTER);
    for (let k = 1; k < 4; k++) textoPlano(inf[k], c.x + c.w / 2, c.y + 190 + k * 20, 13, "#cfd6e3", CENTER);
  });
  textoPlano("← → elegir  ·  ENTER confirmar  ·  ESC volver", W / 2, 400, 14, Math.floor(frameCount / 30) % 2 ? "#ffffff" : "#ffc93c", CENTER);
}

function cardBajoMouse() {
  for (let i = 0; i < CARDS.length; i++) {
    const c = CARDS[i];
    if (mouseX > c.x && mouseX < c.x + c.w && mouseY > c.y && mouseY < c.y + c.h) return i;
  }
  return -1;
}

function cambiarOpcion(i, dir) {
  if (i === 1) difIdx = (difIdx + dir + DIFICULTADES.length) % DIFICULTADES.length;
  else if (i === 2) nivelInicial = (nivelInicial + dir + ESCENARIOS.length) % ESCENARIOS.length;
  else if (i === 4) toggleAudio();
  else return;
  sfxMenu();
}

function activarOpcion(i) {
  sfxElegir();
  if (i === 0) estado = "vehiculo";
  else if (i === 1 || i === 2) cambiarOpcion(i, 1);
  else if (i === 3) estado = "comoJugar";
  else if (i === 4) toggleAudio();
}

function dibujarComoJugar() {
  background(12, 16, 28);
  stroke(0, 255, 204, 90);
  noFill();
  rect(10, 10, W - 20, H - 20);
  texto("CÓMO JUGAR", W / 2, 38, 30, "#ffe14d", CENTER);

  texto("OBJETIVO", 40, 76, 15, "#8be28b");
  texto("Cruzá cada misión de izquierda a derecha eliminando enemigos, rescatá", 40, 98, 13, "#ffffff");
  texto("prisioneros y destruí al JEFE del final. Si perdés todas las vidas: GAME OVER.", 40, 116, 13, "#ffffff");

  texto("CONTROLES", 40, 148, 15, "#8be28b");
  const filas = [
    ["← →  /  A D", "Moverse"],
    ["↑  /  W", "Apuntar hacia arriba"],
    ["↓  /  S", "Agacharse (en el aire: apuntar abajo)"],
    ["Z", "Saltar  (↓ + Z: bajar de una plataforma)"],
    ["X  /  ESPACIO", "Disparar (mantené apretado)"],
    ["C", "Tirar granada"],
    ["P  ·  M", "Pausa  ·  Audio on/off"],
  ];
  filas.forEach((f, i) => {
    texto(f[0], 50, 172 + i * 21, 13, "#ffe14d");
    texto(f[1], 230, 172 + i * 21, 13, "#ffffff");
  });

  texto("OBJETOS Y RESCATES", 40, 330, 15, "#8be28b");
  dibujarItem({ x: 50, y: 346, tipo: "H", t: 0 });
  texto("Ametralladora (120 balas)", 82, 358, 12, "#ffffff");
  dibujarItem({ x: 300, y: 346, tipo: "G", t: 0 });
  texto("+10 granadas", 332, 358, 12, "#ffffff");
  dibujarItem({ x: 470, y: 346, tipo: "V", t: 0 });
  texto("Vida extra", 502, 358, 12, "#ffffff");
  dibujarPrisionero({ x: 640, y: 346, liberado: false, t: 0, f: -1 });
  texto("¡Rescatalo! +1000", 672, 372, 11, "#ffffff");

  texto("Michi a pie: un impacto = una vida. ¡Agachate para esquivar balas altas!", W / 2, 394, 12, "#ff9a9a", CENTER);
  texto("TANQUE: cañón potente (X) y blindaje que aguanta 2 golpes extra. No se agacha.", W / 2, 412, 12, "#9ec1ff", CENTER);
  if (Math.floor(frameCount / 30) % 2 === 0) texto("ENTER / clic: volver al menú", W / 2, 435, 14, "#ffe14d", CENTER);
}

function dibujarSalir() {
  background(5, 7, 14);
  texto("¡GRACIAS POR JUGAR!", W / 2, H / 2 - 40, 38, "#ffe14d", CENTER);
  texto("Cerrá esta pestaña para salir (el navegador no deja que un juego la cierre solo).", W / 2, H / 2 + 6, 13, "#ffffff", CENTER);
  if (Math.floor(frameCount / 30) % 2 === 0) texto("Presioná cualquier tecla para volver al menú", W / 2, H / 2 + 50, 14, "#cfd6e3", CENTER);
}

// =====================================================================
//  ENTRADA: TECLADO Y MOUSE
// =====================================================================
function modalAbierto() {
  const m = document.getElementById("instructions-modal");
  return m && m.style.display === "flex";
}

function keyPressed() {
  userStartAudio();
  if (modalAbierto()) return;
  const k = keyCode;
  const ENTER_ = k === ENTER || k === 13;
  const bloquear = [32, 37, 38, 39, 40].includes(k);

  if (k === 77 && estado !== "salir") {
    toggleAudio(); // tecla M
    return false;
  }

  switch (estado) {
    case "menu":
      if (k === UP_ARROW || k === 87) {
        sel = (sel + ITEMS_MENU - 1) % ITEMS_MENU;
        sfxMenu();
      } else if (k === DOWN_ARROW || k === 83) {
        sel = (sel + 1) % ITEMS_MENU;
        sfxMenu();
      } else if (k === LEFT_ARROW || k === 65) cambiarOpcion(sel, -1);
      else if (k === RIGHT_ARROW || k === 68) cambiarOpcion(sel, 1);
      else if (ENTER_ || k === 32) activarOpcion(sel);
      break;
    case "vehiculo":
      if (k === LEFT_ARROW || k === 65 || k === RIGHT_ARROW || k === 68) {
        vehSel = 1 - vehSel;
        sfxMenu();
      } else if (ENTER_ || k === 32) {
        sfxElegir();
        comenzarJuego();
      } else if (k === 27) estado = "menu";
      break;
    case "comoJugar":
      if (ENTER_ || k === 27 || k === 32) {
        estado = "menu";
        sfxMenu();
      }
      break;
    case "salir":
      irAMenu();
      break;
    case "jugando":
      if (k === 90 || k === 74) saltar();
      else if (k === 67) lanzarGranada();
      else if (k === 80 || k === 27) estado = "pausa";
      break;
    case "pausa":
      if (k === 80 || ENTER_) estado = "jugando";
      else if (k === 27) irAMenu();
      break;
    case "nivelCompleto":
      if (ENTER_ || k === 32) siguienteNivel();
      break;
    case "gameover":
      if (ENTER_) reintentarNivel();
      else if (k === 27) irAMenu();
      break;
    case "victoria":
      if (ENTER_ || k === 27) irAMenu();
      break;
  }
  if (bloquear) return false;
}

function mouseDentro() {
  return mouseX >= 0 && mouseX <= W && mouseY >= 0 && mouseY <= H;
}
function opcionBajoMouse() {
  for (let i = 0; i < ITEMS_MENU; i++) {
    if (mouseX >= 40 && mouseX <= 380 && mouseY >= BTN_Y(i) && mouseY <= BTN_Y(i) + 36) return i;
  }
  return -1;
}
function mouseMoved() {
  if (!mouseDentro()) return;
  if (estado === "menu") {
    const i = opcionBajoMouse();
    if (i >= 0 && i !== sel) {
      sel = i;
      sfxMenu();
    }
  } else if (estado === "vehiculo") {
    const i = cardBajoMouse();
    if (i >= 0 && i !== vehSel) {
      vehSel = i;
      sfxMenu();
    }
  }
}
function mousePressed() {
  userStartAudio();
  if (!mouseDentro()) return;
  if (estado === "menu") {
    const i = opcionBajoMouse();
    if (i >= 0) {
      sel = i;
      if ((i === 1 || i === 2) && mouseX < 175) {
        cambiarOpcion(i, -1);
        return;
      }
      activarOpcion(i);
    }
  } else if (estado === "vehiculo") {
    const i = cardBajoMouse();
    if (i >= 0) {
      vehSel = i;
      sfxElegir();
      comenzarJuego();
    }
  } else if (estado === "comoJugar") estado = "menu";
  else if (estado === "nivelCompleto") siguienteNivel();
  else if (estado === "gameover") reintentarNivel();
  else if (estado === "victoria") irAMenu();
}
