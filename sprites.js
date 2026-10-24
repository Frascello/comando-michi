// =====================================================================
//  SPRITES.JS  —  El taller de arte de COMANDO MICHI
//  Todo se dibuja por código con rectángulos (estilo píxel-art).
//  Pedile a la IA: "cambiá los colores del michi", "agregá un enemigo nuevo", etc.
// =====================================================================

// Rectángulo de color (el "píxel" básico del juego)
function px(x, y, w, h, c) {
  noStroke();
  fill(c);
  rect(x, y, w, h);
}

// Número pseudo-aleatorio estable a partir de un entero (para decorar el mundo)
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Texto con contorno negro (se lee bien sobre cualquier fondo)
function texto(s, x, y, tam, col, alineacion) {
  textAlign(alineacion || LEFT, CENTER);
  textSize(tam);
  strokeJoin(ROUND);
  stroke(0);
  strokeWeight(Math.max(2, tam / 5));
  fill(col);
  text(s, x, y);
  noStroke();
}

// ---------------------------------------------------------------------
//  PERSONAJES (michi comando y enemigos usan la misma función)
// ---------------------------------------------------------------------
// (x, y) = esquina superior izquierda del hitbox (24 de ancho).
// o = { f: 1|-1, t, moving, crouch, aim:'side'|'up'|'down', air, flash,
//       pal, ears:'cat'|'dog', knife, hmg, sinArma, dead }
function drawSoldier(x, y, o) {
  const p = o.pal;
  const air = !!o.air;
  const cr = !!o.crouch;
  const hh = cr ? 28 : 44;
  push();
  translate(Math.round(x + 12), Math.round(y));
  scale(o.f, 1);
  if (o.dead !== undefined) {
    const k = Math.min(1, o.dead * 2.5);
    translate(0, hh);
    rotate(-k * HALF_PI);
    translate(0, -hh);
    drawingContext.globalAlpha = Math.max(0, 1 - Math.max(0, o.dead - 0.6) * 2.5);
  }
  const ph = Math.sin(o.t * 0.4) * 5;
  const run = o.moving && !air && !cr;

  // orejas caídas (perros) van detrás de la cabeza
  if (o.ears === "dog") px(-8, 4, 3, 8, p.ear);

  // piernas
  if (cr) {
    px(-8, 22, 16, 6, p.pants);
    px(-9, 26, 11, 2, p.boots);
  } else if (air) {
    px(-6, 26, 5, 9, p.pants);
    px(1, 26, 5, 11, p.pants);
    px(-7, 34, 7, 3, p.boots);
    px(0, 36, 8, 3, p.boots);
  } else {
    const a = run ? ph : 0;
    px(-6 + a, 26, 5, 14, p.pants);
    px(-6 + a, 40, 7, 4, p.boots);
    px(1 - a, 26, 5, 14, p.pants);
    px(1 - a, 40, 7, 4, p.boots);
  }

  // torso + mochila + cinturón
  const th = cr ? 10 : 14;
  px(-9, 13, 4, cr ? 7 : 10, p.pack);
  px(-6, 12, 12, th, p.shirt);
  px(-6, 12 + th - 3, 12, 3, p.belt);

  // cabeza
  px(-5, 4, 10, 8, p.skin);
  px(2, 7, 2, 2, "#111");
  px(-6, 1, 12, 4, p.hat);
  px(-9, 3, 4, 2, p.hat);
  if (o.ears === "cat") {
    noStroke();
    fill(p.ear);
    triangle(-6, 2, -6, -5, -1, 1);
    triangle(0, 1, 6, -5, 6, 2);
    fill("#ff9bb0");
    triangle(-5, 1, -5, -2, -3, 1);
    triangle(2, 1, 5, -2, 5, 1);
  }

  // brazo + arma
  push();
  translate(2, cr ? 15 : 17);
  if (o.sinArma) {
    rotate(-HALF_PI * 0.85);
    px(0, -2, 9, 4, p.skin);
  } else if (o.knife) {
    px(0, -2, 6, 4, p.skin);
    px(5, -9, 2, 11, "#d0d0d0");
  } else {
    rotate(o.aim === "up" ? -HALF_PI : o.aim === "down" ? HALF_PI : 0);
    px(0, -2, 7, 4, p.skin);
    const gc = o.hmg ? "#d9822b" : "#333";
    px(5, -3, o.hmg ? 18 : 14, 5, gc);
    px(6, 2, 4, 5, "#222");
    px(o.hmg ? 21 : 17, -2, 4, 2, "#666");
    if (o.flash > 0) {
      noStroke();
      fill(255, 230, 90);
      ellipse(o.hmg ? 28 : 24, 0, 12, 7);
      fill(255, 255, 255);
      ellipse(o.hmg ? 28 : 24, 0, 6, 3);
    }
  }
  pop();
  pop();
}

// Paleta de los enemigos según tipo y escenario
function paletaEnemigo(tipo, tema) {
  const base = { skin: "#b9a99a", boots: "#1d1d1d", belt: "#2a2a2a", pack: "#3a3a3a", ear: "#4a3b30" };
  const shirts = {
    desierto: { rifle: "#9c7a45", corredor: "#b5442f", granadero: "#5f6f3a", francotirador: "#6d5a3a" },
    ciudad: { rifle: "#4b5a7a", corredor: "#a33a5a", granadero: "#3f4f66", francotirador: "#2f3a52" },
  };
  const pants = { desierto: "#5a4a2a", ciudad: "#2d3448" };
  const hats = { desierto: "#6b2d2d", ciudad: "#1f2433" };
  return Object.assign({}, base, { shirt: shirts[tema][tipo], pants: pants[tema], hat: hats[tema] });
}

const PAL_PRISIONERO = { skin: "#d9b38c", ear: "#c49a72", shirt: "#d8d2c0", pants: "#8a7a5a", hat: "#d8d2c0", boots: "#5a4a3a", belt: "#8a7a5a", pack: "#d8d2c0" };

function dibujarDron(e) {
  push();
  translate(Math.round(e.x + 15), Math.round(e.y + 9));
  const muerto = e.muerto;
  if (muerto) rotate(e.morirT * 0.2);
  px(-14, -5, 28, 10, "#444b57");
  px(-8, -9, 16, 5, "#6a7280");
  px(-12, 4, 24, 3, "#2a2e36");
  px(e.f < 0 ? -14 : 8, -2, 6, 4, "#ff3b3b");
  const w = 16 + Math.abs(Math.sin(frameCount * 0.9)) * 22;
  px(-w, -12, w * 2, 2, "#cfd6e3");
  pop();
}

// ---------------------------------------------------------------------
//  OBJETOS
// ---------------------------------------------------------------------
function dibujarItem(it) {
  const bob = Math.round(Math.sin(it.t * 0.1) * 3);
  const col = it.tipo === "H" ? "#e67e22" : it.tipo === "G" ? "#4caf50" : "#3b82f6";
  const etiqueta = it.tipo === "V" ? "1UP" : it.tipo;
  px(it.x, it.y + bob, 22, 22, "#111");
  px(it.x + 2, it.y + bob + 2, 18, 18, col);
  px(it.x + 2, it.y + bob + 2, 18, 4, "#ffffff55");
  textAlign(CENTER, CENTER);
  textSize(it.tipo === "V" ? 9 : 13);
  noStroke();
  fill(255);
  text(etiqueta, it.x + 11, it.y + bob + 12);
}

function dibujarPrisionero(p) {
  if (!p.liberado) {
    px(p.x + 20, p.y, 4, 30, "#5b3a1a"); // poste
    px(p.x + 4, p.y + 14, 16, 16, "#d8d2c0"); // cuerpo
    px(p.x + 6, p.y + 3, 12, 11, "#d9b38c"); // cabeza
    px(p.x + 6, p.y + 10, 12, 5, "#eeeeee"); // barba
    px(p.x + 14, p.y + 6, 2, 2, "#111");
    px(p.x + 3, p.y + 4, 3, 7, "#c49a72"); // oreja
    px(p.x + 4, p.y + 19, 16, 2, "#8b5a2b"); // soga
    px(p.x + 4, p.y + 24, 16, 2, "#8b5a2b");
    if (Math.floor(frameCount / 25) % 2 === 0) texto("¡AYUDA!", p.x + 12, p.y - 10, 10, "#ffffff", CENTER);
  } else {
    drawSoldier(p.x, p.y - 14, { f: p.f, t: p.t, moving: p.t > 40, aim: "side", pal: PAL_PRISIONERO, ears: "cat", sinArma: p.t <= 40 });
  }
}

function dibujarPlataforma(p, tema) {
  if (tema === "desierto") {
    for (let sx = p.x + 8; sx < p.x + p.w - 8; sx += 60) px(sx, p.y + 10, 6, GROUND - p.y - 10, "#5b3a1a");
    px(p.x, p.y, p.w, 10, "#8b5a2b");
    px(p.x, p.y, p.w, 3, "#b88246");
    for (let sx = p.x + 20; sx < p.x + p.w; sx += 24) px(sx, p.y + 3, 1, 7, "#5b3a1a");
    // bolsas de arena en el borde
    px(p.x + 4, p.y - 8, 18, 8, "#b79a5b");
    px(p.x + p.w - 22, p.y - 8, 18, 8, "#b79a5b");
  } else {
    for (let sx = p.x + 8; sx < p.x + p.w - 8; sx += 60) px(sx, p.y + 10, 6, GROUND - p.y - 10, "#3a4056");
    px(p.x, p.y, p.w, 10, "#59607a");
    px(p.x, p.y, p.w, 3, "#8a93b0");
    for (let sx = p.x + 6; sx < p.x + p.w; sx += 18) px(sx, p.y + 5, 3, 3, "#2a2f40");
    px(p.x, p.y + 10, p.w, 3, "#f1c40f55");
  }
}

function dibujarBalaJugador(b) {
  noStroke();
  fill(255, 220, 90, 70);
  circle(b.x, b.y, b.big ? 22 : 12);
  if (b.big) {
    fill("#ff9a2e");
    circle(b.x, b.y, 11);
    fill("#fff6c0");
    circle(b.x, b.y, 5);
    return;
  }
  if (Math.abs(b.vx) >= Math.abs(b.vy)) px(b.x - 4, b.y - 1, 8, 3, b.hmg ? "#ffa63d" : "#fff27a");
  else px(b.x - 1, b.y - 4, 3, 8, b.hmg ? "#ffa63d" : "#fff27a");
}

function dibujarBalaEnemiga(b) {
  noStroke();
  if (b.tipo === "bala") {
    fill("#ff3b3b");
    circle(b.x, b.y, 7);
    fill(255);
    circle(b.x, b.y, 3);
  } else if (b.tipo === "granada") {
    fill("#2f5d2f");
    circle(b.x, b.y, 10);
    fill("#7fbf7f");
    circle(b.x - 2, b.y - 2, 3);
  } else if (b.tipo === "bomba") {
    fill("#2a2a2a");
    ellipse(b.x, b.y, 10, 14);
    fill("#ff3b3b");
    rect(b.x - 2, b.y + 4, 4, 4);
  } else {
    fill("#1a1a1a");
    circle(b.x, b.y, 16);
    fill("#ff7a1a");
    circle(b.x - 2, b.y - 2, 5);
  }
}

function dibujarGranadaJugador(g) {
  push();
  translate(g.x, g.y);
  rotate(g.t * 0.3);
  px(-4, -4, 8, 8, "#2f5d2f");
  px(-1, -6, 3, 3, "#999");
  pop();
}

function dibujarExplosion(e) {
  const k = e.t / e.max;
  const r = e.r * (0.35 + 0.9 * k);
  noStroke();
  fill(90, 90, 90, 160 * (1 - k));
  circle(e.x, e.y - r * 0.2, r * 2.1);
  fill(255, 120, 20, 255 * (1 - k));
  circle(e.x, e.y, r * 1.7);
  fill(255, 210, 60, 255 * (1 - k));
  circle(e.x, e.y, r * 1.1);
  fill(255, 255, 220, 255 * (1 - k * 1.4));
  circle(e.x, e.y, r * 0.5);
  noFill();
  stroke(255, 255, 255, 140 * (1 - k));
  strokeWeight(2);
  circle(e.x, e.y, r * (1.6 + 1.6 * k));
  noStroke();
}

// ---------------------------------------------------------------------
//  JEFES
// ---------------------------------------------------------------------
function dibujarTanque(b) {
  push();
  translate(Math.round(b.x), Math.round(b.y));
  px(0, 50, 150, 20, "#262626");
  for (let i = 0; i < 7; i++) {
    fill("#444");
    noStroke();
    circle(12 + i * 21, 60, 17);
    fill("#222");
    circle(12 + i * 21, 60, 7);
  }
  px(8, 28, 134, 26, "#5d6e3c");
  px(8, 28, 134, 5, "#7a8f4d");
  px(50, 6, 64, 26, "#6a7d43");
  px(50, 6, 64, 4, "#8aa056");
  const retro = Math.sin(b.t * 0.5) * (b.estado === "combate" && b.cd1 > 170 ? 3 : 0);
  px(-34 + retro, 14, 88, 8, "#3b4726");
  px(-40 + retro, 12, 8, 12, "#2a331a");
  px(30, 2, 24, 5, "#222");
  px(100, 36, 10, 8, "#c0392b");
  if (b.hp < b.hpMax * 0.5 && !b.muerto) {
    fill(60, 60, 60, 150);
    circle(90 + Math.sin(b.t * 0.2) * 6, -4 - (b.t % 30), 18);
  }
  if (b.hitT > 0) {
    fill(255, 255, 255, 130);
    rect(0, 0, 150, 70);
  }
  pop();
}

function dibujarHelicoptero(b) {
  push();
  translate(Math.round(b.x), Math.round(b.y));
  px(95, 20, 55, 10, "#3c4650");
  px(146, 6, 6, 26, "#3c4650");
  const s = Math.abs(Math.sin(b.t * 1.1));
  px(147, 19 - 14 * s, 4, 28 * s + 2, "#222");
  noStroke();
  fill("#55626f");
  ellipse(60, 34, 124, 52);
  fill("#2f3943");
  ellipse(70, 46, 90, 14);
  fill("#8fd3f4");
  ellipse(32, 30, 50, 32);
  fill(255, 255, 255, 80);
  ellipse(26, 24, 18, 10);
  px(40, 58, 90, 3, "#222");
  px(52, 48, 3, 11, "#222");
  px(110, 48, 3, 11, "#222");
  const w = 150 * Math.abs(Math.cos(b.t * 0.85)) + 20;
  px(70 - w / 2, 4, w, 3, "#1a1a1a");
  px(66, 7, 8, 6, "#222");
  px(8, 40, 14, 5, "#c0392b");
  if (b.hp < b.hpMax * 0.5 && !b.muerto) {
    fill(50, 50, 50, 150);
    circle(120 + Math.sin(b.t * 0.2) * 5, 30 - (b.t % 40), 16);
  }
  if (b.hitT > 0) {
    fill(255, 255, 255, 130);
    ellipse(60, 34, 124, 52);
  }
  pop();
}

// ---------------------------------------------------------------------
//  FONDOS (con parallax)
// ---------------------------------------------------------------------
let fondoDesierto, fondoCiudad;

function gradiente(pg, paradas, hasta) {
  for (let y = 0; y < H; y += 2) {
    const t = Math.min(1, y / hasta);
    let i = 0;
    while (i < paradas.length - 2 && t > paradas[i + 1][0]) i++;
    const a = paradas[i];
    const b = paradas[i + 1];
    const u = constrain((t - a[0]) / (b[0] - a[0]), 0, 1);
    pg.noStroke();
    pg.fill(lerpColor(color(a[1]), color(b[1]), u));
    pg.rect(0, y, W, 2);
  }
}

function construirFondos() {
  // Desierto: atardecer
  fondoDesierto = createGraphics(W, H);
  gradiente(fondoDesierto, [[0, "#2b1055"], [0.55, "#c2566b"], [1, "#ffb26b"]], GROUND + 10);
  fondoDesierto.noStroke();
  for (let i = 0; i < 6; i++) {
    fondoDesierto.fill(255, 200, 120, 22);
    fondoDesierto.circle(560, 290, 170 - i * 20);
  }
  fondoDesierto.fill("#fff2c4");
  fondoDesierto.circle(560, 290, 72);

  // Ciudad: noche con luna
  fondoCiudad = createGraphics(W, H);
  gradiente(fondoCiudad, [[0, "#04050d"], [0.6, "#1c1038"], [1, "#7a2a3a"]], GROUND + 10);
  fondoCiudad.noStroke();
  for (let i = 0; i < 90; i++) {
    fondoCiudad.fill(255, 255, 255, 90 + hash1(i + 5) * 165);
    fondoCiudad.rect(hash1(i) * W, hash1(i + 99) * H * 0.55, 2, 2);
  }
  fondoCiudad.fill("#e8ecff");
  fondoCiudad.circle(150, 85, 58);
  fondoCiudad.fill("#c9cfe8");
  fondoCiudad.circle(138, 78, 10);
  fondoCiudad.circle(163, 96, 14);
  fondoCiudad.circle(152, 70, 6);
}

function dibujarDunas(off, baseY, amp, frec, col) {
  noStroke();
  fill(col);
  beginShape();
  vertex(0, H);
  for (let x = 0; x <= W + 8; x += 8) {
    const y = baseY - amp * (0.5 + 0.5 * Math.sin((x + off) * frec)) - amp * 0.4 * Math.sin((x + off) * frec * 2.3 + 1.7);
    vertex(x, y);
  }
  vertex(W + 8, H);
  endShape(CLOSE);
}

function dibujarFondo(tema, cam, t) {
  if (tema === "desierto") {
    image(fondoDesierto, 0, 0);
    dibujarDunas(cam * 0.12, 330, 50, 0.006, "#8d3d5c");
    dibujarDunas(cam * 0.25, 360, 38, 0.01, "#b15a52");
    // ruinas lejanas
    const off = cam * 0.45;
    for (let i = Math.floor(off / 150) - 1; i < Math.floor((off + W) / 150) + 2; i++) {
      const h = hash1(i * 1.7);
      if (h < 0.4) continue;
      const bw = 36 + hash1(i + 3) * 60;
      const bh = 50 + hash1(i + 9) * 110;
      const bx = i * 150 + hash1(i + 20) * 40 - off;
      px(bx, GROUND - bh, bw, bh, "#7a3b4a");
      px(bx, GROUND - bh, bw, 4, "#94505e");
      px(bx + bw * 0.5, GROUND - bh - 8, bw * 0.3, 8, "#7a3b4a"); // borde roto
      for (let wy = GROUND - bh + 14; wy < GROUND - 14; wy += 24) px(bx + 8, wy, 8, 12, "#4a2030");
    }
  } else {
    image(fondoCiudad, 0, 0);
    // skyline lejano
    let off = cam * 0.1;
    for (let i = Math.floor(off / 60) - 1; i < Math.floor((off + W) / 60) + 2; i++) {
      const bh = 110 + hash1(i * 2.3) * 150;
      const bx = i * 60 - off;
      px(bx, GROUND - bh, 56, bh, "#0f1226");
      for (let wy = GROUND - bh + 10; wy < GROUND - 20; wy += 16) {
        for (let wx = 6; wx < 50; wx += 14) {
          if (hash1(i * 31 + wy * 0.37 + wx) > 0.78) px(bx + wx, wy, 5, 7, "#ffd36b");
        }
      }
    }
    // edificios medios
    off = cam * 0.38;
    for (let i = Math.floor(off / 130) - 1; i < Math.floor((off + W) / 130) + 2; i++) {
      const bh = 90 + hash1(i * 4.1) * 150;
      const bw = 70 + hash1(i + 7) * 40;
      const bx = i * 130 - off;
      px(bx, GROUND - bh, bw, bh, "#1b1e3a");
      px(bx, GROUND - bh, bw, 4, "#2b3058");
      px(bx + bw - 22, GROUND - bh - 10, 22, 10, "#1b1e3a"); // techo roto
      for (let wy = GROUND - bh + 12; wy < GROUND - 16; wy += 20) {
        for (let wx = 8; wx < bw - 10; wx += 18) {
          const hv = hash1(i * 13 + wy * 0.21 + wx);
          if (hv > 0.82) px(bx + wx, wy, 8, 10, "#ff9a3c");
          else if (hv > 0.55) px(bx + wx, wy, 8, 10, "#10122a");
        }
      }
      if (hash1(i + 50) > 0.6) {
        // fuego en la azotea
        const fx = bx + bw * 0.3;
        noStroke();
        fill(255, 120, 20, 200);
        triangle(fx, GROUND - bh, fx + 10, GROUND - bh - 18 - Math.sin(t * 0.3 + i) * 5, fx + 20, GROUND - bh);
        fill(255, 220, 80, 220);
        triangle(fx + 5, GROUND - bh, fx + 10, GROUND - bh - 9, fx + 15, GROUND - bh);
      }
    }
  }
}

// Suelo y decoración (se dibuja en coordenadas del MUNDO, dentro del translate de la cámara)
function dibujarSuelo(tema, cam, t) {
  const x0 = Math.floor(cam);
  if (tema === "desierto") {
    px(x0, GROUND, W + 2, H - GROUND, "#c9803f");
    px(x0, GROUND, W + 2, 6, "#e3a257");
    for (let i = Math.floor(x0 / 16) - 1; i < Math.floor((x0 + W) / 16) + 2; i++) {
      if (hash1(i * 7.1) > 0.7) px(i * 16, GROUND + 10 + hash1(i) * 50, 6, 2, "#a8642f");
    }
    for (let i = Math.floor(x0 / 260) - 1; i < Math.floor((x0 + W) / 260) + 2; i++) {
      const h = hash1(i * 3.7);
      if (h < 0.5) continue;
      const x = i * 260 + hash1(i + 4) * 120;
      const tipo = Math.floor((h - 0.5) * 6);
      if (tipo === 0) {
        px(x, GROUND - 36, 8, 36, "#2f7d3a");
        px(x - 8, GROUND - 26, 8, 5, "#2f7d3a");
        px(x - 8, GROUND - 34, 5, 12, "#2f7d3a");
        px(x + 8, GROUND - 20, 8, 5, "#2f7d3a");
        px(x + 11, GROUND - 28, 5, 12, "#2f7d3a");
      } else if (tipo === 1) {
        px(x, GROUND - 12, 26, 12, "#8a5a3a");
        px(x + 6, GROUND - 20, 16, 10, "#9b6a46");
      } else {
        px(x, GROUND - 8, 20, 8, "#b79a5b");
        px(x + 20, GROUND - 8, 20, 8, "#a68b4f");
        px(x + 10, GROUND - 16, 20, 8, "#b79a5b");
      }
    }
  } else {
    px(x0, GROUND, W + 2, H - GROUND, "#2a2a3a");
    px(x0, GROUND, W + 2, 6, "#4a4a5e");
    for (let i = Math.floor(x0 / 80) - 1; i < Math.floor((x0 + W) / 80) + 2; i++) px(i * 80 + 10, GROUND + 34, 40, 4, "#d4b92f");
    for (let i = Math.floor(x0 / 24) - 1; i < Math.floor((x0 + W) / 24) + 2; i++) {
      if (hash1(i * 5.3) > 0.8) px(i * 24, GROUND + 8 + hash1(i) * 50, 7, 2, "#1d1d2a");
    }
    for (let i = Math.floor(x0 / 300) - 1; i < Math.floor((x0 + W) / 300) + 2; i++) {
      const h = hash1(i * 3.9);
      if (h < 0.45) continue;
      const x = i * 300 + hash1(i + 4) * 120;
      const tipo = Math.floor((h - 0.45) * 5);
      if (tipo === 0) {
        px(x, GROUND - 22, 16, 22, "#6b3a2a");
        px(x, GROUND - 14, 16, 2, "#3a1f16");
        noStroke();
        fill(255, 130, 10, 230);
        triangle(x + 1, GROUND - 22, x + 8, GROUND - 40 - Math.sin(t * 0.3 + x) * 5, x + 15, GROUND - 22);
        fill(255, 230, 90);
        triangle(x + 5, GROUND - 22, x + 8, GROUND - 31, x + 11, GROUND - 22);
      } else if (tipo === 1) {
        px(x, GROUND - 20, 72, 14, "#3a3f52");
        px(x + 16, GROUND - 34, 40, 14, "#2c3042");
        px(x + 20, GROUND - 31, 14, 9, "#5a6a88");
        fill("#111");
        noStroke();
        circle(x + 14, GROUND - 6, 14);
        circle(x + 58, GROUND - 6, 14);
      } else {
        px(x, GROUND - 92, 3, 92, "#555a6a");
        px(x, GROUND - 94, 24, 4, "#555a6a");
        px(x + 18, GROUND - 90, 12, 3, "#ffe9a0");
        noStroke();
        fill(255, 233, 160, 28);
        triangle(x + 16, GROUND - 90, x + 34, GROUND - 90, x + 46, GROUND);
      }
    }
  }
}


// =====================================================================
//  EXTRAS: tanque del jugador, sombras y viñeta
// =====================================================================
// (x, y) = esquina superior izquierda del hitbox (70 x 38). o = { f, t, moving, aim, flash, dead, escudo }
function drawTankJugador(x, y, o) {
  push();
  translate(Math.round(x + 35), Math.round(y));
  scale(o.f, 1);
  if (o.dead !== undefined) drawingContext.globalAlpha = Math.max(0, 1 - o.dead);
  const rod = o.moving ? o.t : 0;
  // orugas
  px(-35, 26, 70, 12, "#1d1d22");
  for (let i = 0; i < 5; i++) {
    const cx = -27 + i * 13.5;
    noStroke();
    fill("#4a4f5a");
    circle(cx, 32, 11);
    fill("#20232a");
    circle(cx, 32, 5);
    px(cx - 1 + Math.cos(rod * 0.35) * 2, 31 + Math.sin(rod * 0.35) * 2, 2, 2, "#9aa0ad");
  }
  // casco
  px(-32, 14, 64, 14, "#3b6fd0");
  px(-32, 14, 64, 4, "#6f9bf0");
  px(-32, 26, 64, 2, "#27497f");
  px(22, 18, 8, 6, "#ffc93c");
  // michi asomado
  const P = PAL_JUGADOR;
  noStroke();
  fill(P.ear);
  triangle(-8, -9, -8, -18, -2, -10);
  triangle(8, -9, 8, -18, 2, -10);
  px(-8, -10, 16, 13, P.skin);
  px(-8, -8, 16, 3, P.hat);
  px(2, -3, 3, 3, "#111");
  // torreta
  px(-16, 2, 36, 14, "#3b6fd0");
  px(-16, 2, 36, 3, "#6f9bf0");
  // cañón
  push();
  translate(10, 9);
  rotate(o.aim === "up" ? -HALF_PI : 0);
  const rc = o.flash > 0 ? -3 : 0;
  px(rc, -3, 34, 6, "#27497f");
  px(rc + 34, -4, 5, 8, "#1b2f55");
  if (o.flash > 0) {
    noStroke();
    fill(255, 200, 60);
    circle(rc + 43, 0, 11);
    fill(255, 255, 220);
    circle(rc + 43, 0, 5);
  }
  pop();
  // humo si queda sin blindaje
  if (o.escudo === 0 && o.dead === undefined) {
    noStroke();
    fill(70, 70, 70, 140);
    circle(-12 + Math.sin(frameCount * 0.2) * 3, 0 - (frameCount % 30) * 0.6, 12);
  }
  pop();
}

function sombra(cx, w, bottom) {
  const a = constrain(map(GROUND - bottom, 0, 160, 80, 15), 15, 80);
  noStroke();
  fill(0, 0, 0, a);
  ellipse(cx, GROUND + 3, w * 1.1, 7);
}

function vineta() {
  const g = drawingContext.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  drawingContext.fillStyle = g;
  drawingContext.fillRect(0, 0, W, H);
}
