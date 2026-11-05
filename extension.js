const vscode = require('vscode');
const { randomBytes } = require('node:crypto');

function activate(context) {
	let currentView;
	let syncTyping = false;
	const settings = () => {
		const config = vscode.workspace.getConfiguration('snowfall');
		return {
			density: config.get('density', 90),
			speed: config.get('speed', 1)
		};
	};

	const provider = {
		resolveWebviewView(view) {
			currentView = view;
			syncTyping = false;
			const webview = view.webview;
			const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media');
			webview.options = { enableScripts: true, localResourceRoots: [mediaRoot] };
			const resource = (name) => webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, name));
			const nonce = randomBytes(16).toString('hex');
			webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
	<link rel="stylesheet" href="${resource('panel.css')}">
	<title>Winter Window: Snowfall</title>
</head>
<body>
	<canvas id="snow" aria-hidden="true"></canvas>
	<main>
	<h1>Winter Window: Snowfall</h1>
	<p>Watch snow fall while you let your agents do your work!</p>
	<div class="controls">
		<button id="pause" type="button" aria-pressed="false">Pause</button>
		<button id="clear" type="button">Clear snow</button>
		<button id="sync" type="button" aria-pressed="false">Sync with typing: Off</button>
		<button id="tree" type="button" aria-label="Drop a Christmas tree" title="Drop a Christmas tree">
		<svg width="18" height="20" viewBox="0 0 18 20" role="img" aria-hidden="true">
			<path fill="#4ada44" d="M9 1 4 7h2.6L3 12h3.4v3H5v2h8v-2h-1.4v-3H15l-3.6-5H14L9 1Z"/>
			<path fill="#e5c5a8" d="M8 15h2v4H8z"/>
			<circle fill="#ff9daa" cx="7" cy="9" r="0.8"/>
			<circle fill="#8acdea" cx="11" cy="12" r="0.8"/>
			<circle fill="#fff0a6" cx="9" cy="6" r="0.8"/>
		</svg>
	</button>
	</div>
	<p id="status" role="status">Snow is falling.</p>
	</main>
	<script nonce="${nonce}" src="${resource('snowfall.js')}"></script>
	<script nonce="${nonce}" src="${resource('panel.js')}"></script>
</body>
</html>`;

		context.subscriptions.push(
			view.webview.onDidReceiveMessage((message) => {
				if (message && message.type === 'ready') {
					syncTyping = typeof message.syncTyping === 'boolean' ? message.syncTyping : false;
					void webview.postMessage({ type: 'settings', ...settings() });
					void webview.postMessage({ type: 'visibility', visible: view.visible });
				} else if (message && message.type === 'syncTyping'
					&& typeof message.enabled === 'boolean') {
					syncTyping = message.enabled;
				}
			}),
			view.onDidChangeVisibility(() => {
				void webview.postMessage({ type: 'visibility', visible: view.visible });
			}),
			view.onDidDispose(() => {
				if (currentView === view) {
					currentView = undefined;
					syncTyping = false;
				}
			})
		);
	},
};

context.subscriptions.push(
	vscode.window.registerWebviewViewProvider('snowfall.scene', provider, {
		webviewOptions: { retainContextWhenHidden: true }
	}),
	vscode.commands.registerCommand('snowfall.open', () => {
		void vscode.commands.executeCommand('snowfall.scene.focus');
	}),
	vscode.workspace.onDidChangeTextDocument((event) => {
		if (!syncTyping || !currentView || !currentView.visible) return;
		if (event.document !== vscode.window.activeTextEditor?.document) return;
		if (event.contentChanges.length === 0) return;
		void currentView.webview.postMessage({ type: 'typing' });
	}),
	vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('snowfall') && currentView) {
			void currentView.webview.postMessage({ type: 'settings', ...settings() });
		}
	})
);
}

module.exports = { activate };
