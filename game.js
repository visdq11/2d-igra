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
  medkits: 0,
  freezes: 0,
  invulnerabilityTimer: 0,
  pickupCooldown: 0,
  shieldTimer: 0,
  hiddenInHouseId: null,
};

const enemies = [];
const berries = [];
const boosters = [];
const obstacles = [];
const decorations = [];
const houses = [];
let timeAccumulator = 0;
let lastTime = performance.now();
let paused = false;
let dead = false;
let won = false;

// ===== Levels & Buffs =====
const levelState = {
  current: 1, // 1..3
  missionsCompletedOnLevel: 0,
  speedBonusMul: 1,
  maxHealthBonus: 0,
  weaponBonusMul: 1,
};

const levelConfigs = {
  1: {
    enemies: { speed: 90, health: 20, damage: 6 },
    spawns: { berries: 10, boostersPool: [], houses: false },
    missions: [
      { id: "l1-collect", description: "Соберите 6 ягод", target: 6, onCheck: () => missionsState.collectedBerries },
      { id: "l1-kill", description: "Победите 3 врагов", target: 3, onCheck: () => missionsState.killedEnemies },
      { id: "l1-survive", description: "Выживайте 25 секунд", target: 25, onCheck: () => Math.floor(missionsState.survivalTimer) },
    ],
  },
  2: {
    enemies: { speed: 110, health: 35, damage: 10 },
    spawns: { berries: 8, boostersPool: ["medkit"], houses: false },
    missions: [
      { id: "l2-collect", description: "Соберите 10 ягод", target: 10, onCheck: () => missionsState.collectedBerries },
      { id: "l2-medkits", description: "Подберите 2 аптечки", target: 2, onCheck: () => missionsState.medkitsPicked },
      { id: "l2-kill", description: "Победите 6 врагов", target: 6, onCheck: () => missionsState.killedEnemies },
    ],
  },
  3: {
    enemies: { speed: 130, health: 55, damage: 14 },
    spawns: { berries: 6, boostersPool: ["medkit","speed","shield","freeze"], houses: true },
    missions: [
      { id: "l3-house", description: "Войдите в 2 дома", target: 2, onCheck: () => missionsState.housesEntered },
      { id: "l3-boosters", description: "Подберите 3 бустера", target: 3, onCheck: () => missionsState.boostersPicked },
      { id: "l3-kill", description: "Победите 10 врагов", target: 10, onCheck: () => missionsState.killedEnemies },
    ],
  },
};

let gameplayConfig = {
  allowHouses: false,
  boostersPool: [],
};

// ===== Difficulty Scaling =====
const enemyDifficulty = {
  timer: 7,
  interval: 7,
  speedMul: 1,
  damageMul: 1,
  healthMul: 1,
  speedStep: 1.05,
  damageStep: 1.1,
  healthStep: 1.08,
};

function scaleEnemies() {
  enemyDifficulty.speedMul *= enemyDifficulty.speedStep;
  enemyDifficulty.damageMul *= enemyDifficulty.damageStep;
  enemyDifficulty.healthMul *= enemyDifficulty.healthStep;
  // update existing enemies speed proportionally
  for (const e of enemies) {
    e.speed = (e.baseSpeed || 110) * enemyDifficulty.speedMul;
  }
}

function getEnemyDamage() {
  const base = levelConfigs[levelState.current]?.enemies?.damage || 10;
  return Math.round(base * enemyDifficulty.damageMul);
}

// ===== UI Elements =====
const elHealth = document.getElementById("health-fill");
const elHunger = document.getElementById("hunger-fill");
const elBerries = document.getElementById("berries-count");
const elMedkits = document.getElementById("medkits-count");
const elFreezes = document.getElementById("freezes-count");
const elMissionDesc = document.getElementById("mission-desc");
const elMissionProgress = document.getElementById("mission-progress");
const elWaveInfo = document.getElementById("wave-info");
const pauseOverlay = document.getElementById("pause-overlay");
const deathOverlay = document.getElementById("death-overlay");
const restartBtn = document.getElementById("restart-btn");
const elInventory = document.getElementById("inventory");
const victoryOverlay = document.getElementById("victory-overlay");
const restartVictoryBtn = document.getElementById("restart-victory-btn");
const buffOverlay = document.getElementById("buff-overlay");
const buffSpeedBtn = document.getElementById("buff-speed");
const buffHpBtn = document.getElementById("buff-hp");
const buffWeaponBtn = document.getElementById("buff-weapon");

restartBtn.addEventListener("click", () => restartGame());
if (restartVictoryBtn) restartVictoryBtn.addEventListener("click", () => restartGame());
if (typeof buffSpeedBtn !== 'undefined' && buffSpeedBtn) buffSpeedBtn.addEventListener('click', () => { applyBuff('speed'); hideBuffOverlayAndAdvance(); });
if (typeof buffHpBtn !== 'undefined' && buffHpBtn) buffHpBtn.addEventListener('click', () => { applyBuff('hp'); hideBuffOverlayAndAdvance(); });
if (typeof buffWeaponBtn !== 'undefined' && buffWeaponBtn) buffWeaponBtn.addEventListener('click', () => { applyBuff('weapon'); hideBuffOverlayAndAdvance(); });

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
  medkitsPicked: 0,
  boostersPicked: 0,
  housesEntered: 0,
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
  shieldDuration: 8,
};

function updateMissionUI() {
  const currentLevelMissions = levelConfigs[levelState.current]?.missions || missions;
  const m = currentLevelMissions[missionsState.index];
  if (!m) return;
  m.progress = clamp(m.onCheck(), 0, m.target);
  elMissionDesc.textContent = m.description;
  elMissionProgress.textContent = `${m.progress} / ${m.target}`;
}

function checkMissionComplete(dt) {
  const currentLevelMissions = levelConfigs[levelState.current]?.missions || missions;
  const m = currentLevelMissions[missionsState.index];
  if (!m) return;

  if (m.id === "final") {
    missionsState.survivalTimer += dt;
  }

  m.progress = clamp(m.onCheck(), 0, m.target);
  if (m.progress >= m.target) {
    missionsState.index = Math.min(missionsState.index + 1, currentLevelMissions.length - 1);
    levelState.missionsCompletedOnLevel += 1;
    if (levelState.missionsCompletedOnLevel >= currentLevelMissions.length) {
      // level complete → next or victory with buff choice between levels
      if (levelState.current < 3) {
        showBuffOverlay();
      } else {
        onVictory();
      }
    }
  }
}

// ===== Spawning =====
function isPointInObstacle(x, y, padding = 0) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (!o.collidable) continue;
    const r = (o.radius || 0) + padding;
    if (dist2(x, y, o.x, o.y) <= r * r) return true;
  }
  return false;
}

function findValidPoint(padding = 0) {
  for (let tries = 0; tries < 200; tries++) {
    const x = randRange(20, world.width - 20);
    const y = randRange(20, world.height - 20);
    // keep spawn away from player start area
    if (dist2(x, y, world.width / 2, world.height / 2) < 220 * 220) continue;
    if (!isPointInObstacle(x, y, padding)) return { x, y };
  }
  return { x: world.width / 2, y: world.height / 2 };
}

function findValidPointNear(cx, cy, minDist, maxDist, padding = 0) {
  for (let tries = 0; tries < 200; tries++) {
    const angle = randRange(0, Math.PI * 2);
    const dist = randRange(minDist, maxDist);
    const x = clamp(cx + Math.cos(angle) * dist, 20, world.width - 20);
    const y = clamp(cy + Math.sin(angle) * dist, 20, world.height - 20);
    if (!isPointInObstacle(x, y, padding)) return { x, y };
  }
  return { x: cx, y: cy };
}

function resolveEntityObstacleCollisions(entity) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (!o.collidable) continue;
    const rr = (o.radius || 0) + (entity.radius || 0);
    const dx = entity.x - o.x;
    const dy = entity.y - o.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > rr * rr || d2 === 0) continue;
    const d = Math.sqrt(d2);
    const nx = dx / (d || 1);
    const ny = dy / (d || 1);
    const push = rr - d;
    entity.x += nx * push;
    entity.y += ny * push;
    entity.x = clamp(entity.x, entity.radius, world.width - entity.radius);
    entity.y = clamp(entity.y, entity.radius, world.height - entity.radius);
  }
}

function generateLandscape() {
  obstacles.length = 0;
  decorations.length = 0;

  // Scatter trees (collidable)
  const trees = 180;
  for (let i = 0; i < trees; i++) {
    const p = findValidPoint(26);
    obstacles.push({ type: "tree", x: p.x, y: p.y, radius: 22, collidable: true });
  }

  // Scatter rocks (collidable)
  const rocks = 120;
  for (let i = 0; i < rocks; i++) {
    const p = findValidPoint(18);
    obstacles.push({ type: "rock", x: p.x, y: p.y, radius: 16, collidable: true });
  }

  // Grass patches (not collidable, decorative only)
  const grassPatches = 320;
  for (let i = 0; i < grassPatches; i++) {
    const p = findValidPoint(0);
    decorations.push({ type: "grass", x: p.x, y: p.y, radius: randRange(8, 18), collidable: false });
  }

  // Houses (collidable blocks with door)
  const houseCount = levelConfigs[levelState.current]?.spawns?.houses ? 8 : 0;
  for (let i = 0; i < houseCount; i++) {
    const p = findValidPoint(60);
    const variant = Math.random();
    const w = Math.round(randRange(70, 110));
    const h = Math.round(randRange(70, 110));
    const color = variant < 0.33 ? "#8b3d3d" : variant < 0.66 ? "#6d6f8b" : "#8b7a3d";
    const roof = variant < 0.33 ? "gable" : variant < 0.66 ? "flat" : "hip";
    const id = `house-${i}`;
    const houseObj = { type: "house", x: p.x, y: p.y, radius: Math.max(w, h) * 0.5, collidable: true, width: w, height: h, id, color, roof };
    obstacles.push(houseObj);
    houses.push(houseObj);
  }
}

function spawnEnemy(x, y) {
  const cfg = levelConfigs[levelState.current]?.enemies || { speed: 110, health: 30, damage: 10 };
  const baseSpeed = cfg.speed;
  const baseHealth = cfg.health;
  enemies.push({ x, y, radius: 12, baseSpeed, speed: baseSpeed * enemyDifficulty.speedMul, health: Math.round(baseHealth * enemyDifficulty.healthMul), damageBase: cfg.damage, wander: Math.random() * Math.PI * 2 });
}
function spawnWave(n) {
  for (let i = 0; i < n; i++) {
    const p = findValidPoint(40);
    spawnEnemy(p.x, p.y);
  }
}
function spawnWaveAroundPlayer(n) {
  const minDist = 320;
  const maxDist = 620;
  for (let i = 0; i < n; i++) {
    const angle = randRange(0, Math.PI * 2);
    const dist = randRange(minDist, maxDist);
    let x = clamp(player.x + Math.cos(angle) * dist, 40, world.width - 40);
    let y = clamp(player.y + Math.sin(angle) * dist, 40, world.height - 40);
    if (isPointInObstacle(x, y, 18)) {
      const p = findValidPointNear(player.x, player.y, minDist, maxDist, 18);
      x = p.x; y = p.y;
    }
    spawnEnemy(x, y);
  }
}
function spawnBerry(x, y) {
  berries.push({ x, y, radius: 8 });
}
function spawnBerryPatch(n) {
  berries.length += 0; // keep existing berries
  let spawned = 0;
  while (spawned < n) {
    const center = findValidPoint(20);
    const clusterSize = Math.min(n - spawned, Math.max(1, Math.floor(randRange(2, 4))));
    for (let j = 0; j < clusterSize; j++) {
      const angle = randRange(0, Math.PI * 2);
      const dist = randRange(0, 22);
      const bx = clamp(center.x + Math.cos(angle) * dist, 10, world.width - 10);
      const by = clamp(center.y + Math.sin(angle) * dist, 10, world.height - 10);
      if (!isPointInObstacle(bx, by, 12)) {
        spawnBerry(bx, by);
        spawned++;
        if (spawned >= n) break;
      }
    }
  }
}

function spawnBooster(type, x, y) {
  boosters.push({ x, y, radius: 10, type });
}
function spawnRandomBooster() {
  const p = findValidPoint(24);
  const pool = gameplayConfig.boostersPool || [];
  if (pool.length === 0) return;
  const type = pool[Math.floor(Math.random() * pool.length)];
  spawnBooster(type, p.x, p.y);
}

// Initial content
function applyLevelConfig() {
  const cfg = levelConfigs[levelState.current];
  gameplayConfig.allowHouses = !!cfg?.spawns?.houses;
  gameplayConfig.boostersPool = cfg?.spawns?.boostersPool || [];
  // reset difficulty multipliers between levels
  enemyDifficulty.timer = enemyDifficulty.interval;
  enemyDifficulty.speedMul = 1; enemyDifficulty.damageMul = 1; enemyDifficulty.healthMul = 1;
  generateLandscape();
  spawnBerryPatch(cfg?.spawns?.berries ?? 6);
}

function startLevel(level) {
  levelState.current = level;
  levelState.missionsCompletedOnLevel = 0;
  missionsState.collectedBerries = 0;
  missionsState.killedEnemies = 0;
  missionsState.distanceTraveled = 0;
  missionsState.lastX = player.x; missionsState.lastY = player.y;
  missionsState.survivalTimer = 0;
  applyLevelConfig();
}

startLevel(1);

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
  // enemy scaling
  enemyDifficulty.timer -= dt;
  if (enemyDifficulty.timer <= 0) {
    scaleEnemies();
    enemyDifficulty.timer = enemyDifficulty.interval;
  }
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
  paused = false; dead = false; won = false;
  wave.current = 0; wave.timer = 3; wave.active = false;
  boosterConfig.timer = 8;
  spawnBerryPatch(6);
  deathOverlay.hidden = true;
  if (victoryOverlay) victoryOverlay.hidden = true;
}

function handleInput(dt) {
  let dx = 0, dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  const running = keys.has("shift");

  let speedBoost = player.speedBoostTimer && player.speedBoostTimer > 0 ? boosterConfig.speedMultiplier : 1;
  let spd = player.speed * levelState.speedBonusMul * (running ? player.runMultiplier : 1) * speedBoost;
  let len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  player.x += dx * spd * dt;
  player.y += dy * spd * dt;

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);

  // If inside a house, clamp to interior and skip obstacle collisions
  if (player.hiddenInHouseId != null) {
    const house = houses.find(h => h.id === player.hiddenInHouseId);
    if (house) {
      const pad = 10;
      const minX = house.x - (house.width || 80) / 2 + pad;
      const maxX = house.x + (house.width || 80) / 2 - pad;
      const minY = house.y - (house.height || 80) / 2 + pad;
      const maxY = house.y + (house.height || 80) / 2 - pad;
      player.x = clamp(player.x, minX, maxX);
      player.y = clamp(player.y, minY, maxY);
    }
  } else {
    resolveEntityObstacleCollisions(player);
  }

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
    const maxHp = 100 + levelState.maxHealthBonus;
    player.health = clamp(player.health - 5 * dt, 0, maxHp);
    if (player.health <= 0 && !dead) onDeath();
  }
}

function eatBerry() {
  if (player.berries > 0) {
    player.berries -= 1;
    // Berries: restore more stamina (hunger) and a bit of HP
    player.hunger = clamp(player.hunger + 35, 0, 100);
    const maxHp = 100 + levelState.maxHealthBonus;
    player.health = clamp(player.health + 8, 0, maxHp);
    updateHUD();
  }
}

function useMedkit() {
  if ((player.medkits || 0) > 0 && player.health < 100) {
    player.medkits -= 1;
    const maxHp = 100 + levelState.maxHealthBonus;
    player.health = clamp(player.health + boosterConfig.medkitHeal, 0, maxHp);
    updateHUD();
  }
}

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  const code = e.code;
  // Eat berry only on key "1"
  if (key === "1" || code === "Digit1" || code === "Numpad1") {
    if (player.berries > 0) {
      eatBerry();
    }
  }
  // Space/E to interact (e.g., enter/exit house, pick up items)
  if (key === " " || key === "e") {
    interact();
  }
  if (key === "j") {
    useMedkit();
  }
  if (key === "o" || key === "о") {
    useMedkit();
  }
  if (key === "2") {
    useFreeze();
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

  // Enter/exit house if near door
  let nearHouse = null;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (o.type !== "house") continue;
    const d2 = dist2(player.x, player.y, o.x, o.y + (o.height ? o.height / 2 : 40));
    if (d2 < 48 * 48) { nearHouse = o; break; }
  }
  if (nearHouse) {
    if (player.hiddenInHouseId == null) {
      // Enter house
      player.hiddenInHouseId = nearHouse.id || true;
      missionsState.housesEntered += 1;
      // Move just inside door
      player.x = nearHouse.x;
      player.y = nearHouse.y + (nearHouse.height ? nearHouse.height / 2 - 20 : 20);
      // One-time loot spawn chance
      if (!nearHouse.visited) {
        nearHouse.visited = true;
        if (Math.random() < 0.25) {
          const pad = 16;
          const minX = nearHouse.x - (nearHouse.width || 80) / 2 + pad;
          const maxX = nearHouse.x + (nearHouse.width || 80) / 2 - pad;
          const minY = nearHouse.y - (nearHouse.height || 80) / 2 + pad;
          const maxY = nearHouse.y + (nearHouse.height || 80) / 2 - pad;
          const bx = randRange(minX, maxX);
          const by = randRange(minY, maxY);
          spawnBooster("medkit", bx, by);
        }
        // one random house also gets a freeze booster (once total)
        if (!window.__freezeSpawned) {
          window.__freezeSpawned = true;
          const pad2 = 16;
          const minX2 = nearHouse.x - (nearHouse.width || 80) / 2 + pad2;
          const maxX2 = nearHouse.x + (nearHouse.width || 80) / 2 - pad2;
          const minY2 = nearHouse.y - (nearHouse.height || 80) / 2 + pad2;
          const maxY2 = nearHouse.y + (nearHouse.height || 80) / 2 - pad2;
          const fx = randRange(minX2, maxX2);
          const fy = randRange(minY2, maxY2);
          spawnBooster("freeze", fx, fy);
        }
      }
    } else {
      // Exit house: only if near the door from inside
      const doorX = nearHouse.x;
      const doorY = nearHouse.y + (nearHouse.height ? nearHouse.height / 2 - 16 : 16);
      if (dist2(player.x, player.y, doorX, doorY) < 42 * 42) {
        player.hiddenInHouseId = null;
        // place just outside the door
        player.x = nearHouse.x;
        player.y = nearHouse.y + (nearHouse.height ? nearHouse.height / 2 + 20 : 40);
      }
    }
  }
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
    player.medkits = (player.medkits || 0) + 1;
    missionsState.medkitsPicked += 1;
  } else if (b.type === "speed") {
    player.speedBoostTimer = Math.max(player.speedBoostTimer || 0, boosterConfig.speedDuration);
    missionsState.boostersPicked += 1;
  } else if (b.type === "shield") {
    player.shieldTimer = Math.max(player.shieldTimer || 0, boosterConfig.shieldDuration);
    missionsState.boostersPicked += 1;
  } else if (b.type === "freeze") {
    player.freezes = (player.freezes || 0) + 1;
    missionsState.boostersPicked += 1;
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
  // decay shield timer
  if (player.shieldTimer && player.shieldTimer > 0) {
    player.shieldTimer -= dt;
    if (player.shieldTimer < 0) player.shieldTimer = 0;
  }
}

function useFreeze() {
  if ((player.freezes || 0) > 0) {
    player.freezes -= 1;
    for (const e of enemies) {
      e.frozenTimer = Math.max(e.frozenTimer || 0, 10);
    }
    updateHUD();
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.frozenTimer && e.frozenTimer > 0) {
      e.frozenTimer -= dt;
      // Skip movement and attacks when frozen
      e.frozenTimer = Math.max(0, e.frozenTimer);
      continue;
    }
    // Simple chase
    // If player is hidden, enemies wander slowly
    const targetX = player.hiddenInHouseId == null ? player.x : e.x + Math.cos(e.wander) * 40;
    const targetY = player.hiddenInHouseId == null ? player.y : e.y + Math.sin(e.wander) * 40;
    const dx = targetX - e.x;
    const dy = targetY - e.y;
    const d = Math.hypot(dx, dy);
    const dirx = dx / (d || 1);
    const diry = dy / (d || 1);
    const minDist = 16 + e.radius;

    // wander offset when far away
    e.wander += randRange(-1, 1) * 0.5 * dt;
    const wx = Math.cos(e.wander) * 0.3;
    const wy = Math.sin(e.wander) * 0.3;

    const speedMul = player.hiddenInHouseId == null ? 1 : 0.4;
    const vx = (dirx + wx) * e.speed * dt * speedMul;
    const vy = (diry + wy) * e.speed * dt * speedMul;
    e.x += vx; e.y += vy;
    e.x = clamp(e.x, e.radius, world.width - e.radius);
    e.y = clamp(e.y, e.radius, world.height - e.radius);

    // simple obstacle avoidance: push away from nearest obstacle slightly before collision
    let avoidX = 0, avoidY = 0;
    for (let j = 0; j < obstacles.length; j++) {
      const o = obstacles[j];
      if (!o.collidable) continue;
      const rr = (o.radius || 0) + e.radius + 8;
      const ox = e.x - o.x;
      const oy = e.y - o.y;
      const d2o = ox * ox + oy * oy;
      if (d2o < rr * rr) {
        const d = Math.sqrt(d2o) || 1;
        const nx = ox / d;
        const ny = oy / d;
        avoidX += nx * (rr - d) * 0.6;
        avoidY += ny * (rr - d) * 0.6;
      }
    }
    e.x += avoidX * 0.6;
    e.y += avoidY * 0.6;

    // separation between enemies
    for (let k = 0; k < enemies.length; k++) {
      if (k === i) continue;
      const o = enemies[k];
      const rr2 = e.radius + (o.radius || 12) + 4;
      const ox = e.x - o.x;
      const oy = e.y - o.y;
      const d2e = ox * ox + oy * oy;
      if (d2e < rr2 * rr2 && d2e > 0) {
        const d = Math.sqrt(d2e);
        const nx = ox / d;
        const ny = oy / d;
        const push = (rr2 - d) * 0.5;
        e.x += nx * push;
        e.y += ny * push;
      }
    }

    resolveEntityObstacleCollisions(e);

    // Attack if near
    if (d < minDist) {
      if (player.invulnerabilityTimer <= 0 && player.hiddenInHouseId == null) {
        player.health = clamp(player.health - getEnemyDamage(), 0, 100);
        player.invulnerabilityTimer = player.shieldTimer > 0 ? 0.15 : 0.7;
        if (player.shieldTimer > 0) {
          // absorb heavy part of the hit
          player.health = clamp(player.health + Math.ceil(getEnemyDamage() * 0.7), 0, 100);
        }
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

function onVictory() {
  won = true;
  paused = true;
  if (victoryOverlay) victoryOverlay.hidden = false;
}

function showBuffOverlay() {
  if (!buffOverlay) return;
  buffOverlay.hidden = false;
  paused = true;
}

function applyBuff(type) {
  if (type === 'speed') {
    levelState.speedBonusMul *= 1.2;
  } else if (type === 'hp') {
    levelState.maxHealthBonus += 25;
    player.health = Math.min(player.health + 25, 100 + levelState.maxHealthBonus);
  } else if (type === 'weapon') {
    levelState.weaponBonusMul *= 2;
  }
}

function hideBuffOverlayAndAdvance() {
  if (!buffOverlay) return;
  buffOverlay.hidden = true;
  paused = false;
  startLevel(Math.min(3, levelState.current + 1));
}

function updateHUD() {
  const maxHp = 100 + levelState.maxHealthBonus;
  elHealth.style.width = `${Math.round((player.health / maxHp) * 100)}%`;
  elHunger.style.width = `${Math.round(player.hunger)}%`;
  elBerries.textContent = String(player.berries);
  if (elMedkits) elMedkits.textContent = String(player.medkits || 0);
  if (elFreezes) elFreezes.textContent = String(player.freezes || 0);
}

// ===== Rendering =====
function drawBackground() {
  // ground (grass-like)
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.fillStyle = "#122016";
  ctx.fillRect(camera.x, camera.y, innerWidth, innerHeight);

  // layered grass noise
  const cell = 48;
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#2a6a39";
  const minX = Math.max(0, Math.floor(camera.x / cell) * cell);
  const minY = Math.max(0, Math.floor(camera.y / cell) * cell);
  const maxX = Math.min(world.width, minX + innerWidth + cell * 2);
  const maxY = Math.min(world.height, minY + innerHeight + cell * 2);
  for (let y = minY; y < maxY; y += cell) {
    for (let x = minX; x < maxX; x += cell) {
      const r = 12 + ((x * 928371 + y * 1237) % 9);
      ctx.beginPath();
      ctx.arc(x + 18, y + 18, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#3a8a4a";
  for (let y = minY + cell / 2; y < maxY; y += cell) {
    for (let x = minX + cell / 2; x < maxX; x += cell) {
      ctx.beginPath();
      ctx.arc(x + 10, y + 12, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawTree(o) {
  const px = Math.round(o.x - camera.x);
  const py = Math.round(o.y - camera.y);
  ctx.save();
  ctx.translate(px, py);
  // trunk
  ctx.fillStyle = "#7b4b2a";
  ctx.fillRect(-4, -2, 8, 22);
  // canopy
  ctx.beginPath();
  ctx.arc(0, -8, o.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#2e6b3a";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-6, -12, o.radius * 0.75, 0, Math.PI * 2);
  ctx.arc(7, -10, o.radius * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = "#348645";
  ctx.fill("evenodd");
  ctx.restore();
}

function drawRock(o) {
  const px = Math.round(o.x - camera.x);
  const py = Math.round(o.y - camera.y);
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = "#6e7077";
  ctx.beginPath();
  ctx.moveTo(-o.radius, 4);
  ctx.lineTo(-o.radius * 0.6, -o.radius * 0.3);
  ctx.lineTo(0, -o.radius * 0.6);
  ctx.lineTo(o.radius * 0.7, -o.radius * 0.2);
  ctx.lineTo(o.radius, 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#4a4c50";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawGrass(o) {
  const px = Math.round(o.x - camera.x);
  const py = Math.round(o.y - camera.y);
  ctx.save();
  ctx.translate(px, py);
  ctx.strokeStyle = "#3aa85e";
  ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const a = randRange(-Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6);
    const len = randRange(o.radius * 0.5, o.radius);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(Math.cos(a) * len * 0.3, Math.sin(a) * len * 0.3, Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHouse(o) {
  const px = Math.round(o.x - camera.x);
  const py = Math.round(o.y - camera.y);
  const w = o.width || 80;
  const h = o.height || 80;
  ctx.save();
  ctx.translate(px, py);
  // body
  ctx.fillStyle = o.color || "#8b3d3d";
  ctx.fillRect(-w/2, -h/2, w, h);
  // roof
  ctx.fillStyle = "#5a2a2a";
  if (o.roof === "flat") {
    ctx.fillRect(-w/2, -h/2 - 8, w, 8);
  } else if (o.roof === "hip") {
    ctx.beginPath();
    ctx.moveTo(-w/2, -h/2);
    ctx.lineTo(0, -h/2 - 14);
    ctx.lineTo(w/2, -h/2);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-w/2 - 6, -h/2);
    ctx.lineTo(0, -h/2 - 18);
    ctx.lineTo(w/2 + 6, -h/2);
    ctx.closePath();
    ctx.fill();
  }
  // door (interactive area at bottom center)
  ctx.fillStyle = "#3b2a1a";
  ctx.fillRect(-10, h/2 - 28, 20, 28);
  // windows
  ctx.fillStyle = "#d7e8ff";
  ctx.fillRect(-w/2 + 10, -h/2 + 12, 18, 14);
  ctx.fillRect(w/2 - 28, -h/2 + 12, 18, 14);
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

function drawHuman(x, y, opts = {}) {
  const px = Math.round(x - camera.x);
  const py = Math.round(y - camera.y);
  ctx.save();
  ctx.translate(px, py);
  const scale = (opts.scale || 1);
  // legs (lighter for contrast)
  ctx.strokeStyle = "#3a4756";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-4 * scale, 8 * scale); ctx.lineTo(-4 * scale, 16 * scale);
  ctx.moveTo(4 * scale, 8 * scale); ctx.lineTo(4 * scale, 16 * scale);
  ctx.stroke();
  // body
  ctx.fillStyle = opts.bodyColor || "#3b82f6";
  ctx.fillRect(-7 * scale, -4 * scale, 14 * scale, 14 * scale);
  // arms
  ctx.strokeStyle = "#d6b28a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8 * scale, -2 * scale); ctx.lineTo(-12 * scale, 6 * scale);
  ctx.moveTo(8 * scale, -2 * scale); ctx.lineTo(12 * scale, 6 * scale);
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.arc(0, -10 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#f1cf9e";
  ctx.fill();
  // shield aura
  if (opts.shield) {
    ctx.beginPath();
    ctx.arc(0, 0, 18 * scale, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(147,197,253,0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBandit(x, y) {
  const px = Math.round(x - camera.x);
  const py = Math.round(y - camera.y);
  ctx.save();
  ctx.translate(px, py);
  // hoodie body
  ctx.fillStyle = "#2b2f36";
  ctx.fillRect(-8, -4, 16, 16);
  // head with mask
  ctx.beginPath();
  ctx.arc(0, -10, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#302e2b";
  ctx.fill();
  ctx.fillStyle = "#111318";
  ctx.fillRect(-6, -12, 12, 6);
  // knife hint
  ctx.strokeStyle = "#c4c7ce";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, 4); ctx.lineTo(15, 1);
  ctx.stroke();
  ctx.restore();
}

function drawBerryCluster(x, y, radius) {
  const px = Math.round(x - camera.x);
  const py = Math.round(y - camera.y);
  ctx.save();
  ctx.translate(px, py);
  // leaves
  ctx.fillStyle = "#2f7d3d";
  ctx.beginPath();
  ctx.ellipse(-6, -6, radius * 0.7, radius * 0.35, -0.6, 0, Math.PI * 2);
  ctx.ellipse(6, -6, radius * 0.7, radius * 0.35, 0.6, 0, Math.PI * 2);
  ctx.fill();
  // berries
  const dots = 6;
  for (let i = 0; i < dots; i++) {
    const a = (Math.PI * 2 / dots) * i + 0.3;
    const r = radius * 0.9;
    const bx = Math.cos(a) * r * 0.6;
    const by = Math.sin(a) * r * 0.6;
    ctx.beginPath();
    ctx.arc(bx, by, radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#d02e5f";
    ctx.fill();
    // highlight
    ctx.beginPath();
    ctx.arc(bx - 2, by - 2, radius * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fill();
  }
  // stem
  ctx.strokeStyle = "#2f7d3d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.4);
  ctx.lineTo(0, -radius);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  // Terrain
  for (const d of decorations) {
    if (d.type === "grass") drawGrass(d);
  }
  for (const o of obstacles) {
    if (o.type === "tree") drawTree(o);
    else if (o.type === "rock") drawRock(o);
    else if (o.type === "house") drawHouse(o);
  }

  // Berries
  for (const b of berries) drawBerryCluster(b.x, b.y, b.radius);

  // Enemies
  for (const e of enemies) drawBandit(e.x, e.y);

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
    } else if (o.type === "speed") {
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
    } else if (o.type === "shield") {
      // shield: hexagon
      ctx.strokeStyle = "#89c2ff";
      ctx.fillStyle = "rgba(137,194,255,0.25)";
      ctx.lineWidth = 2;
      const r = 10;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const vx = Math.cos(a) * r;
        const vy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(vx, vy); else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (o.type === "freeze") {
      // freeze: snowflake-like
      ctx.strokeStyle = "#aee3ff";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Player
  if (player.hiddenInHouseId == null) {
    drawHuman(player.x, player.y, { shield: player.shieldTimer > 0 });
  }
}

// ===== Main Loop =====
function update(dt) {
  if (paused) return;
  if (dead) return;
  if (won) return;

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


