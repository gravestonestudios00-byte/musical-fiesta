(() => {
  if (
    typeof state === 'undefined' ||
    typeof keys === 'undefined' ||
    typeof pointer === 'undefined' ||
    typeof toggleMenu === 'undefined' ||
    typeof update === 'undefined' ||
    typeof updateEnemies === 'undefined' ||
    typeof defeatEnemy === 'undefined' ||
    typeof screenToWorld === 'undefined' ||
    typeof clamp === 'undefined' ||
    typeof rand === 'undefined'
  ) {
    console.warn('Chrono Grove stabilization layer skipped because the base game did not finish loading.');
    return;
  }

  // Dynamically generated buttons should have a single action path.
  addButtonAction = function addButtonActionOnce(button, action) {
    if (!button) return;
    button.addEventListener('click', event => {
      event.preventDefault();
      action();
    });
    button.addEventListener('keydown', event => {
      if ((event.code === 'Enter' || event.code === 'Space') && !event.repeat) {
        event.preventDefault();
        action();
      }
    });
  };

  // Existing static buttons were already wired before this layer loads. Keep their click
  // handler, but suppress the extra pointer/touch handlers that double-fired actions.
  for (const type of ['pointerup', 'touchend']) {
    document.addEventListener(type, event => {
      const target = event.target;
      if (target instanceof Element && target.closest('button')) {
        event.stopPropagation();
      }
    }, true);
  }

  const clearLiveInput = () => {
    keys.clear();
    pointer.down = false;
  };

  const originalToggleMenu = toggleMenu;
  toggleMenu = function toggleMenuWithPause(forceOpen = null) {
    const priorMode = state.mode;
    originalToggleMenu(forceOpen);
    const menuOpen = !menuPanel.classList.contains('hidden');

    if (menuOpen && priorMode === 'playing') state.mode = 'paused';
    if (!menuOpen && state.mode === 'paused') state.mode = 'playing';
    clearLiveInput();
  };

  window.addEventListener('blur', () => {
    if (state.mode === 'playing') toggleMenu(true);
    else clearLiveInput();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (state.mode === 'playing') toggleMenu(true);
    else clearLiveInput();
  });

  const originalUpdateEnemies = updateEnemies;
  updateEnemies = function updateEnemiesWithFireflyFinishes(dt) {
    originalUpdateEnemies(dt);
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      if (enemy.hp <= 0) defeatEnemy(enemy, i);
    }
  };

  const originalUpdate = update;
  update = function updateWithStableDashAndTrails(dt) {
    const player = state.player;
    let dashProbe = null;

    if (state.mode === 'playing' && player && keys.has('Space') && player.dashCooldown <= 0) {
      let mx = 0;
      let my = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;

      const moveMagnitude = Math.hypot(mx, my);
      const moving = moveMagnitude || 1;
      const aim = screenToWorld(pointer.x, pointer.y);
      const aimAngle = Math.atan2(aim.y - player.y, aim.x - player.x);
      const aimedX = Math.cos(aimAngle);
      const aimedY = Math.sin(aimAngle);
      const dashScale = player.dashPower * 0.16;

      dashProbe = {
        player,
        buggyX: ((mx / moving) || aimedX) * dashScale,
        buggyY: ((my / moving) || aimedY) * dashScale,
        fixedX: (moveMagnitude > 0 ? mx / moving : aimedX) * dashScale,
        fixedY: (moveMagnitude > 0 ? my / moving : aimedY) * dashScale,
        cooldown: player.dashCooldown
      };
    }

    originalUpdate(dt);

    if (!dashProbe || state.player !== dashProbe.player) return;
    const dashHappened = dashProbe.cooldown <= 0 && dashProbe.player.dashCooldown > 0;
    if (!dashHappened) return;

    dashProbe.player.x = clamp(dashProbe.player.x + dashProbe.fixedX - dashProbe.buggyX, -1720, 1720);
    dashProbe.player.y = clamp(dashProbe.player.y + dashProbe.fixedY - dashProbe.buggyY, -1220, 1220);

    if (dashProbe.player.trails) {
      for (let i = 0; i < 3; i += 1) {
        state.flowers.push({
          x: dashProbe.player.x - dashProbe.fixedX * (i / 3) + rand(-18, 18),
          y: dashProbe.player.y - dashProbe.fixedY * (i / 3) + rand(-18, 18),
          r: rand(10, 18),
          hue: 130 + rand(-20, 25),
          sway: rand(0, Math.PI * 2),
          slow: true,
          life: 2.2
        });
      }
    }
  };

  console.info('Chrono Grove stabilization layer active.');
})();
