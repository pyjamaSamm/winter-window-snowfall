(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('snow');
  const context = canvas.getContext('2d');
  const pause = document.getElementById('pause');
  const sync = document.getElementById('sync');
  const status = document.getElementById('status');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saved = vscode.getState();
  let paused = true;
  let synced = Boolean(saved && saved.synced);
  let visible = true;
  let frame;
  let lastTime;
  const scene = new globalThis.SnowScene(window.innerWidth, window.innerHeight);
  const typing = new globalThis.TypingFlow();
  const aurora = new globalThis.AuroraFlow();

  if (motion.matches) scene.seed();

  function draw() {
    const width = scene.width;
    const height = scene.height;
    context.clearRect(0, 0, width, height);

    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0c172a');
    sky.addColorStop(1, '#203950');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    for (let index = 0; index < 28; index++) {
      const x = ((index * 79 + 31) % 997) / 997 * width;
      const y = ((index * 53 + 19) % 503) / 503 * height * 0.7;
      context.globalAlpha = 0.15 + (index % 4) * 0.1;
      context.fillStyle = '#d2e6f7';
      context.fillRect(x, y, 1.5, 1.5);
    }

    context.globalAlpha = 1;
    drawAurora(width, height);

    const moonX = width * 0.77;
    const glow = context.createRadialGradient(moonX, height * 0.26, 0, moonX, height * 0.26, 60);
    glow.addColorStop(0, '#dbeeffaa');
    glow.addColorStop(1, '#dbeeff00');
    context.fillStyle = glow;
    context.fillRect(moonX - 60, height * 0.26 - 60, 120, 120);

    context.fillStyle = '#dbeeff';
    context.beginPath();
    context.arc(moonX, height * 0.26, 13, 0, Math.PI * 2);
    context.fill();

    drawTrees();

    for (const flake of scene.flakes) {
      context.globalAlpha = flake.opacity;
      context.fillStyle = '#dbeeff';
      context.beginPath();
      context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      context.fill();
    }

    context.globalAlpha = 1;

    const snow = context.createLinearGradient(0, height * 0.73, 0, height);
    snow.addColorStop(0, '#fafaff');
    snow.addColorStop(1, '#bbddeb');
    context.fillStyle = snow;
    context.beginPath();
    context.moveTo(0, height);
    for (let index = 0; index < scene.pile.length; index++) {
      context.lineTo(index * scene.cellWidth, height - scene.pile[index]);
    }
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();
  }

  function drawAurora(width, height) {
    if (aurora.opacity === 0) return;
    const phase = performance.now() / 1000 * 0.65;
    const colors = ['#0fffcf', '#02d9ed', '#9b02ff'];
    for (let index = 0; index < 64; index++) {
      const position = index / 64;
      for (let layer = 0; layer < colors.length; layer++) {
        const fold = Math.sin(position * Math.PI * 4 + layer * 1.8);
        const lift = Math.sin(phase + position * 11 + layer * 2);
        const shimmer = 0.5 + 0.5 * Math.sin(phase * 1.7 + position * 25 + layer);
        const bottom = 0.43 + layer * 0.035 + fold * 0.06 + lift * 0.055;
        const length = 0.19 + shimmer * 0.12 + fold * 0.025;
        const top = bottom - length;
        const rayWidth = Math.max(2, width / 64) * (0.45 + shimmer * 0.8);
        const lean = Math.sin(position * 9 + layer) * 0.015;
        const light = context.createLinearGradient(0, top * height, 0, bottom * height);
        light.addColorStop(0, colors[layer] + '00');
        light.addColorStop(0.45, colors[layer] + '28');
        light.addColorStop(0.8, colors[layer] + '99');
        light.addColorStop(1, colors[layer] + '00');
        context.fillStyle = light;
        context.globalAlpha = aurora.opacity * (0.16 + shimmer * 0.3) * Math.pow(Math.sin(position * Math.PI), 0.8);
        context.beginPath();
        const x = position * width;
        context.moveTo(x + lean - rayWidth * 0.3, top * height);
        context.lineTo(x + lean + rayWidth * 0.3, top * height);
        context.lineTo(x + rayWidth * 0.9, bottom * height);
        context.lineTo(x - rayWidth * 0.9, bottom * height);
        context.closePath();
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  function drawTrees() {
    for (const index of scene.trees.keys()) {
      const tree = scene.trees.get(index);
      context.save();
      context.translate(tree.x, tree.y);
      context.rotate(tree.tilt);
      context.scale(tree.size, tree.size);
      context.fillStyle = '#78513d';
      context.fillRect(-0.045, -0.2, 0.09, 0.2);
      const greens = ['#164b3d', '#1d6350', '#26775d'];
      for (let layer = 0; layer < 3; layer++) {
        const bottom = -0.12 - layer * 0.23;
        const halfWidth = 0.32 - layer * 0.065;
        context.fillStyle = greens[layer];
        context.beginPath();
        context.moveTo(0, bottom - 0.44);
        context.lineTo(halfWidth, bottom);
        context.lineTo(-halfWidth, bottom);
        context.closePath();
        context.fill();
      }
      const colors = ['#fff0a6', '#ff7896', '#78d9f2', '#d4a6ff'];
      for (let light = 0; light < 16; light++) {
        const row = Math.floor(light / 4);
        const y = -0.25 - row * 0.17;
        const spread = 0.25 - row * 0.05;
        const x = ((light % 4) / 3 * 2 - 1) * spread;
        const color = colors[(light + index) % colors.length];
        const glow = context.createRadialGradient(x, y, 0, x, y, 0.05);
        glow.addColorStop(0, color + 'e0');
        glow.addColorStop(1, color + '00');
        context.fillStyle = glow;
        context.fillRect(x - 0.05, y - 0.05, 0.1, 0.1);
        context.fillStyle = color;
        context.beginPath();
        context.arc(x, y, 0.027, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = '#fffe6a';
      context.beginPath();
      for (let point = 0; point < 10; point++) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 === 0 ? 0.075 : 0.033;
        const x = Math.cos(angle) * radius;
        const y = -1.02 + Math.sin(angle) * radius;
        if (point === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.closePath();
      context.fill();
      context.restore();
    }
  }

  function tick(time) {
    frame = undefined;
    const speed = synced ? typing.getSpeed(time) : scene.speed;
    aurora.update(time, synced && typing.isFast(time));
    const seconds = lastTime === undefined ? 0 : (time - lastTime) / 1000;
    scene.step(seconds, speed);
    scene.stepTrees(seconds);
    lastTime = time;
    draw();
    updateStatus(speed);
    if ((synced || speed > 0 || aurora.active || aurora.opacity > 0 || scene.treesFalling)) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function updateStatus(speed) {
    const text = motion.matches
      ? 'Still scene: reduced motion is enabled.'
      : paused ? 'Snowfall paused.'
      : synced ? aurora.opacity > 0 ? 'Northern lights: your typing lit up the sky.'
      : speed > 0 ? 'Snowfall follows your typing.' : 'Type in an editor to make it snow.'
      : 'Snow is falling.';
    if (status.textContent !== text) status.textContent = text;
  }

  function updatePlayback() {
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    frame = undefined;
    lastTime = undefined;
    typing.reset();
    aurora.reset();
    pause.textContent = paused ? 'Resume' : 'Pause';
    pause.setAttribute('aria-pressed', String(paused));
    pause.disabled = motion.matches;
    sync.textContent = synced ? 'Sync with typing: On' : 'Sync with typing: Off';
    sync.setAttribute('aria-pressed', String(synced));
    sync.disabled = motion.matches || paused || (!motion.matches && visible && document.hidden);
    const shouldAnimate = !paused && visible && !document.hidden && !motion.matches
      && (!synced || scene.treesFalling);
    if (shouldAnimate && frame === undefined) {
      frame = window.requestAnimationFrame(tick);
    }
    updateStatus(synced ? typing.getSpeed(performance.now()) : scene.speed);
  }

  function resize() {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    scene.resize(window.innerWidth, window.innerHeight);
    canvas.width = Math.round(scene.width * scale);
    canvas.height = Math.round(scene.height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    draw();
  }

  pause.addEventListener('click', () => {
    paused = !paused;
    vscode.setState({ synced });
    updatePlayback();
  });

  sync.addEventListener('click', () => {
    synced = !synced;
    vscode.setState({ synced });
    vscode.postMessage({ type: 'syncTyping', enabled: synced });
    updatePlayback();
  });

  document.getElementById('clear').addEventListener('click', () => {
    scene.clear();
    draw();
  });

  document.getElementById('tree').addEventListener('click', () => {
    scene.dropTree(paused || motion.matches);
    draw();
    updatePlayback();
  });

  window.addEventListener('resize', resize);

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (message.type === 'settings') {
      scene.configure(message.density, message.speed);
      draw();
    } else if (message.type === 'typing') {
      if (synced && !paused && !motion.matches && visible && !document.hidden) {
        typing.record(performance.now());
        updateStatus();
        if (frame === undefined) {
          lastTime = undefined;
          frame = window.requestAnimationFrame(tick);
        }
      }
    } else if (message.type === 'visibility' && typeof message.visible === 'boolean') {
      visible = message.visible;
      updatePlayback();
    }
  });

  resize();
  updatePlayback();
  vscode.postMessage({ type: 'ready', syncTyping: synced });
})();
