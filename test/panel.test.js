const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function loadPanel(savedState) {
	const frames = new Map();
	const messages = [];
	const drawnStyles = [];
	const arcs = [];
	const windowListeners = new Map();
	let nextFrame = 1;
	const context2d = {
		clearRect() {}, fillRect() {}, beginPath() {},
		arc(x, y, radius) { arcs.push([x, y, radius]); }, fill() {},
		moveTo() {}, lineTo() {}, closePath() {}, save() {}, restore() {},
		translate() {}, rotate() {}, scale() {}, setTransform() {},
		createLinearGradient() { return { addColorStop() {} }; },
		createRadialGradient() { return { addColorStop() {} }; }
	};
	Object.defineProperty(context2d, 'fillStyle', {
		set(value) { drawnStyles.push(value); }
	});
	const elements = new Map();
	for (const id of ['snow', 'pause', 'clear', 'sync', 'tree', 'status']) {
		elements.set(id, {
			id,
			listeners: {},
			textContent: '',
			disabled: false,
			getContext: () => context2d,
			addEventListener(type, callback) { this.listeners[type] = callback; },
			setAttribute() {}
		});
	}
	const document = {
		hidden: false,
		getElementById: (id) => elements.get(id)
	};
	const window = {
		innerWidth: 320,
		innerHeight: 240,
		devicePixelRatio: 1,
		matchMedia: () => ({ matches: false }),
		requestAnimationFrame(callback) {
			const id = nextFrame++;
			frames.set(id, callback);
			return id;
		},
		cancelAnimationFrame(id) { frames.delete(id); },
		addEventListener(type, callback) { windowListeners.set(type, callback); }
	};
	const vscode = {
		getState: () => savedState,
		setState() {},
		postMessage: (message) => messages.push(message)
	};
	const sandbox = {
		window,
		document,
		performance: { now: () => 0 },
		acquireVsCodeApi: () => vscode,
		Map,
		Math,
		Array,
		Boolean,
		String
	};
	vm.createContext(sandbox);
	vm.runInContext(fs.readFileSync(require.resolve('../media/snowfall.js'), 'utf8'), sandbox);
	vm.runInContext(fs.readFileSync(require.resolve('../media/panel.js'), 'utf8'), sandbox);
	return { elements, frames, messages, windowListeners, drawnStyles, arcs };
}

function airborneFlakes(arcs) {
	const moonIndex = arcs.findLastIndex(([, , radius]) => radius === 13);
	return arcs.slice(moonIndex + 1).filter(([, y, radius]) => radius >= 1 && radius <= 3 && y > 0 && y < 240);
}

test('webview boots paused even if a previous run saved snowfall as active', () => {
	const panel = loadPanel({ paused: false, synced: false });
	assert.equal(panel.frames.size, 0, 'snowfall should be stopped by default');
	assert.equal(panel.elements.get('pause').textContent, 'Resume');
	assert.equal(panel.elements.get('status').textContent, 'Snowfall paused.');
	assert.equal(JSON.stringify(panel.messages.at(-1)), '{"type":"ready","syncTyping":false}');

	assert.doesNotThrow(() => panel.elements.get('pause').listeners.click());
	assert.ok(panel.frames.size > 0, 'snow animation should schedule another frame');
	const firstFrame = panel.frames.values().next().value;
	panel.frames.clear();
	assert.doesNotThrow(() => firstFrame(16));
	assert.ok(panel.frames.size > 0, 'snow animation should schedule another frame');
	const midairBeforePause = airborneFlakes(panel.arcs);

	assert.doesNotThrow(() => panel.elements.get('pause').listeners.click());
	assert.equal(panel.elements.get('pause').textContent, 'Resume');
	assert.equal(panel.frames.size, 0, 'pause should stop scheduled animation frames');
	assert.doesNotThrow(() => panel.elements.get('clear').listeners.click());
	assert.equal(panel.frames.size, 0, 'clearing while paused must not restart snowfall');
	const midairAfterClear = airborneFlakes(panel.arcs);
	assert.deepEqual(midairAfterClear, midairBeforePause, 'clear must leave airborne flakes in place');

	assert.doesNotThrow(() => panel.elements.get('pause').listeners.click());
	assert.ok(panel.frames.size > 0, 'resume should restart snowfall');
	const resumeFrame = panel.frames.values().next().value;
	panel.frames.clear();
	resumeFrame(5000);
	const afterResumeFrame = airborneFlakes(panel.arcs);
	assert.deepEqual(afterResumeFrame, midairBeforePause, 'resume must not jump flakes forward');

	assert.doesNotThrow(() => panel.elements.get('sync').listeners.click());
	assert.equal(JSON.stringify(panel.messages.at(-1)), '{"type":"syncTyping","enabled":true}');
	assert.equal(panel.frames.size, 0, 'typing sync should wait for an editor change');
	panel.windowListeners.get('message')({ data: { type: 'typing' } });
	assert.ok(panel.frames.size > 0, 'editor typing should start synchronized snow');
});

test('clearing ground snow does not pause active snowfall', () => {
	const panel = loadPanel();
	panel.elements.get('pause').listeners.click();
	assert.ok(panel.frames.size > 0);
	panel.elements.get('clear').listeners.click();
	assert.ok(panel.frames.size > 0, 'clear should leave the active animation scheduled');
	assert.equal(panel.elements.get('pause').textContent, 'Pause');
});

test('tree button starts its animation and handles reduced-motion scenes', () => {
	const panel = loadPanel();
	assert.doesNotThrow(() => panel.elements.get('tree').listeners.click());
	assert.equal(panel.frames.size, 0, 'trees added while stopped should remain still');
	for (const color of ['#fff0a6', '#ff7896', '#78d9f2', '#d4a6ff', '#fffe6a']) {
		assert.ok(panel.drawnStyles.includes(color), `decorated tree should draw ${color}`);
	}
	assert.doesNotThrow(() => panel.elements.get('clear').listeners.click());
	assert.doesNotThrow(() => panel.elements.get('pause').listeners.click());
	assert.doesNotThrow(() => panel.elements.get('tree').listeners.click());
	assert.ok(panel.frames.size > 0, 'a falling tree should animate after resume');
});
