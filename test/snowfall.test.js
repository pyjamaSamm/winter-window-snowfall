const assert = require('node:assert/strict');
const test = require('node:test');
const { SnowScene } = require('../media/snowfall.js');

test('creates snowflakes and advances them when the scene steps', () => {
	const scene = new SnowScene(320, 240, () => 0.5);
	assert.ok(scene.flakes.length > 0);
	const before = scene.flakes.map((flake) => flake.y);

	scene.step(0.05);

	assert.ok(scene.flakes.some((flake, index) => flake.y > before[index]));
});

test('deposits snow when flakes reach the ground and clears the snow pile', () => {
	const scene = new SnowScene(80, 80, () => 0.5);
	scene.flakes = [{ x: 20, y: 79, radius: 2, opacity: 1, phase: 0, velocity: 30 }];

	scene.step(0.05);

	assert.ok(scene.pile.some((depth) => depth > 0));
	const flakesBeforeClear = scene.flakes.map((flake) => flake.y);
	scene.clear();
	assert.ok(scene.pile.every((depth) => depth === 0));
	assert.deepEqual(scene.flakes.map((flake) => flake.y), flakesBeforeClear);
});

test('tree drops land and remain when only the ground snow is cleared', () => {
	const scene = new SnowScene(320, 240, () => 0.5);
	const tree = scene.dropTree();
	assert.equal(scene.trees.get(0), tree);
	assert.equal(scene.treesFalling, true);

	for (let i = 0; i < 100; i++) scene.stepTrees(0.05);
	assert.equal(tree.landed, true);
	assert.equal(scene.treesFalling, false);

	scene.clear();
	assert.equal(scene.trees.size, 1);
});

test('tree placement keeps a tilted canopy inside the sidebar edges', () => {
	const scene = new SnowScene(320, 240, () => 0.5);
	const values = [0, 0, 0.5, 1];
	scene.random = () => values.shift() ?? 0.5;
	const tree = scene.dropTree();
	const horizontalExtent = tree.size * (0.33 * Math.cos(tree.tilt) + 1.1 * Math.abs(Math.sin(tree.tilt)));

	assert.ok(tree.x - horizontalExtent >= 0);
	assert.ok(tree.x + horizontalExtent <= scene.width);
});
