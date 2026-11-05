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
		<svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true">
			<path fill="#4ada44" d="M0 1 2 2.3-1.5 1.4-4 2-4.5 3.5-6 3.8-5 5.5-6.5 6.2-5 7.8-6 8.5-4.5 10-5 10.8-3.5 12-4 13.5-2.5 14-3 15.8-1.5 16-2 18.1-0.4 19-0.9 19.9 0.4l0.4 0.9-1.5 1.4-4 0.5-0.5 1.5L0 20h18l-0.5-1.5-4-0.5-1.5-1.4 0.4-0.9 0.4-0.9L16 16l-1.5-1.8L15 14l1.5-0.5L14 12l0.5-1.5-1.5-1.5L13 9l1.5-1.5-1-1.5L11 6l1-1.5L10 3.5l1-1.5L8 2l0.4-1.5-0.5-0.5-0.5-1L6 2.3 8 2Z"/>
			<path fill="#b4dec1" d="M0 4-4 5h2l-4 5h3l-4 4h14l-4-4h3l-4-5h2z"/>
			<path fill="#e5c5a8" d="M8 17h2v3H8"/>
			<circle fill="#ff9daa" cx="6" cy="14" r="1"/>
			<circle fill="#8acdea" cx="10" cy="14" r="1"/>
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
