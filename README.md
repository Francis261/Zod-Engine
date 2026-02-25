# Zod Engine (Phaser 3)

Zod Engine is a modular Phaser 3 GUI-driven starter engine that includes:

- Boot + Preloader scenes
- Main Menu (Start, Options, Credits)
- Playable Game scene
- HUD (score + health bar)
- Pause Menu
- Reusable UI manager + button system

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Folder structure

```text
public/assets/      # Static art assets
src/config/         # Phaser game configuration
src/core/           # Scene keys, event bus, global game state
src/scenes/         # Scene modules
src/styles/         # Shared text styles
src/ui/             # Reusable GUI components
```

## Enterprise-grade extension points

- **EventBus + GameState** for decoupled scene communication.
- **UIManager** for consistent GUI creation patterns.
- **Scene isolation** supports independent team ownership and easier testing.
- **Asset pipeline ready** with Vite + ES modules for modern CI/CD workflows.

## Controls

- Arrow keys: move player
- ESC: pause/resume
- Collect green pickups for score
