const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');

function loadExtensionWithVscodeMock() {
	const state = { messages: [], subscriptions: [], activeEditor: undefined };
	const vscode = {
		Uri: {
			joinPath: (base, name) => ({ path: `${base.path}/${name}` })
		},
		window: {
			registerWebviewViewProvider: (id, provider, options) => {
				state.view = { id, provider, options };
				return { dispose() {} };
			},
			registerCommand: (id, callback) => {
				state.command = { id, callback };
				return { dispose() {} };
			},
			get activeTextEditor() { return state.activeEditor; }
		},
			workspace: {
				getConfiguration: () => ({ get: (_key, fallback) => fallback }),
				onDidChangeTextDocument: (callback) => {
					state.onTextDocument = callback;
					return { dispose() {} };
				},
				onDidChangeConfiguration: () => ({ dispose() {} })
			},
			commands: {
				registerCommand: (id, callback) => {
					state.command = { id, callback };
					return { dispose() {} };
				},
				executeCommand: async () => undefined
			}
		};
	const originalLoad = Module._load;
	Module._load = function (request, parent, isMain) {
		if (request === 'vscode') return vscode;
		return originalLoad.call(this, request, parent, isMain);
	};
	try {
		const filename = require.resolve('../extension.js');
		delete require.cache[filename];
		return { extension: require(filename), state };
	} finally {
		Module._load = originalLoad;
	}
}

function eventHook() {
	return (_listener) => ({ dispose() {} });
}

test('registers and resolves the Snowfall webview with valid local resources', () => {
	const { extension, state } = loadExtensionWithVscodeMock();
	const context = { extensionUri: { path: '/extension' }, subscriptions: [] };
	extension.activate(context);
	assert.equal(state.view.id, 'snowfall.scene');

	const posted = [];
	let receiveMessage;
	const webview = {
		cspSource: 'https://webview.test',
		asWebviewUri: (uri) => `https://webview.test/${uri.path}`,
		onDidReceiveMessage: (listener) => {
			receiveMessage = listener;
			return { dispose() {} };
		},
		postMessage: async (message) => posted.push(message)
	};
	const view = {
		webview,
		visible: true,
		onDidChangeVisibility: eventHook(),
		onDidDispose: eventHook()
	};

	state.view.provider.resolveWebviewView(view);
	assert.match(webview.html, /src="https:\/\/webview\.test\/\/extension\/media\/snowfall\.js"/);
	assert.match(webview.html, /src="https:\/\/webview\.test\/\/extension\/media\/panel\.js"/);
	assert.match(webview.html, /<main>[\s\S]*<button id="pause"/);
	assert.match(webview.html, /<h1>Winter Window: Snowfall<\/h1>/);
	assert.match(webview.html, /Watch snow fall while you let your agents do your work!/);
	assert.match(webview.html, /<button id="clear"/);
	assert.match(webview.html, /<button id="sync"/);
	assert.match(webview.html, /<button id="tree"/);
	assert.match(webview.html, /<svg width="18" height="20" viewBox="0 0 18 20"[\s\S]*?<path fill="#4ada44" d="M9 1 4 7h2\.6/);
	assert.equal(webview.options.enableScripts, true);
	assert.ok(context.subscriptions.length > 0);

	receiveMessage({ type: 'ready' });
	assert.deepEqual(posted, [
		{ type: 'settings', density: 90, speed: 1 },
		{ type: 'visibility', visible: true }
	]);
});

test('forwards editor typing only when the webview has enabled typing sync', () => {
	const { extension, state } = loadExtensionWithVscodeMock();
	extension.activate({ extensionUri: { path: '/extension' }, subscriptions: [] });
	const posted = [];
	let receiveMessage;
	const webview = {
		cspSource: 'https://webview.test',
		asWebviewUri: (uri) => uri.path,
		onDidReceiveMessage: (listener) => { receiveMessage = listener; return { dispose() {} }; },
		postMessage: async (message) => posted.push(message)
	};
	const document = {};
	state.view.provider.resolveWebviewView({
		webview,
		visible: true,
		onDidChangeVisibility: eventHook(),
		onDidDispose: eventHook()
	});
	receiveMessage({ type: 'ready', syncTyping: true });
	state.activeEditor = { document };
	state.onTextDocument({
		document,
		reason: undefined,
		contentChanges: [{}]
	});
	assert.deepEqual(posted.at(-1), { type: 'typing' });
});
