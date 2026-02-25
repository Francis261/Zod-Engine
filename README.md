# Zod Engine (Phaser 3)

Zod Engine is a modular Phaser 3 GUI-focused starter engine designed to scale from prototypes to larger team workflows.

## Included systems

- Boot + Preloader scenes
- Main Menu (Start, **Builder Mode**, Options, Credits)
- Playable Game scene (collectibles, score, health)
- HUD scene (reactive score + health bar)
- Pause Menu scene
- Builder scene (in-game GUI element placement sandbox)
- Reusable UI manager + button system
- Persistent settings service (localStorage)

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Folder structure

```text
public/assets/      # Static art assets
src/config/         # Phaser game configuration
src/core/           # Scene keys, event bus, global game state
src/scenes/         # Scene modules
src/services/       # Settings + persistence services
src/styles/         # Shared text styles
src/ui/             # Reusable GUI components
```

## Enterprise-grade extension points

- **EventBus + GameState** for decoupled scene communication.
- **SettingsService** for persisted engine-level preferences.
- **UIManager** for consistent GUI creation patterns.
- **Scene isolation** supports independent team ownership and easier testing.
- **Builder Mode** acts as a foundation for future JSON layout export/import workflows.
- **Vite + ES modules** for fast local development and CI/CD readiness.

## Controls

- Arrow keys: move player
- ESC: pause/resume
- Collect green pickups for score
