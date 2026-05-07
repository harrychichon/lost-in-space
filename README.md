# Lost in Space

A 2D narrative game about loneliness and community, built for the **"Games That Matter"** hackathon.

## The Concept

You're alone on a spaceship drifting through space. Every day you wake up, do mundane chores, and go back to sleep. Life is gray, quiet, and repetitive — but easy. Eventually you find companions, and life gains color and meaning, but also real challenge.

The game mechanics mirror the message: resources never deplete when you're alone (isolation is "easy"), but become a real management challenge once you have people to care for.

## Tech Stack

- [Phaser 3.88](https://github.com/phaserjs/phaser) — Game framework
- [Tauri 2](https://tauri.app/) — Desktop bundling
- [TypeScript 5.7](https://github.com/microsoft/TypeScript)
- [Vite 6](https://vitejs.dev/) — Build tool

## Getting Started

### Requirements

- [Node.js](https://nodejs.org) (for npm)
- [Rust](https://www.rust-lang.org/) (for Tauri — install via [rustup](https://rustup.rs/))

### Setup

```bash
npm install
```

### Development

```bash
# Run in desktop window (Tauri)
npm run dev

# Run in browser only (faster iteration, no Rust needed)
npm run vite-dev
```

### Build

```bash
npm run build
```

Production output goes to `src-tauri/target/release/bundle`.

## Project Structure

```
src/game/
├── main.ts          # Game config, initialization, dev panel toggle
├── scenes/          # One scene per file (11 scenes)
├── objects/         # Custom game object classes [TO BUILD]
└── systems/
    └── GameState.ts # Global state (day, resources, companions, chores, planets)

public/assets/       # Sprites, audio, tilemaps, UI
src-tauri/           # Rust/Tauri backend
```

## For AI Collaborators

Read `CLAUDE.md` for the full project guide — game design, architecture, conventions, and implementation roadmap.

## For Human Collaborators

Check `CLAUDE.md` for the current implementation status and roadmap. The "What's Next" section at the bottom tracks what needs to be built.
