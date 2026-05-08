# Lost in Space — Project Guide

This is the AI collaborator guide. Read this before making any changes.

## ⚠️ Branching & Merging Rules — MANDATORY

- AI agents MUST create feature or bugfix branches for all work.
- AI agents MUST only merge or target PRs into the `staging` branch.
- AI agents MUST **NEVER** merge into `master` unless the user explicitly instructs it.
- When creating a PR, always set the base branch to `staging`, not `master`.

## What Is This Game?

A 2D narrative game built with **Phaser 3.88** + **Tauri 2** for the **"Games That Matter"** hackathon. The game is a metaphor for loneliness vs community.

**Premise:** You're alone on a spaceship drifting through space. Every day you wake up, do chores, and go back to sleep. Every few days you land on a planet to gather resources. Life is gray, quiet, and repetitive — but easy. Eventually you find a companion, and then more. Life gains color and meaning, but also real challenge.

## Core Design Pillars

1. **Mechanics = message.** The resource system being trivially easy when alone and challenging with companions IS the point. Don't "fix" the easy solo phase — it's intentional.
2. **Aesthetic shift is the reward.** Solo = grayscale palette, low-mood music. Companions = color gradually returns, music brightens. This is implemented via camera post-FX grayscale.
3. **Keep scope tight.** This is a 3-week game jam. Prefer simple and polished over ambitious and broken.

## Game Loop

```
MainMenu → DayIntro → Ship → DayIntro → Ship → ... (every 2nd day: DayIntro discovers a planet)
```

- **MainMenu**: Title screen ("Lost in Space / A game about being alone"), click to begin. Initializes GameState.
- **DayIntro**: Shows "Day X" over procedural starfield with drifting ship silhouette. On discovery days (every 2nd day) announces a new planet was found. Always auto-advances to Ship after 3.5s.
- **Ship**: Corridor with doors to rooms (Kitchen, Greenhouse, Engine, Comms), a Nav console, and a Bed. Player moves with A/D or arrow keys, enters rooms with [E]. Must complete all 4 chores before going to bed. Bed advances the day and returns to DayIntro.
- **Kitchen**: Room scene. Press [E] to eat. Shows flavor text (lonely alone, warmer with companions). Marks chore done, returns to Ship.
- **Greenhouse**: Room scene. Press [E] to tend the plants. Plants are the canonical oxygen source on the ship. Marks chore done, returns to Ship.
- **Engine**: Room scene. Press [E] to run diagnostics. Flavor text. Marks chore done, returns to Ship.
- **Comms**: Room scene. Press [E] to listen. Static when alone, voices with companions. Marks chore done, returns to Ship.
- **Navigation**: Star map showing discovered planets. Click or press [1-9] to visit a planet. [ESC] to return to Ship. NOT a chore — optional.
- **Planet**: Explorable surface with persistent resource pickups. Player moves with A/D or arrows, walks near items to see description, [E] to collect, [L] to leave back to Ship. Items left behind persist for revisits.
- **CompanionEvent**: Triggered on day 5. DayIntro announces "Sensors detect a faint life sign...", routes to a special planet with a wrecked ship. Player finds a dog. Story text plays, dog follows you back. Adds companion, unlocks rubber ball on first planet.

## Planet System

Planets are **discovered** every 2nd day (announced in DayIntro) and added to a persistent list. Players choose when and whether to visit via the Navigation console on the Ship.

Key design decisions:
- **Discovery, not forced visits.** DayIntro announces new planets but always routes to Ship. Player decides when to go.
- **Persistence.** Each planet keeps its item list in GameState. Items you don't collect stay there for revisits.
- **Biomes.** Each planet has a random biome (rocky, lush, frozen, desert) that affects terrain colors.
- **Future: unique items.** Planets will eventually have special items (e.g., coffee maker) that gain meaning when companions hint at them. This creates a "go back for it" loop. (First item implemented: rubber ball for the dog.)

## Companion System

### Companion 1: Dog (Day 5)
Found shipwrecked on a planet.

**Trigger:** Day 5, DayIntro announces a faint life sign → `CompanionEvent` scene (wrecked ship, find dog) → dog joins ship.

**Effects:**
- Ship corridor: Dog sits near doors, proximity prompt hints at wanting a toy
- Kitchen and Comms have dog-specific flavor text
- **Dog auto-completes the Comms chore** each day — it "listens" for you (except on day 7, when it barks at a real signal and the player must check comms themselves)
- `rubber_ball` unique item on first planet unlocked — revisit to collect
- Once ball collected, corridor prompt: "The dog plays happily with its ball."
- Resources start depleting (companion count = 1)
- Grayscale shifts toward color (+0.3 saturation)

### Companion 2: Botanist (Day 7)
A human rescued via comms distress signal.

**Trigger:** Day 7, when doing Comms chore, you hear a distress signal instead of static → `RescueEvent` scene (escape pod, botanist joins) → companion count becomes 2.

**Effects:**
- Ship corridor: Botanist NPC standing near Collection room
- **Collection room unlocked** — new door on ship corridor for viewing exotic plants
- All exotic plants on all planets unlocked (voidbloom, sweetmoss, starspice)
- **Botanist auto-completes the Greenhouse chore** each day — she tends the plants herself
- Kitchen and Greenhouse have botanist-specific flavor text; Kitchen text changes further if Starspice is collected ("Food has flavor now. Actual flavor.")
- Resources deplete faster (companion count = 2)
- More color (+0.6 saturation total)

### Companion 3: Cavediver (5th planet)
A human cave explorer, Mira, found living inside a cave on the 5th discovered planet.

**Trigger:** Every planet has a cave entrance. Before meeting Mira, the cave prompt reads *"A dark cave. Wouldn't go in there."* The 5th discovered planet (`caveLit: true`) has a warm light flickering from its cave. Pressing [E] there launches `CavediverEvent` → Mira joins the crew.

**Effects:**
- Ship corridor: Cavediver NPC between the chore doors and Collection
- **All caves on all planets become enterable** — each cave is its own mini exploration scene (`Cave`)
- Cave resource items unlock; each grants +20 (vs. +10 on the surface), rebalancing resource drain for 3 companions
- One unique cave artifact per planet (pool: `coffee_maker`, `music_box`, `old_photograph`, `lantern`)
- **Mira auto-completes the Engine chore** each day — she handles diagnostics and patches
- Collected cave uniques appear in the ship: `coffee_maker` on the Kitchen counter; `music_box`, `old_photograph`, `lantern` in the corridor
- Kitchen flavor changes when `coffee_maker` is collected
- Resources deplete faster (companion count = 3)
- More color (+0.9 saturation total)

### Cave System
Every planet has a cave entrance drawn at `x ≈ 0.9` on the surface.

**Before cavediver joins:** prompt is *"A dark cave. Wouldn't go in there."* with no action. On the 5th planet only, the cave is lit and *"A warm light flickers from deep within... [E] Enter"* → `CavediverEvent`.

**After cavediver joins:** prompt becomes *"Cave [E] Enter"* → `Cave` scene. Cave mirrors Planet's loop: A/D or arrows to move, [E] to collect, [L] to return to the planet surface (Planet → Cave → Planet; does NOT go straight to Ship). Each cave holds 3-5 high-yield resource items (+20 each) plus one unique artifact. Uncollected items persist on revisit.

### Exotic Plant Collection
Three exotic plants found on planets (one per planet, locked until botanist joins):

| Plant | Color | Property |
|-------|-------|----------|
| Voidbloom | Dark purple | Beautiful but deadly sap |
| Sweetmoss | Green-blue | Fills the ship with a sweet fragrance |
| Starspice | Gold | Adds flavor to food (changes Kitchen text) |

Before botanist: dismissed as "not enough oxygen-to-maintenance ratio to keep around."
After botanist: unlocked for collection. Viewable in the Collection room with descriptions.

### GameState companion fields
- `companions: number` — count (affects resources/saturation)
- `companionList: CompanionData[]` — detailed data (id, name, type: 'dog'|'human'|'cavediver', foundDay)
- `dogHasToy: boolean` — whether the rubber ball has been collected
- `collectedExoticPlants: string[]` — uniqueIds of collected exotic plants
- `collectedCaveItems: string[]` — uniqueIds of collected cave artifacts
- `caveUnlocked: boolean` — true once cavediver joins; gates cave entry on all planets

## Tech Stack

- **Phaser 3.88.2** — Game framework
- **Tauri 2** — Desktop bundling (Rust backend)
- **TypeScript** — All game code
- **Vite** — Build tool with HMR
- **Arcade Physics** — Simple AABB collisions (no Matter.js needed)

## Project Structure

```
src/
├── main.ts                    # App entry, mounts Phaser game
├── game/
│   ├── main.ts                # Phaser.Game config (1024x768, arcade physics)
│   ├── scenes/
│   │   ├── Boot.ts            # Loads assets needed by Preloader
│   │   ├── Preloader.ts       # Loads all game assets, shows progress bar
│   │   ├── MainMenu.ts        # Title screen — initializes GameState on click
│   │   ├── DayIntro.ts        # "Day X" transition, starfield + drifting ship
│   │   ├── Ship.ts            # Ship corridor — doors to rooms, nav console, bed, chore HUD
│   │   ├── Kitchen.ts         # Kitchen room — eat chore
│   │   ├── Greenhouse.ts     # Greenhouse room — tend plants chore (oxygen source)
│   │   ├── Engine.ts          # Engine room — diagnostics chore
│   │   ├── Comms.ts           # Comms room — listen chore
│   │   ├── Navigation.ts     # Star map — select discovered planets to visit
│   │   ├── Planet.ts          # Planet surface — loads items from saved planet data
│   │   ├── CompanionEvent.ts   # Day 5 — find the dog on a wrecked ship
│   │   ├── RescueEvent.ts     # Day 7 — rescue botanist via comms distress signal
│   │   ├── CavediverEvent.ts  # 5th planet — meet Mira in the lit cave
│   │   ├── Cave.ts            # Cave interior — high-yield resources + unique artifacts
│   │   ├── Collection.ts      # Exotic plant collection room (after botanist joins)
│   │   ├── DevPanel.ts        # Dev tool overlay — toggle with M key
│   │   └── GameOver.ts        # End screen (template, not yet integrated)
│   ├── objects/               # Custom game object classes [EMPTY — TO BUILD]
│   └── systems/
│       └── GameState.ts       # Global state manager (day, resources, companions, chores, planets)
public/
├── assets/
│   ├── bg.png                 # Template background (used by Boot/Preloader)
│   ├── logo.png               # Template logo (used by Preloader)
│   └── spacebg.jpg            # Space background image (unused currently)
src-tauri/                     # Rust/Tauri backend (mostly untouched)
```

## Key Files Explained

### `systems/GameState.ts`
Static helper class for reading/writing global state via Phaser's Registry. Key methods:
- `GameState.init(scene)` — Resets state to defaults (called from MainMenu)
- `GameState.get(scene)` — Returns current state
- `GameState.update(scene, partial)` — Merges partial updates
- `GameState.advanceDay(scene)` — Increments day, consumes resources, resets chores
- `GameState.consumeResources(scene)` — Depletes resources based on companion count (0 companions = 0 consumption)
- `GameState.isPlanetDiscoveryDay(scene)` — True every 2nd day (even-numbered days)
- `GameState.getSaturation(scene)` — Returns 0-1 based on companion count (0.3 per companion)
- `GameState.completeChore(scene, choreKey)` — Marks a chore as done for the day
- `GameState.applyCompanionChores(scene)` — Auto-completes chores handled by companions (Greenhouse: botanist, Engine: Mira, Comms: dog except on rescue day). Called at the end of `advanceDay`.
- `GameState.allChoresDone(scene)` — Returns true if all 4 chores are complete
- `GameState.discoverPlanet(scene)` — Generates and adds a new planet with random name, biome, and items
- `GameState.getPlanet(scene, planetId)` — Returns a specific planet's data
- `GameState.collectPlanetItem(scene, planetId, itemIndex)` — Marks an item as collected
- `GameState.hasUncollectedItems(planet)` — Checks if a planet has items left to collect
- `GameState.isCompanionEventDay(scene)` — True on day 5 if no companions yet
- `GameState.addCompanion(scene, companion)` — Adds a companion, increments count
- `GameState.hasCompanion(scene, id)` — Checks if a specific companion exists
- `GameState.isRescueEventReady(scene)` — True on day 7 when the dog is aboard and no human has joined yet
- `GameState.isCavediverEventPlanet(scene, planetId)` — True if this planet is the lit one and cavediver hasn't joined yet
- `GameState.unlockExoticPlants(scene)` — Unlocks all exotic plants on all planets
- `GameState.collectExoticPlant(scene, uniqueId)` — Marks an exotic plant as collected
- `GameState.unlockPlanetItem(scene, uniqueId)` — Unlocks a locked item across all planets
- `GameState.addCavediverCompanion(scene)` — Adds Mira and calls `unlockCaves`
- `GameState.unlockCaves(scene)` — Sets `caveUnlocked` and unlocks every cave item across all planets
- `GameState.collectCaveItem(scene, planetId, itemIndex)` — Marks a cave item as collected (separate array from surface `items`)
- `GameState.recordCaveUniqueCollected(scene, uniqueId)` — Tracks unique artifacts for Kitchen/Comms flavor branches
- `GameState.hasUncollectedCaveItems(planet)` — Checks if a cave has items left
- `GameState.isCaveUniqueId(uniqueId)` — True for `coffee_maker`, `music_box`, `old_photograph`, `lantern`

### Game State Schema
```typescript
{
    currentDay: number,         // Starts at 1, increments on sleep
    companions: number,         // 0 = solo, 1+ = companion phase
    companionList: CompanionData[], // { id, name, type, foundDay }
    dogHasToy: boolean,         // Has the rubber ball been collected?
    resources: {
        oxygen: number,         // 0-100
        food: number,           // 0-100
        fuel: number,           // 0-100
        parts: number           // 0-100
    },
    colorSaturation: number,    // 0.0 (gray) to 1.0 (full color)
    chores: {
        kitchen: boolean,       // Ate today
        greenhouse: boolean,    // Tended plants today
        engine: boolean,        // Checked engine today
        comms: boolean          // Listened to comms today
    },
    planets: [                  // Persistent list of discovered planets
        {
            id: string,         // e.g. "planet_1"
            name: string,       // e.g. "Kara-7"
            biome: string,      // "rocky" | "lush" | "frozen" | "desert"
            discoveredDay: number,
            items: [
                { type: ResourceType | 'unique', uniqueId?: string, x: number, collected: boolean, locked?: boolean }
            ],
            caveItems: [        // Same shape as items; locked until cavediver joins. Resources grant +20.
                { type: ResourceType | 'unique', uniqueId?: string, x: number, collected: boolean, locked?: boolean }
            ],
            caveLit: boolean    // True on the 5th discovered planet only — triggers CavediverEvent
        }
    ],
    collectedCaveItems: string[], // coffee_maker, music_box, old_photograph, lantern
    caveUnlocked: boolean         // true after meeting Mira
}
```

### Resource Consumption (per day, per companion)
- Oxygen: -5
- Food: -5
- Fuel: -2.5
- Parts: -1.25

### Chore System
Players must complete all 4 chores each day before the Bed becomes usable:
1. **Kitchen** — Enter room, press [E] to eat
2. **Greenhouse** — Enter room, press [E] to tend the plants (oxygen source)
3. **Engine** — Enter room, press [E] to run diagnostics
4. **Comms** — Enter room, press [E] to listen

Each room shows different flavor text depending on companion count (solo = bleak, companions = warmer). Chores reset when `advanceDay()` is called. Ship corridor shows a checklist HUD and doors show a checkmark when that chore is done.

**Companions take over their chores:** Once the botanist joins, Greenhouse is done for you each day — starting the day she arrives. Once Mira joins, Engine is done for you. The dog "listens" for you on Comms from day 5 onwards — except on day 7, when a real signal comes through and you must check Comms yourself. Auto-completion runs via `applyCompanionChores`, called both at the end of `advanceDay` and whenever a new companion is added.

### Ship Corridor Layout
| Element | Position | Leads to | Type |
|---------|----------|----------|------|
| Kitchen | 12% width | Kitchen scene | Chore door |
| Greenhouse | 30% width | Greenhouse scene | Chore door |
| Engine | 48% width | Engine scene | Chore door |
| Comms | 62% width | Comms scene | Chore door |
| Nav console | 78% width | Navigation scene | Optional |
| Bed | 92% width | (direct) Ends day | Requires all chores done |

### Planet Pickups
- 3-6 random resource pickups per planet (generated on discovery)
- Types: Air Crystal (O2), Space Fruit (food), Fuel Cell (fuel), Scrap Metal (parts)
- Each pickup grants +10 to its resource
- **Interaction-based collection:** Walk near an item → see its name, description, and resource effect → press [E] to collect
- Uncollected items persist — revisit to pick them up later
- **Locked items**: Unique items like dog toys, exotic plants (botanist), cave artifacts (cavediver). Player sees them but can't pick up — description explains why ("Beautiful, but pointless"). Companions unlock these items. Item info is defined in `ITEM_INFO` in `Planet.ts` and `Cave.ts`.

### Cave Pickups
- 3-5 cave resource items per planet (generated on discovery, stored in `caveItems`)
- Each grants +20 — compensates for the 3-companion drain rate
- One unique artifact per planet from the pool: `coffee_maker`, `music_box`, `old_photograph`, `lantern`
- All cave items start `locked: true`. `GameState.unlockCaves()` clears the flag once Mira joins.
- Cave-specific `ITEM_INFO` lives in `Cave.ts` — uses different names (Oxygen Geode, Cave Fungus, Ore Vein, Mineral Slab).

## Controls

| Key | Context | Action |
|-----|---------|--------|
| A/D or Left/Right arrows | Ship, Planet | Move player |
| E | Ship corridor | Enter room door / use nav console |
| E | Room scenes | Do the chore |
| E | Planet | Collect nearby item, or enter cave |
| E | Cave | Collect nearby cave item |
| 1-9 | Navigation | Visit planet by number |
| ESC | Navigation | Return to Ship |
| L | Planet | Leave planet (return to Ship) |
| L | Cave | Leave cave (return to Planet surface) |
| M | Any scene | Toggle dev panel overlay |
| C | Dev panel | Add cavediver companion |
| V | Dev panel | Fast-forward to 5 discovered planets (cavediver-ready) |
| Click | MainMenu | Start game |
| Click | Navigation | Select planet to visit |

## Visual Approach

Currently using **Phaser Graphics API** for all visuals (no sprite assets):
- Player: gray rectangle (20x50)
- Ship corridor: drawn interior with doors, portholes, ceiling lights, nav console
- Room scenes: drawn interiors with furniture/equipment (table, engine block, console)
- Navigation: star map with colored planet circles, connection lines, ship indicator
- Planet: procedural terrain with biome-colored ground, hills, mountains, circle pickups
- Starfield: randomly placed small circles
- All scenes apply grayscale post-FX based on companion count

This is designed for easy art swapping — replace `this.add.rectangle()` / `this.add.graphics()` calls with `this.add.sprite()` when real art is ready.

## Phaser Patterns Used

### Scene transitions
```typescript
this.scene.start('SceneName');                    // switch scene
this.scene.start('SceneName', { score: 100 });    // pass data
```

### Global state across scenes
```typescript
GameState.get(this)                               // read state
GameState.update(this, { companions: 1 })         // write state
GameState.completeChore(this, 'kitchen')          // mark chore done
GameState.allChoresDone(this)                     // check all chores
GameState.discoverPlanet(this)                    // add new planet
GameState.collectPlanetItem(this, id, index)      // collect an item
```

### Input
```typescript
this.cursors = this.input.keyboard!.createCursorKeys();
this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
if (this.cursors.left.isDown) body.setVelocityX(-200);
if (Phaser.Input.Keyboard.JustDown(this.interactKey)) { /* one-shot */ }
```

### Grayscale effect (camera post-FX)
```typescript
// Full grayscale (solo phase)
this.cameras.main.postFX.addColorMatrix().grayscale(1);
// Partial (companion phase): grayscale(1) = full gray, grayscale(0) = full color
const saturation = GameState.getSaturation(this); // 0 = solo, 1 = full color
this.cameras.main.postFX.addColorMatrix().grayscale(1 - saturation);
// NOTE: Do NOT use saturate(-100) — it causes color inversion, not grayscale
```

### Tween for messages / transitions
```typescript
this.tweens.add({
    targets: textObject,
    alpha: 1, duration: 500, yoyo: true, hold: 1500,
    onComplete: () => textObject.destroy(),
});
```

## Commands

| Command | Use |
|---------|-----|
| `npm install` | Install dependencies |
| `npm run dev` | Dev mode with Tauri (desktop window) |
| `npm run vite-dev` | Dev mode in browser only (faster iteration) |
| `npm run build` | Production build |

## Conventions

- One scene per file, class name matches file name
- Scene keys are PascalCase strings matching the class name
- Assets go in `public/assets/` organized by type
- All game code is TypeScript (strict mode)
- Keep scenes focused — extract reusable logic into `objects/` or `systems/`
- Commit working states frequently — other collaborators may pull at any time
- Use `GameState` helper for all state reads/writes — never access Registry directly

## What's Next (Implementation Roadmap)

### Phase 1 — Core Loop (Week 1) ✅ DONE
- [x] Create `GameState` system (day tracking, resources, companions, chores, planets via Registry)
- [x] Create `DayIntro` scene (day counter over starfield, ship drift, planet discovery announcements)
- [x] Create `Ship` scene (corridor with doors to rooms, nav console, bed = end day)
- [x] Create room scenes: Kitchen, Greenhouse, Engine, Comms (each with chore interaction)
- [x] Chore tracking system (must complete all 4 chores before sleeping)
- [x] Create `Planet` scene (surface exploration, interaction-based pickups with descriptions)
- [x] Wire up day cycle: MainMenu → DayIntro → Ship → DayIntro (loop)
- [x] Apply grayscale camera post-FX to all gameplay scenes (using `grayscale()`)
- [x] Resource HUD + chore checklist on Ship scene
- [x] Planet discovery system (planets discovered every 2nd day, added to persistent list)
- [x] Navigation scene (star map with ship centered, planets spread around, click or 1-9 to visit)
- [x] Persistent planet items (uncollected items remain for revisits)
- [x] Biome-based planet terrain colors (rocky, lush, frozen, desert)
- [x] Dev panel overlay (toggle with M key — skip days, complete chores, add companions, etc.)
- [x] Item interaction system (walk near → see description → E to collect, locked items for future)

### Phase 2 — Companion & Resources (Week 2) ✅ DONE
- [x] CompanionEvent scene — find dog on wrecked ship on day 5
- [x] DayIntro triggers companion event ("Sensors detect a faint life sign...")
- [x] Dog companion in GameState (companionList, companion count)
- [x] Dog on Ship corridor with proximity prompts and toy hint
- [x] Rubber ball unique item on first planet (locked → unlocked after finding dog)
- [x] RescueEvent scene — rescue botanist via comms distress signal on day 7
- [x] Comms chore triggers rescue when ready (distress signal replaces static)
- [x] Botanist companion unlocks exotic plants on all planets
- [x] Exotic plants on planets (Voidbloom, Sweetmoss, Starspice) — locked until botanist
- [x] Collection room scene — view collected exotic plants with descriptions
- [x] Collection room door appears on Ship after botanist joins
- [x] Human companion NPC on Ship corridor
- [x] All chore rooms have companion-aware flavor text (solo → dog → dog+human → with starspice)
- [x] Resource consumption activates with companions
- [x] Grayscale shifts toward color with companions
- [ ] Test and balance resource consumption rates
- [ ] Resource depletion consequences (what happens at 0?)

### Phase 2b — Cavediver & Caves ✅ DONE
- [x] CavediverEvent scene — meet Mira in the lit cave on 5th planet
- [x] Cave scene — per-planet cave exploration mirroring Planet's loop (E to collect, L to leave)
- [x] Cave entrances drawn on every planet, with three prompt states (locked / lit / enter)
- [x] `caveItems` and `caveLit` fields on PlanetData, generated at discovery
- [x] Cave resource items grant +20 to rebalance 3-companion drain
- [x] Unique cave artifacts pool: coffee_maker, music_box, old_photograph, lantern
- [x] Cavediver NPC on Ship corridor and in chore rooms
- [x] Kitchen flavor branch when coffee_maker collected; Comms when music_box collected
- [x] Chore rooms gain cavediver-aware flavor tiers
- [x] Dev panel shortcuts: [C] add cavediver, [V] fast-forward to 6 planets

### Phase 3 — Polish (Week 3)
- [ ] Music system (melancholy track for solo, warmer track for companion phase)
- [ ] Sound effects (footsteps, interactions, ambient ship sounds)
- [ ] Replace placeholder graphics with real art/sprites
- [ ] Visual polish (parallax starfield, ship animations, lighting)
- [ ] Game ending / win condition
- [ ] Playtesting and balance
