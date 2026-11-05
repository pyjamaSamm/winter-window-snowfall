const assert = require('node:assert/strict');
const test = require('node:test');
const { AuroraFlow, TypingFlow } = require('../media/snowfall.js');

test('typing speed rises after edits and fades back to zero', () => {
	const typing = new TypingFlow();
	assert.equal(typing.getSpeed(0), 0);

	typing.record(1000);
	assert.ok(typing.getSpeed(1000) > 0);
	assert.equal(typing.getSpeed(5000), 0);
});

test('typing pulses detect fast typing only within the recent window', () => {
	const typing = new TypingFlow();
	for (let i = 0; i < 9; i++) typing.record(i * 100);

	assert.equal(typing.isFast(800), true);
	assert.equal(typing.isFast(2500), false);
});

test('aurora waits for sustained fast typing, then fades after typing stops', () => {
	const aurora = new AuroraFlow();
	for (let time = 0; time <= 5000; time += 100) aurora.update(time, true);
	assert.equal(aurora.active, true);

	for (let time = 5100; time <= 11200; time += 100) aurora.update(time, false);
	assert.equal(aurora.active, false);
	assert.equal(aurora.opacity, 0);
});
