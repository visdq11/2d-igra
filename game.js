"use strict";

// ===== Utilities =====
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const randRange = (a, b) => a + Math.random() * (b - a);
const dist2 = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
};

// ===== Canvas Setup =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const world = {
  width: 3000,
  height: 2000,
};

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// ===== Input =====
const keys = new Set();
window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

// ===== Game State =====
const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: 14,
  speed: 160,
  runMultiplier: 1.55,
  health: 100,
  hunger: 100,
  berries: 0,
  invulnerabilityTimer: 0,
  pickupCooldown: 0,
};

const enemies = [];
const berries = [];
const boosters = [];
let timeAccumulator = 0;
let lastTime = performance.now();
let paused = false;
let dead = false;

// ===== UI Elements =====
const elHealth = document.getElementById("health-fill");
const elHunger = document.getElementById("hunger-fill");
const elBerries = document.getElementById("berries-count");
const elMissionDesc = document.getElementById("mission-desc");
const elMissionProgress = document.getElementById("mission-progress");
const elWaveInfo = document.getElementById("wave-info");
const pauseOverlay = document.getElementById("pause-overlay");
const deathOverlay = document.getElementById("death-overlay");
const restartBtn = document.getElementById("restart-btn");
const elInventory = document.getElementById("inventory");

restartBtn.addEventListener("click", () => restartGame());

// ===== Missions =====
const missions = [
  {
    id: "collect-berries",
    description: "Соберите 5 ягод, чтобы утолить голод",
    target: 5,
    progress: 0,
    onCheck: () => missionsState.collectedBerries,
    onComplete: () => spawnWave(2),
  },
  {
    id: "survive-wave",
    description: "Выживите и победите 3 врагов",
    target: 3,
    progress: 0,
    onCheck: () => missionsState.killedEnemies,
    onComplete: () => spawnWave(3),
  },
  {
    id: "explore",
    description: "Исследуйте — пройдите 600 единиц в сумме",
    target: 600,
    progress: 0,
    onCheck: () => Math.floor(missionsState.distanceTraveled),
    onComplete: () => spawnBerryPatch(8),
  },
  {
    id: "final",
    description: "Выдержите до рассвета (таймер 60 сек)",
    target: 60,
    progress: 0,
    onCheck: () => Math.floor(missionsState.survivalTimer),
    onComplete: () => { /* game won - could add screen */ },
  },
];

const missionsState = {
  index: 0,
  collectedBerries: 0,
  killedEnemies: 0,
  distanceTraveled: 0,
  lastX: player.x,
  lastY: player.y,
  survivalTimer: 0,
};

// ===== Boosters Config =====
const boosterConfig = {
  interval: 25,
  jitter: 6,
  timer: 8,
  maxOnMap: 3,
  medkitHeal: 35,
  speedMultiplier: 1.8,
  speedDuration: 8,
};

function updateMissionUI() {
  const m = missions[missionsState.index];
  if (!m) return;
  m.progress = clamp(m.onCheck(), 0, m.target);
  elMissionDesc.textContent = m.description;
  elMissionProgress.textContent = `${m.progress} / ${m.target}`;
}

function checkMissionComplete(dt) {
  const m = missions[missionsState.index];
  if (!m) return;

  if (m.id === "final") {
    missionsState.survivalTimer += dt;
  }

  m.progress = clamp(m.onCheck(), 0, m.target);
  if (m.progress >= m.target) {
    // Advance mission
    if (typeof m.onComplete === "function") m.onComplete();
    missionsState.index = Math.min(missionsState.index + 1, missions.length - 1);
  }
}

// ===== Spawning =====
function spawnEnemy(x, y) {
  enemies.push({ x, y, radius: 12, speed: 110, health: 30, wander: Math.random() * Math.PI * 2 });
}
function spawnWave(n) {
  for (let i = 0; i < n; i++) {
    const x = randRange(80, world.width - 80);
    const y = randRange(80, world.height - 80);
    spawnEnemy(x, y);
  }
}
function spawnWaveAroundPlayer(n) {
  const minDist = 320;
  const maxDist = 620;
  for (let i = 0; i < n; i++) {
    const angle = randRange(0, Math.PI * 2);
    const dist = randRange(minDist, maxDist);
    const x = clamp(player.x + Math.cos(angle) * dist, 40, world.width - 40);
    const y = clamp(player.y + Math.sin(angle) * dist, 40, world.height - 40);
    spawnEnemy(x, y);
  }
}
function spawnBerry(x, y) {
  berries.push({ x, y, radius: 8 });
}
function spawnBerryPatch(n) {
  for (let i = 0; i < n; i++) {
    const x = randRange(60, world.width - 60);
    const y = randRange(60, world.height - 60);
    spawnBerry(x, y);
  }
}

function spawnBooster(type, x, y) {
  boosters.push({ x, y, radius: 10, type });
}
function spawnRandomBooster() {
  const x = randRange(80, world.width - 80);
  const y = randRange(80, world.height - 80);
  const type = Math.random() < 0.5 ? "medkit" : "speed";
  spawnBooster(type, x, y);
}

// Initial content
spawnBerryPatch(6);

// ===== Waves =====
const wave = {
  current: 0,
  timer: 3,
  interval: 15,
  active: false,
  enemiesBase: 2,
  enemiesGrowth: 1,
};

function updateWaveUI() {
  if (!elWaveInfo) return;
  const status = enemies.length > 0 ? "Волна активна" : `След. через ${Math.max(0, Math.ceil(wave.timer))}с`;
  elWaveInfo.textContent = `Волна: ${wave.current} • ${status}`;
}

function updateWaves(dt) {
  // When no enemies remain, start or continue countdown
  if (enemies.length === 0) {
    if (wave.timer <= 0) {
      wave.current += 1;
      const count = wave.enemiesBase + (wave.current - 1) * wave.enemiesGrowth;
      spawnWaveAroundPlayer(count);
      wave.active = true;
      wave.timer = wave.interval;
    } else {
      wave.timer -= dt;
    }
  } else {
    // wave is ongoing
    wave.active = true;
  }

  // If wave cleared, prep next timer
  if (wave.active && enemies.length === 0 && wave.timer > wave.interval - 0.001) {
    wave.active = false;
    wave.timer = wave.interval;
  }
}

// ===== Camera =====
const camera = { x: 0, y: 0 };
function updateCamera() {
  const vw = innerWidth;
  const vh = innerHeight;
  camera.x = clamp(player.x - vw / 2, 0, world.width - vw);
  camera.y = clamp(player.y - vh / 2, 0, world.height - vh);
}

// ===== Game Logic =====
function restartGame() {
  enemies.length = 0;
  berries.length = 0;
  boosters.length = 0;
  player.x = world.width / 2; player.y = world.height / 2;
  player.health = 100; player.hunger = 100; player.berries = 0; player.invulnerabilityTimer = 0;
  missionsState.index = 0; missionsState.collectedBerries = 0; missionsState.killedEnemies = 0; missionsState.distanceTraveled = 0; missionsState.lastX = player.x; missionsState.lastY = player.y; missionsState.survivalTimer = 0;
  paused = false; dead = false;
  wave.current = 0; wave.timer = 3; wave.active = false;
  boosterConfig.timer = 8;
  spawnBerryPatch(6);
  deathOverlay.hidden = true;
}

function handleInput(dt) {
  let dx = 0, dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  const running = keys.has("shift");

  let speedBoost = player.speedBoostTimer && player.speedBoostTimer > 0 ? boosterConfig.speedMultiplier : 1;
  let spd = player.speed * (running ? player.runMultiplier : 1) * speedBoost;
  let len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  player.x += dx * spd * dt;
  player.y += dy * spd * dt;

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);

  // Distance for mission
  missionsState.distanceTraveled += Math.hypot(player.x - missionsState.lastX, player.y - missionsState.lastY);
  missionsState.lastX = player.x; missionsState.lastY = player.y;
}

function updateHunger(dt) {
  const baseLoss = 2.0; // per minute baseline
  const runLoss = keys.has("shift") ? 2.0 : 0;
  const lossPerSecond = (baseLoss + runLoss) / 60.0;
  player.hunger = clamp(player.hunger - lossPerSecond, 0, 100);
  if (player.hunger <= 0) {
    // Starvation damage
    player.health = clamp(player.health - 5 * dt, 0, 100);
    if (player.health <= 0 && !dead) onDeath();
  }
}

function eatBerry() {
  if (player.berries > 0) {
    player.berries -= 1;
    // Berries: restore more stamina (hunger) and a bit of HP
    player.hunger = clamp(player.hunger + 35, 0, 100);
    player.health = clamp(player.health + 8, 0, 100);
    updateHUD();
  }
}

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const code = e.code;
  if (key === "1" || code === "Digit1" || code === "Numpad1" || key === "q" || key === "f" || key === " " || code === "Enter") {
    if (player.berries > 0) {
      eatBerry();
    } else {
      interact();
    }
  }
  if (key === "e") {
    interact();
  }
  if (key === "p") {
    paused = !paused;
    pauseOverlay.hidden = !paused;
  }
});

if (elInventory) {
  elInventory.style.cursor = "pointer";
  elInventory.title = "Кликните, чтобы съесть ягоду";
  elInventory.addEventListener("click", () => eatBerry());
}

function interact() {
  // Pick nearest berry within radius
  let nearestIdx = -1;
  let bestD2 = 40 * 40;
  for (let i = 0; i < berries.length; i++) {
    const b = berries[i];
    const d2 = dist2(player.x, player.y, b.x, b.y);
    if (d2 < bestD2) { bestD2 = d2; nearestIdx = i; }
  }
  if (nearestIdx >= 0) {
    berries.splice(nearestIdx, 1);
    player.berries += 1;
    missionsState.collectedBerries += 1;
    updateHUD();
    return;
  }
  // Try booster pickup if no berry
  let boosterIdx = -1;
  let bestBoosterD2 = 40 * 40;
  for (let i = 0; i < boosters.length; i++) {
    const o = boosters[i];
    const d2 = dist2(player.x, player.y, o.x, o.y);
    if (d2 < bestBoosterD2) { bestBoosterD2 = d2; boosterIdx = i; }
  }
  if (boosterIdx >= 0) pickupBooster(boosterIdx);
}

function tryAutoPickupBerry(dt) {
  if (player.pickupCooldown > 0) {
    player.pickupCooldown -= dt;
    return;
  }
  let nearestIdx = -1;
  let bestD2 = 36 * 36;
  for (let i = 0; i < berries.length; i++) {
    const b = berries[i];
    const d2 = dist2(player.x, player.y, b.x, b.y);
    if (d2 < bestD2) { bestD2 = d2; nearestIdx = i; }
  }
  if (nearestIdx >= 0) {
    berries.splice(nearestIdx, 1);
    player.berries += 1;
    missionsState.collectedBerries += 1;
    player.pickupCooldown = 0.2;
    updateHUD();
  }
}

function pickupBooster(index) {
  const b = boosters[index];
  if (!b) return;
  boosters.splice(index, 1);
  if (b.type === "medkit") {
    player.health = clamp(player.health + boosterConfig.medkitHeal, 0, 100);
  } else if (b.type === "speed") {
    player.speedBoostTimer = Math.max(player.speedBoostTimer || 0, boosterConfig.speedDuration);
  }
  updateHUD();
}

function tryAutoPickupBoosters() {
  let idx = -1;
  let bestD2 = 36 * 36;
  for (let i = 0; i < boosters.length; i++) {
    const o = boosters[i];
    const d2 = dist2(player.x, player.y, o.x, o.y);
    if (d2 < bestD2) { bestD2 = d2; idx = i; }
  }
  if (idx >= 0) pickupBooster(idx);
}

function updateBoosters(dt) {
  // countdown to next spawn
  if (boosters.length < boosterConfig.maxOnMap) {
    boosterConfig.timer -= dt;
    if (boosterConfig.timer <= 0) {
      spawnRandomBooster();
      // reset timer with jitter +/-
      const jitter = randRange(-boosterConfig.jitter, boosterConfig.jitter);
      boosterConfig.timer = Math.max(10, boosterConfig.interval + jitter);
    }
  }
  // decay speed boost timer
  if (player.speedBoostTimer && player.speedBoostTimer > 0) {
    player.speedBoostTimer -= dt;
    if (player.speedBoostTimer < 0) player.speedBoostTimer = 0;
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    // Simple chase
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy);
    const dirx = dx / (d || 1);
    const diry = dy / (d || 1);
    const minDist = 16 + e.radius;

    // wander offset when far away
    e.wander += randRange(-1, 1) * 0.5 * dt;
    const wx = Math.cos(e.wander) * 0.3;
    const wy = Math.sin(e.wander) * 0.3;

    const vx = (dirx + wx) * e.speed * dt;
    const vy = (diry + wy) * e.speed * dt;
    e.x += vx; e.y += vy;
    e.x = clamp(e.x, e.radius, world.width - e.radius);
    e.y = clamp(e.y, e.radius, world.height - e.radius);

    // Attack if near
    if (d < minDist) {
      if (player.invulnerabilityTimer <= 0) {
        player.health = clamp(player.health - 10, 0, 100);
        player.invulnerabilityTimer = 0.7;
        if (player.health <= 0 && !dead) onDeath();
      }
    }

    // Player counter attack if running into enemy (simple)
    if (d < 18) {
      e.health -= 30 * dt; // damage over time when in contact
      if (e.health <= 0) {
        enemies.splice(i, 1);
        missionsState.killedEnemies += 1;
        // chance to drop berry
        if (Math.random() < 0.35) spawnBerry(e.x + randRange(-10,10), e.y + randRange(-10,10));
      }
    }
  }

  if (player.invulnerabilityTimer > 0) player.invulnerabilityTimer -= dt;
}

function onDeath() {
  dead = true;
  paused = true;
  deathOverlay.hidden = false;
}

function updateHUD() {
  elHealth.style.width = `${Math.round(player.health)}%`;
  elHunger.style.width = `${Math.round(player.hunger)}%`;
  elBerries.textContent = String(player.berries);
}

// ===== Rendering =====
function drawBackground() {
  // grid
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.fillStyle = "#0f1116";
  ctx.fillRect(camera.x, camera.y, innerWidth, innerHeight);

  const step = 80;
  ctx.strokeStyle = "#1b212b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < world.width; x += step) {
    ctx.moveTo(x, 0); ctx.lineTo(x, world.height);
  }
  for (let y = 0; y < world.height; y += step) {
    ctx.moveTo(0, y); ctx.lineTo(world.width, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawEntity(x, y, r, fill, stroke) {
  ctx.save();
  ctx.translate(Math.round(x - camera.x), Math.round(y - camera.y));
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.restore();
}

function drawFlower(x, y, radius) {
  const px = Math.round(x - camera.x);
  const py = Math.round(y - camera.y);
  ctx.save();
  ctx.translate(px, py);
  const petals = 6;
  const petalLen = radius * 1.6;
  const petalWid = radius * 0.9;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.4, petalWid, petalLen, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f58dd6";
    ctx.fill();
    ctx.restore();
  }
  // center
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
  ctx.fillStyle = "#ffd166";
  ctx.fill();
  // small stem hint
  ctx.beginPath();
  ctx.moveTo(0, radius * 0.9);
  ctx.quadraticCurveTo(radius * 0.2, radius * 1.4, 0, radius * 1.7);
  ctx.strokeStyle = "#3aa85e";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  // Berries
  for (const b of berries) drawFlower(b.x, b.y, b.radius);

  // Enemies
  for (const e of enemies) drawEntity(e.x, e.y, e.radius, "#e05a5a", "#9b3131");

  // Boosters
  for (const o of boosters) {
    const px = Math.round(o.x - camera.x);
    const py = Math.round(o.y - camera.y);
    ctx.save();
    ctx.translate(px, py);
    if (o.type === "medkit") {
      // medkit: box + cross
      ctx.fillStyle = "#1f2a36";
      ctx.strokeStyle = "#9bd1ff";
      ctx.lineWidth = 2;
      const s = 16;
      ctx.beginPath();
      ctx.roundRect?.(-s/2, -s/2, s, s, 3);
      if (!ctx.roundRect) {
        ctx.rect(-s/2, -s/2, s, s);
      }
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.strokeStyle = "#ff6161";
      ctx.lineWidth = 3;
      ctx.moveTo(-5, 0); ctx.lineTo(5, 0);
      ctx.moveTo(0, -5); ctx.lineTo(0, 5);
      ctx.stroke();
    } else {
      // speed: lightning
      ctx.fillStyle = "#ffd166";
      ctx.strokeStyle = "#b38a2e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -8);
      ctx.lineTo(2, -2);
      ctx.lineTo(-1, -2);
      ctx.lineTo(3, 6);
      ctx.lineTo(-2, 0);
      ctx.lineTo(1, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Player
  drawEntity(player.x, player.y, player.radius, "#5aa7ff", player.invulnerabilityTimer > 0 ? "#d1e2ff" : "#2b5aa8");
}

// ===== Main Loop =====
function update(dt) {
  if (paused) return;
  if (dead) return;

  handleInput(dt);
  tryAutoPickupBerry(dt);
  tryAutoPickupBoosters();
  updateHunger(dt);
  updateEnemies(dt);
  updateWaves(dt);
  updateBoosters(dt);
  updateCamera();
  updateHUD();
  updateMissionUI();
  updateWaveUI();
  checkMissionComplete(dt);
}

function frame(t) {
  const now = t;
  let dt = (now - lastTime) / 1000;
  dt = Math.min(dt, 0.05);
  lastTime = now;

  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);


