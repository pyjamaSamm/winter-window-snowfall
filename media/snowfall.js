(function (root) {
  'use strict';
  const clamp = (value, min, max) => Math.min(Math.max(min, value), max);

  class TypingFlow {
    constructor() {
      this.reset();
    }

    reset() {
      this.pulses = [];
      this.lastEdit = undefined;
      this.speedAtLastEdit = 0;
    }

    record(time) {
      this.speedAtLastEdit = Math.min(3, this.getSpeed(time) + 0.5);
      this.lastEdit = time;
      this.pulses = this.pulses.filter((pulse) => time - pulse < 1500);
      this.pulses.push(time);
      this.pulses = this.pulses.slice(-60);
    }

    getSpeed(time) {
      if (this.lastEdit === undefined) return 0;
      const progress = clamp((time - this.lastEdit) / 2500, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      return this.speedAtLastEdit * (1 - eased);
    }

    isFast(time) {
      this.pulses = this.pulses.filter((pulse) => time - pulse < 1500);
      return this.pulses.length >= 9;
    }
  }

  class AuroraFlow {
    constructor() {
      this.reset();
    }

    reset() {
      this.fastSince = undefined;
      this.slowSince = undefined;
      this.lastTime = undefined;
      this.active = false;
      this.opacity = 0;
    }

    update(time, fast) {
      const elapsed = this.lastTime === undefined ? 0 : Math.max(0, time - this.lastTime);
      const wasActive = this.active;
      this.lastTime = time;

      if (fast) {
        this.slowSince = undefined;
        if (this.fastSince === undefined) this.fastSince = time;
        if (time - this.fastSince >= 4000) this.active = true;
      } else {
        this.fastSince = undefined;
        if (this.slowSince === undefined) this.slowSince = time;
        if (time - this.slowSince >= 3000) this.active = false;
      }

      const fadeElapsed = wasActive === this.active ? elapsed : 0;
      this.opacity = clamp(this.opacity + (this.active ? 1 : -1) * fadeElapsed / 2000, 0, 1);
      return this.opacity;
    }
  }

  class SnowScene {
    constructor(width, height, random = Math.random) {
      this.random = random;
      this.density = 90;
      this.speed = 1;
      this.flakes = [];
      this.trees = new Map();
      this.driftPhases = Array.from({ length: 3 }, () => this.random() * Math.PI * 2);
      this.resize(width, height);
      this.configure(this.density, this.speed);
    }

    resize(width, height) {
      const previous = this.pile || [];
      const previousWidth = this.width || width;
      const previousHeight = this.height || height;
      this.width = Math.max(1, width);
      this.height = Math.max(1, height);
      this.cellWidth = 4;
      const count = Math.ceil(this.width / this.cellWidth);
      this.capacity = Array.from({ length: count }, (_, index) => {
        const position = index / Math.max(1, count - 1) * Math.min(1, this.width / 240);
        const profile = 0.7
          + 0.18 * Math.sin(position * Math.PI * 2.6 + this.driftPhases[0])
          + 0.08 * Math.sin(position * Math.PI * 6.2 + this.driftPhases[1])
          + 0.04 * Math.sin(position * Math.PI * 13.4 + this.driftPhases[2]);
        return Math.floor(this.height * 0.28) * clamp(profile, 0.4, 1);
      });
      this.pile = Array.from({ length: count }, (_, index) =>
        Math.min(this.capacity[index],
          (previous.length / count) || 0
          * this.height / previousHeight)
      );
      for (const flake of this.flakes) {
        flake.x = clamp(flake.x, 0, this.width);
        flake.y = clamp(flake.y, 0, this.height);
      }
    }

    configure(density, speed) {
      this.density = density;
      this.speed = speed;
      const targetFlakeCount = Math.floor(this.width * this.height / 3600 * (1 + density / 100));
      while (this.flakes.length < targetFlakeCount) {
        this.flakes.push(this.newFlake(true));
      }
    }

    newFlake(scatter = false) {
      const radius = 1 + this.random() * 2;
      return {
        x: this.random() * this.width,
        y: scatter ? this.random() * this.height : -radius * 2,
        radius,
        opacity: 0.2 + this.random() * 0.8,
        phase: this.random() * Math.PI * 2,
        velocity: 14 + radius * 14,
        opacity: 0.35 + this.random() * 0.6
      };
    }

    clear() {
      this.pile.fill(0);
    }

    snowSurface(x) {
      const cell = clamp(Math.floor(x / this.cellWidth), 0, this.pile.length - 1);
      return this.height - this.pile[cell];
    }

    dropTree(instant = false) {
      const size = Math.min(48 + this.random() * 32, this.width * 0.7, this.height * 0.4);
      // Include the canopy's rotated width so no part of the tree is clipped at an edge.
      const margin = size * 0.56;
      const tree = {
        x: margin + this.random() * Math.max(0, this.width - margin * 2),
        y: -10,
        size,
        tilt: this.random() < 0.4 ? 0 : (this.random() - 0.5) * 0.36,
        velocity: 0,
        landed: instant
      };
      if (instant) tree.y = this.snowSurface(tree.x) + size * 0.025;
      this.trees.set(this.trees.size, tree);
      return tree;
    }

    stepTrees(seconds) {
      const dt = clamp(seconds, 0, 0.05);
      for (const tree of this.trees.values()) {
        if (tree.landed) continue;
        tree.velocity += 981 * dt;
        tree.y += tree.velocity * dt;
        const surface = this.snowSurface(tree.x) + tree.size * 0.025;
        if (tree.y >= surface) {
          tree.y = surface;
          tree.landed = true;
          tree.velocity = 0;
        }
      }
    }

    get treesFalling() {
      return Array.from(this.trees.values()).some((tree) => !tree.landed);
    }

    seed() {
      for (let index = 0; index < this.pile.length; index++) {
        this.pile[index] = this.capacity[index] * 0.4;
      }
    }

    deposit(x, radius) {
      const center = clamp(Math.floor(x / this.cellWidth), 0, this.pile.length - 1);
      for (let offset = -2; offset <= 2; offset++) {
        const index = center + offset;
        if (index >= 0 && index < this.pile.length) {
          const driftWeight = 0.5 + this.capacity[index] / Math.max(1, this.height * 0.28);
          this.pile[index] = Math.min(this.capacity[index],
            this.pile[index] + radius * 0.55 * driftWeight * (1 - Math.abs(offset) / 3));
        }
      }
    }

    step(seconds, speed = this.speed) {
      const dt = clamp(seconds, 0, 0.05) * clamp(speed, 0, 3);
      if (dt === 0) return;
      for (let index = 0; index < this.flakes.length; index++) {
        const flake = this.flakes[index];
        flake.phase += dt * 0.6;
        flake.x = (flake.x + Math.sin(flake.phase) * dt * 12 + this.width) % this.width;
        flake.y += flake.velocity * dt;
        const cell = Math.min(this.pile.length - 1, Math.floor(flake.x / this.cellWidth));
        if (flake.y + flake.radius >= this.height - this.pile[cell]) {
          this.deposit(flake.x, flake.radius);
          this.flakes[index] = this.newFlake();
        }
      }

      const next = this.pile.map((height, index, pile) => {
        const left = pile[Math.max(0, index - 1)];
        const right = pile[Math.min(pile.length - 1, index + 1)];
        return clamp(height + (left + right - 2 * height) * dt * 2, 0, this.capacity[index]);
      });
      this.pile = next;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SnowScene, TypingFlow, AuroraFlow };
  } else {
    root.SnowScene = SnowScene;
    root.TypingFlow = TypingFlow;
    root.AuroraFlow = AuroraFlow;
  }
})(globalThis);
