const canvas = document.querySelector('#game');
const ctx = canvas?.getContext?.('2d');

const startScreen = document.querySelector('#startScreen');
const startBtn = document.querySelector('#startBtn');
const howBtn = document.querySelector('#howBtn');
const menuBtn = document.querySelector('#menuBtn');
const menuPanel = document.querySelector('#menuPanel');
const closeMenu = document.querySelector('#closeMenu');
const menuStartBtn = document.querySelector('#menuStartBtn');
const scaleButtons = document.querySelectorAll('.scaleBtn');
const menuSparkCount = document.querySelector('#menuSparkCount');
const menuGroveCount = document.querySelector('#menuGroveCount');
const menuDefeatCount = document.querySelector('#menuDefeatCount');
const menuCurrentZone = document.querySelector('#menuCurrentZone');
const menuStats = document.querySelector('#menuStats');
const menuWeaponGrid = document.querySelector('#menuWeaponGrid');
const menuStageName = document.querySelector('#menuStageName');
const menuStageCopy = document.querySelector('#menuStageCopy');
const howPanel = document.querySelector('#howPanel');
const closeHow = document.querySelector('#closeHow');
const levelUp = document.querySelector('#levelUp');
const choices = document.querySelector('#choices');
const gameOver = document.querySelector('#gameOver');
const endingTitle = document.querySelector('#endingTitle');
const endingText = document.querySelector('#endingText');
const restartBtn = document.querySelector('#restartBtn');
const bootError = document.querySelector('#bootError');
const bootErrorText = document.querySelector('#bootErrorText');

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const keys = new Set();
const pointer = { x: 640, y: 360, down: false };
let viewScale = 1;
let bootBlocked = false;
let loopStopped = false;

function showBootError(error, blockGame = false) {
  if (blockGame) bootBlocked = true;
  console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  if (bootErrorText) {
    bootErrorText.textContent = `Chrome reported: ${message}. Try refreshing, or run through a local server instead of a file preview.`;
  }
  if (bootError) bootError.classList.remove('hidden');
}

if (!canvas || !ctx) {
  showBootError(new Error('Canvas is not available in this browser view'), true);
}

window.addEventListener('error', event => {
  if (event.filename?.includes('src/game.js')) {
    showBootError(event.error || event.message, true);
  }
});
window.addEventListener('unhandledrejection', event => {
  const stack = String(event.reason?.stack || event.reason || '');
  if (stack.includes('src/game.js')) showBootError(event.reason, true);
});

function addButtonAction(button, action) {
  if (!button) return;
  const run = event => {
    event?.preventDefault?.();
    action();
  };
  button.addEventListener('click', run);
  button.addEventListener('pointerup', run);
  button.addEventListener('touchend', run, { passive: false });
  button.addEventListener('keydown', event => {
    if (event.code === 'Enter' || event.code === 'Space') run(event);
  });
}

const weaponCatalog = {
  starbow: { name: 'Starbow', short: 'Bow', icon: '🏹', hue: 48, cooldown: 0.22, speed: 670, damage: 1, size: 6, life: 1.05, unlock: 'Balanced sparkle arrows.' },
  chakram: { name: 'Comet Chakram', short: 'Ring', icon: '💠', hue: 180, cooldown: 0.42, speed: 460, damage: 0.72, size: 10, life: 1.55, pierce: 3, unlock: 'Pierces crowds in a wide arc.' },
  beam: { name: 'Nova Beam', short: 'Beam', icon: '🔮', hue: 300, cooldown: 0.34, speed: 820, damage: 0.9, size: 4, life: 0.72, beam: true, unlock: 'Fast laser notes for precision.' },
  mortar: { name: 'Meteor Mortar', short: 'Bomb', icon: '☄️', hue: 22, cooldown: 0.78, speed: 360, damage: 1.75, size: 12, life: 1.25, explosive: true, unlock: 'Arcing shells that burst.' }
};

const zones = [
  { name: 'Lantern Meadow', hue: 170, goal: 80, enemies: 12, boss: 'Moss Tuba' },
  { name: 'Nimbus Orchard', hue: 205, goal: 105, enemies: 16, boss: 'Cloud Cymbal' },
  { name: 'Briar Ballroom', hue: 310, goal: 135, enemies: 21, boss: 'Thorn Maestro' },
  { name: 'Glacier Chorus', hue: 190, goal: 170, enemies: 26, boss: 'Frost Fiddle' },
  { name: 'Amber Arcade', hue: 38, goal: 215, enemies: 32, boss: 'Brass Jackal' },
  { name: 'Velvet Meteor', hue: 275, goal: 265, enemies: 40, boss: 'Comet Diva' },
  { name: 'Solar Conservatory', hue: 55, goal: 320, enemies: 48, boss: 'Sun Drum' },
  { name: 'Chrono Grove', hue: 145, goal: 400, enemies: 60, boss: 'The Clockwork Conductor' }
];

const relicPool = [
  ['Comet Chakram', 'Unlock a piercing ring weapon. Press 2 to equip it.', s => unlockWeapon(s, 'chakram')],
  ['Nova Beam', 'Unlock a fast laser-note weapon. Press 3 to equip it.', s => unlockWeapon(s, 'beam')],
  ['Meteor Mortar', 'Unlock explosive meteor shells. Press 4 to equip it.', s => unlockWeapon(s, 'mortar')],
  ['Prism Bow', 'Sparks split into two glittering notes.', s => { s.player.multi += 1; }],
  ['Moon Sneakers', 'Move 16% faster and dash farther.', s => { s.player.speed *= 1.16; s.player.dashPower += 95; }],
  ['Tempo Heart', 'Gain a larger health pool and heal now.', s => { s.player.maxHp += 25; s.player.hp = s.player.maxHp; }],
  ['Bass Shield', 'Damage taken is reduced by 18%.', s => { s.player.armor += 0.18; }],
  ['Encore Engine', 'Projectiles reload 15% faster.', s => { s.player.fireRate *= 0.85; }],
  ['Magnet Marimba', 'Collect sparks from farther away.', s => { s.player.magnet += 70; }],
  ['Star Snare', 'Shots hit 20% harder.', s => { s.player.damage *= 1.2; }],
  ['Firefly Friends', 'Two orbiting fireflies zap nearby foes.', s => { s.player.fireflies += 2; }],
  ['Garden Boots', 'Leave slowing flower trails while dashing.', s => { s.player.trails = true; }]
];

const state = {
  mode: 'menu',
  time: 0,
  shake: 0,
  zone: 0,
  messageTimer: 0,
  message: 'Welcome to Chrono Grove!',
  projectiles: [],
  particles: [],
  sailBits: [],
  enemies: [],
  pickups: [],
  flowers: [],
  portals: [],
  relics: [],
  stats: { defeated: 0, rescued: 0, minutes: 0 },
  quest: { sparks: 0, deposited: 0, defeated: 0, bossReady: false, bossDefeated: false },
  transition: null,
  uiScale: 1,
  player: null
};

function newPlayer() {
  return {
    x: 0,
    y: 0,
    r: 19,
    hp: 110,
    maxHp: 110,
    speed: 245,
    damage: 20,
    fireRate: 1,
    fireCooldown: 0,
    weapon: 'starbow',
    unlockedWeapons: ['starbow'],
    dashCooldown: 0,
    dashPower: 430,
    armor: 0,
    magnet: 130,
    multi: 1,
    fireflies: 0,
    trails: false,
    invuln: 0,
    level: 1,
    xp: 0,
    xpNeed: 95
  };
}

function unlockWeapon(s, key) {
  if (!s.player.unlockedWeapons.includes(key)) s.player.unlockedWeapons.push(key);
  s.player.weapon = key;
  const slot = Object.keys(weaponCatalog).indexOf(key) + 1;
  s.message = `${weaponCatalog[key].name} unlocked! Press ${slot} to swap weapons.`;
  s.messageTimer = 5;
}

function setUiScale(scale) {
  state.uiScale = scale;
  document.documentElement.style.setProperty('--ui-scale', scale);
  refreshMenuPanel();
}

function toggleMenu(forceOpen = null) {
  const shouldOpen = forceOpen ?? menuPanel.classList.contains('hidden');
  refreshMenuPanel();
  menuPanel.classList.toggle('hidden', !shouldOpen);
}

function refreshMenuPanel() {
  const p = state.player || newPlayer();
  const zone = zones[state.zone] || zones[0];
  if (menuSparkCount) menuSparkCount.textContent = Math.floor((state.quest?.sparks || 0) + (state.quest?.deposited || 0));
  if (menuGroveCount) menuGroveCount.textContent = `${state.stats.rescued}/${zones.length}`;
  if (menuDefeatCount) menuDefeatCount.textContent = state.stats.defeated;
  if (menuCurrentZone) menuCurrentZone.textContent = zone.name;
  if (menuStageName) menuStageName.textContent = `${state.zone + 1}. ${zone.name}`;
  if (menuStageCopy) menuStageCopy.textContent = `${zone.goal} sparks • ${zone.enemies} sentinels • Boss: ${zone.boss}`;
  if (menuStats) {
    menuStats.innerHTML = [
      ['Health', `${Math.ceil(p.hp)}/${p.maxHp}`],
      ['Level', p.level],
      ['Damage', Math.round(p.damage)],
      ['Speed', Math.round(p.speed)]
    ].map(([label, value]) => `<div class="stat-pill"><span>${label}</span><b>${value}</b></div>`).join('');
  }
  if (menuWeaponGrid) {
    menuWeaponGrid.innerHTML = Object.entries(weaponCatalog).map(([key, weapon], index) => {
      const unlocked = p.unlockedWeapons.includes(key);
      const active = p.weapon === key;
      return `<button class="equipment-slot ${unlocked ? '' : 'locked'} ${active ? 'active' : ''}" type="button" data-weapon-slot="${index + 1}"><i class="slot-icon">${weapon.icon}</i><b>${index + 1}. ${weapon.short}</b><span>${unlocked ? weapon.unlock : 'Locked relic'}</span></button>`;
    }).join('');
    menuWeaponGrid.querySelectorAll('[data-weapon-slot]').forEach(button => addButtonAction(button, () => {
      equipWeapon(Number(button.dataset.weaponSlot));
      refreshMenuPanel();
    }));
  }
}

function equipWeapon(slot) {
  if (!state.player) return;
  const key = Object.keys(weaponCatalog)[slot - 1];
  if (state.player.unlockedWeapons.includes(key)) {
    state.player.weapon = key;
    state.message = `${weaponCatalog[key].name} equipped.`;
  } else {
    state.message = `${weaponCatalog[key].name} is locked. Pick its relic to unlock it.`;
  }
  state.messageTimer = 2.4;
  refreshMenuPanel();
}


function resize() {
  if (bootBlocked) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  viewScale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
}

function resetGame() {
  if (bootBlocked) return;
  state.mode = 'playing';
  state.time = 0;
  state.zone = 0;
  state.projectiles = [];
  state.particles = [];
  state.sailBits = [];
  state.enemies = [];
  state.pickups = [];
  state.flowers = [];
  state.portals = [];
  state.relics = [];
  state.stats = { defeated: 0, rescued: 0, minutes: 0 };
  state.transition = null;
  state.player = newPlayer();
  startScreen.classList.add('hidden');
  gameOver.classList.add('hidden');
  levelUp.classList.add('hidden');
  menuPanel.classList.add('hidden');
  enterZone(0);
}

function enterZone(index) {
  state.mode = 'playing';
  state.transition = null;
  state.sailBits = [];
  state.zone = index;
  state.quest = { sparks: 0, deposited: 0, defeated: 0, bossReady: false, bossDefeated: false };
  state.player.x = 0;
  state.player.y = 0;
  state.projectiles = [];
  state.enemies = [];
  state.pickups = [];
  state.sailBits = [];
  state.flowers = [];
  state.portals = [{ x: 0, y: 0, r: 58, pulse: 0 }];
  const zone = zones[index];
  state.message = `${zone.name}: gather ${zone.goal} sparks and calm ${zone.boss}.`;
  state.messageTimer = 5;

  for (let i = 0; i < 120; i += 1) {
    state.flowers.push({ x: rand(-1650, 1650), y: rand(-1150, 1150), r: rand(2, 8), hue: zone.hue + rand(-35, 55), sway: rand(0, TAU) });
  }
  for (let i = 0; i < 42; i += 1) spawnPickup(rand(-1450, 1450), rand(-1050, 1050), 'spark', 1 + Math.floor(i % 3));
  for (let i = 0; i < zone.enemies; i += 1) spawnEnemy(false);
}

function spawnEnemy(boss = false) {
  const angle = rand(0, TAU);
  const radius = boss ? 720 : rand(420, 1500);
  const zone = zones[state.zone];
  state.enemies.push({
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    r: boss ? 42 : rand(16, 26),
    hp: boss ? 420 + state.zone * 140 : 44 + state.zone * 12,
    maxHp: boss ? 420 + state.zone * 140 : 44 + state.zone * 12,
    speed: boss ? 82 + state.zone * 6 : rand(48, 92) + state.zone * 4,
    damage: boss ? 22 : 10 + state.zone * 1.5,
    hue: boss ? (zone.hue + 145) % 360 : zone.hue + rand(-60, 80),
    boss,
    wobble: rand(0, TAU),
    shoot: boss ? 1.4 : rand(2.4, 4.4),
    name: boss ? zone.boss : 'sentinel'
  });
}

function spawnPickup(x, y, type, value = 1) {
  state.pickups.push({ x, y, type, value, r: type === 'heart' ? 12 : 8, t: rand(0, TAU) });
}

function addParticles(x, y, hue, count, power = 1) {
  for (let i = 0; i < count; i += 1) {
    const a = rand(0, TAU);
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * rand(30, 210) * power,
      vy: Math.sin(a) * rand(30, 210) * power,
      life: rand(0.35, 0.9),
      max: 0.9,
      hue,
      size: rand(2, 7) * power
    });
  }
}

function shoot(angle, spread = 0) {
  const p = state.player;
  const weapon = weaponCatalog[p.weapon] || weaponCatalog.starbow;
  const count = weapon.beam ? Math.max(1, p.multi + 1) : p.multi;
  for (let i = 0; i < count; i += 1) {
    const wave = weapon.explosive ? Math.sin(state.time * 8 + i) * 0.08 : 0;
    const offset = (i - (count - 1) / 2) * (weapon.beam ? 0.055 : 0.14) + spread + wave;
    state.projectiles.push({
      x: p.x + Math.cos(angle + offset) * 24,
      y: p.y + Math.sin(angle + offset) * 24,
      vx: Math.cos(angle + offset) * weapon.speed,
      vy: Math.sin(angle + offset) * weapon.speed,
      r: weapon.size,
      life: weapon.life,
      damage: p.damage * weapon.damage,
      enemy: false,
      hue: weapon.hue,
      weapon: p.weapon,
      pierce: weapon.pierce || 0,
      explosive: !!weapon.explosive,
      beam: !!weapon.beam
    });
  }
}

function enemyShoot(enemy) {
  const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  const count = enemy.boss ? 5 : 1;
  for (let i = 0; i < count; i += 1) {
    const spread = (i - (count - 1) / 2) * 0.22;
    state.projectiles.push({
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle + spread) * (enemy.boss ? 285 : 230),
      vy: Math.sin(angle + spread) * (enemy.boss ? 285 : 230),
      r: enemy.boss ? 9 : 6,
      life: 3,
      damage: enemy.boss ? 14 : 8,
      enemy: true,
      hue: enemy.hue
    });
  }
}

function update(dt) {
  if (bootBlocked) return;
  state.time += dt;
  if (state.mode === 'transition') {
    updateSailTransition(dt);
    updateParticles(dt);
    return;
  }
  if (state.mode !== 'playing') return;
  state.stats.minutes = Math.floor(state.time / 60);
  state.messageTimer = Math.max(0, state.messageTimer - dt);
  state.shake = Math.max(0, state.shake - dt * 18);
  const p = state.player;
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);

  let mx = 0;
  let my = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  const moving = Math.hypot(mx, my) || 1;
  p.x += (mx / moving) * p.speed * dt;
  p.y += (my / moving) * p.speed * dt;
  p.x = clamp(p.x, -1720, 1720);
  p.y = clamp(p.y, -1220, 1220);

  const aim = screenToWorld(pointer.x, pointer.y);
  if ((pointer.down || state.time % 0.5 < dt) && p.fireCooldown <= 0) {
    shoot(Math.atan2(aim.y - p.y, aim.x - p.x));
    const weapon = weaponCatalog[p.weapon] || weaponCatalog.starbow;
    p.fireCooldown = weapon.cooldown * p.fireRate;
  }

  if (keys.has('Space') && p.dashCooldown <= 0) {
    p.x += (mx / moving || Math.cos(Math.atan2(aim.y - p.y, aim.x - p.x))) * p.dashPower * 0.16;
    p.y += (my / moving || Math.sin(Math.atan2(aim.y - p.y, aim.x - p.x))) * p.dashPower * 0.16;
    p.invuln = 0.36;
    p.dashCooldown = 1.9;
    state.shake = 5;
    if (p.trails) addParticles(p.x, p.y, 130, 24, 0.8);
  }

  updateProjectiles(dt);
  updateEnemies(dt);
  updatePickups(dt);
  updateParticles(dt);
  updateQuest();
}

function updateSailTransition(dt) {
  const transition = state.transition;
  if (!transition) return;
  transition.t += dt;
  transition.spark += dt * 28;
  const p = state.player;
  const progress = clamp(transition.t / transition.duration, 0, 1);
  const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  p.x = transition.origin.x + Math.sin(ease * Math.PI * 2) * 42;
  p.y = transition.origin.y - Math.sin(ease * Math.PI) * 96;
  state.shake = Math.max(state.shake, Math.sin(progress * Math.PI) * 5);

  while (transition.spark >= 1) {
    transition.spark -= 1;
    state.sailBits.push({
      x: p.x + rand(-70, 70),
      y: p.y + rand(28, 96),
      vx: rand(-55, 55),
      vy: rand(65, 155),
      life: rand(0.55, 1.15),
      max: 1.15,
      hue: zones[transition.from].hue + rand(-20, 70),
      size: rand(2, 8)
    });
  }
  if (state.sailBits.length > 360) state.sailBits.splice(0, state.sailBits.length - 360);
  if (progress >= 1) enterZone(transition.to);
}

function startSailTransition(nextZone) {
  state.mode = 'transition';
  state.transition = { from: state.zone, to: nextZone, t: 0, duration: 3.8, spark: 0, origin: { x: state.player.x, y: state.player.y } };
  state.message = `Sailing to ${zones[nextZone].name}...`;
  state.messageTimer = 3.2;
  state.projectiles = [];
  state.enemies = [];
  state.pickups = [];
  state.sailBits = [];
  addParticles(state.player.x, state.player.y, zones[state.zone].hue, 80, 1.6);
}

function updateProjectiles(dt) {
  const p = state.player;
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const shot = state.projectiles[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;

    if (shot.enemy) {
      if (dist(shot, p) < shot.r + p.r && p.invuln <= 0) {
        damagePlayer(shot.damage);
        addParticles(p.x, p.y, shot.hue, 16);
        state.projectiles.splice(i, 1);
      }
    } else {
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        if (dist(shot, enemy) < shot.r + enemy.r) {
          enemy.hp -= shot.damage;
          addParticles(shot.x, shot.y, enemy.hue, 5);
          if (shot.explosive) explodeShot(shot);
          if (shot.pierce > 0) {
            shot.pierce -= 1;
          } else {
            state.projectiles.splice(i, 1);
          }
          if (enemy.hp <= 0 && state.enemies[j] === enemy) defeatEnemy(enemy, j);
          break;
        }
      }
    }

    if (shot.life <= 0) {
      if (shot.explosive && !shot.enemy) explodeShot(shot);
      state.projectiles.splice(i, 1);
    }
  }
}

function explodeShot(shot) {
  addParticles(shot.x, shot.y, shot.hue, 28, 1.2);
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const d = dist(shot, enemy);
    if (d < 120) {
      enemy.hp -= shot.damage * (1 - d / 140);
      if (enemy.hp <= 0) defeatEnemy(enemy, i);
    }
  }
}

function updateEnemies(dt) {
  const p = state.player;
  if (state.enemies.length < 18 + state.zone * 5 && !state.quest.bossDefeated && Math.random() < dt * 0.75) spawnEnemy(false);

  for (const enemy of state.enemies) {
    enemy.wobble += dt * 3;
    const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x) + Math.sin(enemy.wobble) * 0.28;
    const slow = state.flowers.some(f => f.slow && dist(f, enemy) < 90) ? 0.55 : 1;
    enemy.x += Math.cos(angle) * enemy.speed * slow * dt;
    enemy.y += Math.sin(angle) * enemy.speed * slow * dt;
    enemy.shoot -= dt;
    if (enemy.shoot <= 0) {
      enemyShoot(enemy);
      enemy.shoot = enemy.boss ? rand(0.85, 1.45) : rand(2.2, 4.5);
    }
    if (dist(enemy, p) < enemy.r + p.r && p.invuln <= 0) {
      damagePlayer(enemy.damage);
      const shove = Math.atan2(p.y - enemy.y, p.x - enemy.x);
      p.x += Math.cos(shove) * 36;
      p.y += Math.sin(shove) * 36;
    }
  }

  for (let i = 0; i < p.fireflies; i += 1) {
    const a = state.time * 2.7 + i * TAU / p.fireflies;
    const bug = { x: p.x + Math.cos(a) * 72, y: p.y + Math.sin(a) * 72 };
    const target = state.enemies.find(enemy => dist(enemy, bug) < 115);
    if (target) {
      target.hp -= 22 * dt;
      addParticles(target.x, target.y, 58, 1, 0.7);
    }
  }
}

function updatePickups(dt) {
  const p = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const item = state.pickups[i];
    item.t += dt * 4;
    const range = p.magnet + (item.type === 'spark' ? 70 : 0);
    const d = dist(item, p);
    if (d < range) {
      item.x += (p.x - item.x) * dt * 5.5;
      item.y += (p.y - item.y) * dt * 5.5;
    }
    if (d < p.r + item.r + 8) {
      if (item.type === 'spark') state.quest.sparks += item.value;
      if (item.type === 'heart') p.hp = Math.min(p.maxHp, p.hp + 28);
      if (item.type === 'xp') gainXp(item.value);
      addParticles(item.x, item.y, item.type === 'heart' ? 345 : 50, 10);
      state.pickups.splice(i, 1);
    }
  }

  if (dist(p, state.portals[0]) < 80 && state.quest.sparks > 0) {
    const deposit = Math.min(state.quest.sparks, 25 * dt);
    state.quest.sparks -= deposit;
    state.quest.deposited += deposit;
    addParticles(0, 0, zones[state.zone].hue, 2, 0.8);
  }
}

function updateParticles(dt) {
  for (let i = state.sailBits.length - 1; i >= 0; i -= 1) {
    const bit = state.sailBits[i];
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.life -= dt;
    if (bit.life <= 0) state.sailBits.splice(i, 1);
  }
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const bit = state.particles[i];
    bit.x += bit.vx * dt;
    bit.y += bit.vy * dt;
    bit.vx *= 0.96;
    bit.vy *= 0.96;
    bit.life -= dt;
    if (bit.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.flowers.length - 1; i >= 0; i -= 1) {
    const flower = state.flowers[i];
    flower.sway += dt;
    if (flower.slow) {
      flower.life -= dt;
      if (flower.life <= 0) state.flowers.splice(i, 1);
    }
  }
}

function updateQuest() {
  const zone = zones[state.zone];
  if (!state.quest.bossReady && state.quest.deposited >= zone.goal && state.quest.defeated >= zone.enemies) {
    state.quest.bossReady = true;
    spawnEnemy(true);
    state.message = `${zone.boss} arrives! Calm the rhythm to restore the grove.`;
    state.messageTimer = 5;
    state.shake = 12;
  }
  if (state.quest.bossDefeated && dist(state.player, state.portals[0]) < 95 && keys.has('KeyE')) {
    if (state.zone === zones.length - 1) finish(true);
    else startSailTransition(state.zone + 1);
  }
}

function gainXp(amount) {
  const p = state.player;
  p.xp += amount;
  if (p.xp >= p.xpNeed) {
    p.xp -= p.xpNeed;
    p.xpNeed = Math.floor(p.xpNeed * 1.28 + 30);
    p.level += 1;
    state.mode = 'choice';
    showRelicChoices();
  }
}

function defeatEnemy(enemy, index) {
  state.enemies.splice(index, 1);
  state.quest.defeated += enemy.boss ? 0 : 1;
  state.stats.defeated += 1;
  state.shake = enemy.boss ? 16 : 5;
  addParticles(enemy.x, enemy.y, enemy.hue, enemy.boss ? 54 : 18, enemy.boss ? 1.6 : 1);
  const drops = enemy.boss ? 38 : rand(2, 5);
  for (let i = 0; i < drops; i += 1) spawnPickup(enemy.x + rand(-34, 34), enemy.y + rand(-34, 34), 'spark', enemy.boss ? 3 : 1);
  spawnPickup(enemy.x, enemy.y, 'xp', enemy.boss ? 95 : 22);
  if (Math.random() < 0.12 || enemy.boss) spawnPickup(enemy.x + 18, enemy.y - 8, 'heart');
  if (enemy.boss) {
    state.quest.bossDefeated = true;
    state.stats.rescued += 1;
    state.message = `${enemy.name} is in tune! Return to the beacon and press E.`;
    state.messageTimer = 7;
    gainXp(120 + state.zone * 25);
  }
}

function damagePlayer(amount) {
  const p = state.player;
  const reduced = amount * (1 - clamp(p.armor, 0, 0.65));
  p.hp -= reduced;
  p.invuln = 0.7;
  state.shake = 10;
  if (p.hp <= 0) finish(false);
}

function showRelicChoices() {
  choices.innerHTML = '';
  const weaponRelicKeys = { 'Comet Chakram': 'chakram', 'Nova Beam': 'beam', 'Meteor Mortar': 'mortar' };
  const available = relicPool.filter(relic => !weaponRelicKeys[relic[0]] || !state.player.unlockedWeapons.includes(weaponRelicKeys[relic[0]]));
  const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, 3);
  for (const relic of shuffled) {
    const button = document.createElement('button');
    button.className = 'choice-card';
    button.innerHTML = `<strong>${relic[0]}</strong><span>${relic[1]}</span>`;
    button.addEventListener('click', () => {
      relic[2](state);
      state.relics.push(relic[0]);
      state.mode = 'playing';
      levelUp.classList.add('hidden');
    });
    choices.append(button);
  }
  levelUp.classList.remove('hidden');
}

function finish(won) {
  state.mode = 'ended';
  endingTitle.textContent = won ? 'Festival Restored!' : 'The Grove Fades...';
  endingText.textContent = won
    ? `You restored all ${zones.length} groves, tuned ${state.stats.defeated} sentinels, and played for ${Math.max(1, Math.floor(state.time / 60))} minutes. Try a new relic path for a longer run!`
    : `You reached ${zones[state.zone].name} after ${Math.max(1, Math.floor(state.time / 60))} minutes. Keep upgrades flowing and use dash invulnerability to survive.`;
  gameOver.classList.remove('hidden');
}

function screenToWorld(x, y) {
  const camera = getCamera();
  return { x: (x - window.innerWidth / 2) / camera.zoom + camera.x, y: (y - window.innerHeight / 2) / camera.zoom + camera.y };
}

function getCamera() {
  const p = state.player || { x: 0, y: 0 };
  return { x: p.x, y: p.y, zoom: clamp(viewScale * 1.08, 0.62, 1.15) };
}

function draw() {
  if (bootBlocked) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  const camera = getCamera();
  const shakeX = rand(-state.shake, state.shake);
  const shakeY = rand(-state.shake, state.shake);
  ctx.save();
  ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  drawWorld();
  ctx.restore();
  drawHud(w, h);
  drawSailOverlay(w, h);
}

function drawWorld() {
  const zone = zones[state.zone] || zones[0];
  const grd = ctx.createRadialGradient(0, 0, 100, 0, 0, 2200);
  grd.addColorStop(0, `hsl(${zone.hue} 55% 18%)`);
  grd.addColorStop(0.55, '#10162d');
  grd.addColorStop(1, '#070a18');
  ctx.fillStyle = grd;
  ctx.fillRect(-2200, -1600, 4400, 3200);

  ctx.strokeStyle = `hsla(${zone.hue}, 90%, 65%, 0.13)`;
  ctx.lineWidth = 3;
  for (let r = 220; r < 1700; r += 190) {
    ctx.beginPath();
    ctx.arc(0, 0, r + Math.sin(state.time + r) * 8, 0, TAU);
    ctx.stroke();
  }

  for (const flower of state.flowers) {
    ctx.fillStyle = `hsla(${flower.hue}, 90%, ${flower.slow ? 58 : 66}%, ${flower.slow ? 0.22 : 0.58})`;
    ctx.beginPath();
    ctx.ellipse(flower.x, flower.y, flower.r * 1.8, flower.r, flower.sway, 0, TAU);
    ctx.fill();
  }

  drawBeacon(zone);
  for (const item of state.pickups) drawPickup(item);
  for (const shot of state.projectiles) drawShot(shot);
  for (const enemy of state.enemies) drawEnemy(enemy);
  drawPlayer();
  for (const bit of state.particles) drawParticle(bit);
  for (const bit of state.sailBits) drawParticle(bit);
}

function drawBeacon(zone) {
  const quest = state.quest;
  const fill = clamp(quest.deposited / zone.goal, 0, 1);
  ctx.save();
  ctx.shadowBlur = 35;
  ctx.shadowColor = `hsl(${zone.hue} 95% 70%)`;
  ctx.fillStyle = `hsla(${zone.hue}, 90%, 60%, 0.16)`;
  ctx.beginPath();
  ctx.arc(0, 0, 82 + Math.sin(state.time * 3) * 6, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = `hsl(${zone.hue} 95% 67%)`;
  ctx.beginPath();
  ctx.arc(0, 0, 58, -Math.PI / 2, -Math.PI / 2 + TAU * fill);
  ctx.stroke();
  ctx.fillStyle = '#fff4b8';
  ctx.beginPath();
  ctx.moveTo(0, -38);
  for (let i = 1; i < 10; i += 1) {
    const a = -Math.PI / 2 + i * TAU / 10;
    const r = i % 2 ? 17 : 38;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const p = state.player;
  if (!p) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(state.time * 0.8);
  ctx.globalAlpha = p.invuln > 0 ? 0.62 + Math.sin(state.time * 40) * 0.25 : 1;
  ctx.shadowBlur = 26;
  ctx.shadowColor = '#ffd36b';
  ctx.fillStyle = '#ffd36b';
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = i * TAU / 8;
    const r = i % 2 ? p.r * 0.72 : p.r * 1.18;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#181027';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, TAU);
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < p.fireflies; i += 1) {
    const a = state.time * 2.7 + i * TAU / p.fireflies;
    ctx.fillStyle = '#b8ff66';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * 72, p.y + Math.sin(a) * 72, 6, 0, TAU);
    ctx.fill();
  }
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.wobble * 0.3);
  ctx.shadowBlur = enemy.boss ? 26 : 12;
  ctx.shadowColor = `hsl(${enemy.hue} 90% 60%)`;
  ctx.fillStyle = `hsl(${enemy.hue} 80% ${enemy.boss ? 52 : 44}%)`;
  ctx.beginPath();
  for (let i = 0; i < 9; i += 1) {
    const a = i * TAU / 9;
    const r = enemy.r * (0.75 + (i % 3) * 0.18);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = enemy.boss ? 4 : 2;
  ctx.stroke();
  ctx.restore();

  const bar = enemy.boss ? 92 : 42;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(enemy.x - bar / 2, enemy.y - enemy.r - 18, bar, 6);
  ctx.fillStyle = '#ff6f91';
  ctx.fillRect(enemy.x - bar / 2, enemy.y - enemy.r - 18, bar * clamp(enemy.hp / enemy.maxHp, 0, 1), 6);
}

function drawPickup(item) {
  const bob = Math.sin(item.t) * 4;
  ctx.save();
  ctx.translate(item.x, item.y + bob);
  ctx.shadowBlur = 18;
  ctx.shadowColor = item.type === 'heart' ? '#ff6fae' : '#ffd36b';
  ctx.fillStyle = item.type === 'heart' ? '#ff6fae' : item.type === 'xp' ? '#66e6ff' : '#ffd36b';
  ctx.beginPath();
  ctx.arc(0, 0, item.r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(-3, -3, item.r * 0.32, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawShot(shot) {
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(Math.atan2(shot.vy, shot.vx));
  ctx.shadowBlur = shot.beam ? 26 : 16;
  ctx.shadowColor = `hsl(${shot.hue} 95% 64%)`;
  ctx.fillStyle = `hsl(${shot.hue} 95% 64%)`;
  ctx.beginPath();
  if (shot.beam) {
    if (ctx.roundRect) ctx.roundRect(-shot.r * 3, -shot.r / 2, shot.r * 8, shot.r, shot.r / 2);
    else ctx.rect(-shot.r * 3, -shot.r / 2, shot.r * 8, shot.r);
  } else if (shot.explosive) {
    ctx.moveTo(shot.r, 0);
    for (let i = 1; i < 8; i += 1) {
      const a = i * TAU / 8;
      const r = i % 2 ? shot.r * 0.55 : shot.r;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (shot.pierce) {
    ctx.arc(0, 0, shot.r, 0, TAU);
    ctx.moveTo(shot.r * 1.5, 0);
    ctx.arc(0, 0, shot.r * 1.5, 0, TAU);
  } else {
    ctx.arc(0, 0, shot.r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

function drawParticle(bit) {
  ctx.globalAlpha = clamp(bit.life / bit.max, 0, 1);
  ctx.fillStyle = `hsl(${bit.hue} 95% 65%)`;
  ctx.beginPath();
  ctx.arc(bit.x, bit.y, bit.size, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHud(w, h) {
  if (!state.player) return;
  ctx.save();
  ctx.scale(state.uiScale, state.uiScale);
  w /= state.uiScale;
  h /= state.uiScale;
  const p = state.player;
  const zone = zones[state.zone];
  const weapon = weaponCatalog[p.weapon] || weaponCatalog.starbow;
  panel(18, 18, 390, 166);
  bar(38, 45, 250, 16, p.hp / p.maxHp, '#ff6f91', 'Health');
  bar(38, 82, 250, 12, p.xp / p.xpNeed, '#66e6ff', `Level ${p.level}`);
  bar(38, 114, 250, 12, state.quest.deposited / zone.goal, '#ffd36b', 'Beacon');
  ctx.fillStyle = '#edf4ff';
  ctx.font = '800 18px system-ui';
  ctx.fillText(zone.name, 310, 58);
  ctx.fillStyle = '#b7c6e8';
  ctx.font = '700 13px system-ui';
  ctx.fillText(`Sparks held: ${Math.floor(state.quest.sparks)} / Need: ${zone.goal}`, 310, 85);
  ctx.fillText(`Sentinels: ${state.quest.defeated}/${zone.enemies}`, 310, 108);
  ctx.fillText(`Groves: ${state.stats.rescued}/${zones.length}`, 310, 131);
  ctx.fillText(`Weapon: ${weapon.name}`, 38, 150);

  panel(w - 315, 18, 295, 126);
  ctx.fillStyle = '#edf4ff';
  ctx.font = '800 16px system-ui';
  ctx.fillText('Weapons & Relics', w - 292, 48);
  ctx.fillStyle = '#b7c6e8';
  ctx.font = '700 12px system-ui';
  const weaponText = Object.keys(weaponCatalog).map((key, index) => `${index + 1}:${p.unlockedWeapons.includes(key) ? weaponCatalog[key].short : 'Lock'}`).join('  ');
  ctx.fillText(weaponText, w - 292, 72);
  const relicText = state.relics.slice(-3).join(' • ') || 'Level up to choose relics';
  wrapText(relicText, w - 292, 96, 252, 16);

  if (state.messageTimer > 0) {
    panel(w / 2 - 330, h - 92, 660, 58);
    ctx.fillStyle = '#edf4ff';
    ctx.font = '800 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, w / 2, h - 56);
    ctx.textAlign = 'left';
  }

  if (state.quest.bossDefeated) {
    ctx.fillStyle = '#ffd36b';
    ctx.font = '900 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Return to the beacon and press E to sail onward', w / 2, 42);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawSailOverlay(w, h) {
  if (state.mode !== 'transition' || !state.transition) return;
  const transition = state.transition;
  const progress = clamp(transition.t / transition.duration, 0, 1);
  const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  const fromHue = zones[transition.from].hue;
  const toHue = zones[transition.to].hue;

  ctx.save();
  const glow = ctx.createLinearGradient(0, 0, w, h);
  glow.addColorStop(0, `hsla(${fromHue}, 92%, 18%, ${0.25 + progress * 0.35})`);
  glow.addColorStop(0.48, `hsla(${toHue}, 95%, 52%, ${0.18 + Math.sin(progress * Math.PI) * 0.32})`);
  glow.addColorStop(1, `rgba(2, 6, 18, ${0.32 + Math.sin(progress * Math.PI) * 0.32})`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 90; i += 1) {
    const x = (i * 97 + state.time * 180) % (w + 160) - 80;
    const y = (i * 53) % h;
    ctx.fillStyle = `hsla(${i % 2 ? fromHue : toHue}, 95%, 75%, ${0.16 + (i % 5) * 0.04})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 4), 0, TAU);
    ctx.fill();
  }

  drawMenuIsland(w * (0.18 - ease * 0.22), h * 0.66, fromHue, 0.85 - ease * 0.55);
  drawMenuIsland(w * (0.82 + (1 - ease) * 0.22), h * 0.58, toHue, 0.35 + ease * 0.65);

  const shipX = w * (0.18 + ease * 0.64);
  const shipY = h * (0.66 - Math.sin(progress * Math.PI) * 0.22);
  ctx.translate(shipX, shipY);
  ctx.rotate(Math.sin(progress * Math.PI * 2) * 0.08);
  ctx.shadowBlur = 40;
  ctx.shadowColor = `hsl(${toHue} 95% 68%)`;
  ctx.fillStyle = '#291a34';
  roundRect(-72, 8, 144, 34, 14);
  ctx.fill();
  ctx.fillStyle = `hsl(${toHue} 90% 62%)`;
  ctx.beginPath();
  ctx.moveTo(-48, 8);
  ctx.lineTo(0, -72);
  ctx.lineTo(52, 8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, -82);
  ctx.stroke();
  ctx.fillStyle = '#ffd36b';
  ctx.beginPath();
  ctx.arc(0, 8, 18 + Math.sin(state.time * 12) * 3, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#edf4ff';
  ctx.font = `900 ${Math.max(24, 38 * state.uiScale)}px system-ui`;
  ctx.fillText(`Sailing to ${zones[transition.to].name}`, w / 2, h * 0.18);
  ctx.fillStyle = '#ffd36b';
  ctx.font = `800 ${Math.max(14, 17 * state.uiScale)}px system-ui`;
  ctx.fillText('The festival skiff rides a chrono current to the next grove.', w / 2, h * 0.18 + 38);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(w / 2 - 150, h * 0.18 + 62, 300, 10, 999);
  ctx.fill();
  ctx.fillStyle = `hsl(${toHue} 95% 65%)`;
  roundRect(w / 2 - 150, h * 0.18 + 62, 300 * progress, 10, 999);
  ctx.fill();
  ctx.restore();
}

function drawMenuIsland(x, y, hue, alpha) {
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(x, y);
  ctx.fillStyle = `hsl(${hue} 48% 32%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 120, 42, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `hsl(${hue} 70% 62%)`;
  ctx.beginPath();
  ctx.ellipse(0, -14, 92, 34, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#eaffff';
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 42 - 18, -24);
    ctx.lineTo(i * 42, -70 - Math.abs(i) * 12);
    ctx.lineTo(i * 42 + 22, -24);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 14, 30, 0.62)';
  roundRect(x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.stroke();
}

function bar(x, y, w, h, fill, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(x, y, w * clamp(fill, 0, 1), h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#edf4ff';
  ctx.font = '800 12px system-ui';
  ctx.fillText(label, x, y - 6);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

let last = performance.now();
function loop(now) {
  if (bootBlocked || loopStopped) return;
  try {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  } catch (error) {
    loopStopped = true;
    showBootError(error, true);
  }
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', event => {
  keys.add(event.code);
  if (event.code === 'Escape' || event.code === 'KeyM') toggleMenu();
  if (/^Digit[1-4]$/.test(event.code)) equipWeapon(Number(event.code.slice(-1)));
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
});
window.addEventListener('keyup', event => keys.delete(event.code));
canvas?.addEventListener('pointermove', event => { pointer.x = event.clientX; pointer.y = event.clientY; });
canvas?.addEventListener('pointerdown', event => { pointer.down = true; pointer.x = event.clientX; pointer.y = event.clientY; });
window.addEventListener('pointerup', () => { pointer.down = false; });

addButtonAction(startBtn, resetGame);
addButtonAction(restartBtn, resetGame);
addButtonAction(howBtn, () => howPanel.classList.remove('hidden'));
addButtonAction(menuBtn, () => toggleMenu(true));
addButtonAction(closeMenu, () => toggleMenu(false));
addButtonAction(menuStartBtn, () => {
  if (state.mode === 'menu' || !state.player) resetGame();
  else toggleMenu(false);
});
addButtonAction(closeHow, () => howPanel.classList.add('hidden'));
scaleButtons.forEach(button => addButtonAction(button, () => setUiScale(Number(button.dataset.scale))));

try {
  resize();
  requestAnimationFrame(loop);
} catch (error) {
  showBootError(error, true);
}
