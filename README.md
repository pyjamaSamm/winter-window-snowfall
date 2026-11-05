# Winter Window: Snowfall

**Watch snow fall while you let your agents do your work!**

Clear the gathered snow and watch it accumulate all over again. Bored watching? Control the snowfall with your typing, and if your typing speed takes over, you may spot an aurora!

Bonus for Christmas: Drop a decorated Christmas tree to add that festive winter joy.

## Features

- A custom **Snowfall** sidebar with drifting flakes and accumulating snow.
- Snow starts automatically. **Pause** freezes flakes in place; **Resume** starts it again.
- **Clear snow** clears the gathered ground snow without moving airborne flakes or stopping the scene.
- Optional **Sync with typing** makes snowfall follow your editing and brings out the northern lights during sustained typing.
- A decorated Christmas tree you can drop into the scene.
- The **Snowfall Midnight** color theme.

## Try it from source

1. Open this folder in VS Code.
2. Open **Run and Debug** and choose **Run Snowfall Extension**.
3. Start debugging. In the Extension Development Host window, select the Snowfall icon in the Activity Bar.

Snow starts automatically. You can turn on **Sync with typing** whenever the scene is active.

Run the project tests with:

```sh
npm test
```

## Install a VSIX

In VS Code, open the Extensions view, select **…**, choose **Install from VSIX…**, and select the packaged `.vsix` file.

## Settings

| Setting | Default | Description |
| --- | ---: | --- |
| `snowfall.density` | `90` | Number of snowflakes. |
| `snowfall.speed` | `1` | Snowfall speed multiplier. |

To use the theme, open **Preferences: Color Theme** and choose **Snowfall Midnight**.

## Requirements and license

Requires VS Code 1.85 or later. Distributed under the MIT License.
