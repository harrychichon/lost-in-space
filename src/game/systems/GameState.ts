export interface Resources {
    oxygen: number;
    food: number;
    fuel: number;
    parts: number;
}

export interface Chores {
    kitchen: boolean;
    greenhouse: boolean;
    engine: boolean;
    comms: boolean;
}

export type ResourceType = keyof Resources;

export interface PlanetItem {
    type: ResourceType | "unique";
    uniqueId?: string; // for unique items (e.g., 'rubber_ball')
    x: number; // relative position 0-1 across planet width
    collected: boolean;
    locked?: boolean; // true = can't pick up yet (needs companion unlock)
}

export interface CompanionData {
    id: string;
    name: string;
    type: "dog" | "human" | "cavediver";
    foundDay: number;
}

export interface PlanetData {
    id: string;
    name: string;
    biome: "lush" | "frozen" | "desert";
    discoveredDay: number;
    items: PlanetItem[];
    caveItems: PlanetItem[];
    caveLit: boolean;
    mountainCave: boolean;
}

export interface GameStateData {
    currentDay: number;
    companions: number;
    companionList: CompanionData[];
    resources: Resources;
    colorSaturation: number;
    chores: Chores;
    planets: PlanetData[];
    collectedDogToys: string[]; // uniqueIds of collected dog toys
    collectedExoticPlants: string[]; // uniqueIds of collected exotic plants
    collectedCaveItems: string[]; // uniqueIds of collected cave items
    collectedOxygenPlants: string[]; // uniqueIds of oxygen-producing plants brought aboard
    caveUnlocked: boolean; // true once cavediver joins
    wellbeingOverride: number | null; // null = auto-calculate, 0-1 = DevPanel override
    warmthOverride: number | null;    // null = auto-calculate, 0-1 = DevPanel override
}

const EXOTIC_PLANT_IDS = ["voidbloom", "sweetmoss", "starspice"];
const DOG_TOY_IDS = [
    "rubber_ball",
    "squeaky_bone",
    "chew_rope",
    "cozy_blanket",
];
const CAVE_UNIQUE_IDS = [
    "coffee_maker",
    "music_box",
    "old_photograph",
    "lantern",
];
const CAVEDIVER_PLANET_INDEX = 4; // 5th discovered planet (0-indexed)

const PLANET_NAMES = [
    "Kara-7",
    "Velun",
    "Drith-IV",
    "Ozmara",
    "Pellis",
    "Yennox",
    "Sivra-2",
    "Moth",
    "Quorin",
    "Elth",
    "Bracken",
    "Umber-IX",
    "Holloway",
    "Cinder",
    "Nimith",
];

const BIOMES: PlanetData["biome"][] = ["lush", "frozen", "desert"];

const DEFAULT_STATE: GameStateData = {
    currentDay: 1,
    companions: 0,
    companionList: [],
    resources: {
        oxygen: 100,
        food: 100,
        fuel: 100,
        parts: 100,
    },
    colorSaturation: 0,
    chores: { kitchen: false, greenhouse: false, engine: false, comms: false },
    planets: [],
    collectedDogToys: [],
    collectedExoticPlants: [],
    collectedCaveItems: [],
    collectedOxygenPlants: [],
    caveUnlocked: false,
    wellbeingOverride: null,
    warmthOverride: null,
};

const REGISTRY_KEY = "gameState";

/**
 * Distribute items along the x-axis using slot-based spacing.
 * Divides [minX, maxX] into N equal slots; each item lands inside its own
 * slot with 20% padding, guaranteeing minimum spacing.
 *
 * Category-aware: unique items (rubber ball, exotic plants, etc.) are placed
 * on evenly-spaced slot indexes so they're never all clustered in one half by
 * chance. Resources fill the gaps in shuffled order. Which specific unique
 * lands at which spread-index is still randomised.
 */
function distributeInSlots(items: PlanetItem[], minX: number, maxX: number): void {
    if (items.length === 0) return;

    const shuffle = <T>(arr: T[]) => {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    };

    const resources = items.filter((i) => i.type !== 'unique');
    const uniques   = items.filter((i) => i.type === 'unique');
    shuffle(resources);
    shuffle(uniques);

    const N = items.length;
    const slotted: PlanetItem[] = new Array(N);
    for (let k = 0; k < uniques.length; k++) {
        const slotIdx = Math.floor(((k + 0.5) * N) / uniques.length);
        slotted[slotIdx] = uniques[k];
    }
    let r = 0;
    for (let i = 0; i < N; i++) {
        if (!slotted[i]) slotted[i] = resources[r++];
    }
    for (let i = 0; i < N; i++) items[i] = slotted[i];

    const slotSize = (maxX - minX) / N;
    const padding = 0.2;
    items.forEach((item, i) => {
        const slotStart = minX + i * slotSize + slotSize * padding;
        const slotEnd = minX + (i + 1) * slotSize - slotSize * padding;
        item.x = slotStart + Math.random() * (slotEnd - slotStart);
    });
}

/**
 * Static helper to read/write game state via Phaser's Registry.
 * Usage from any scene: GameState.get(this) / GameState.update(this, { ... })
 */
export class GameState {
    static init(scene: Phaser.Scene): void {
        scene.registry.set(REGISTRY_KEY, {
            ...DEFAULT_STATE,
            resources: { ...DEFAULT_STATE.resources },
            chores: { ...DEFAULT_STATE.chores },
            companionList: [],
            planets: [],
            collectedDogToys: [],
            collectedExoticPlants: [],
            collectedCaveItems: [],
            collectedOxygenPlants: [],
            caveUnlocked: false,
            wellbeingOverride: null,
            warmthOverride: null,
        });
    }

    static get(scene: Phaser.Scene): GameStateData {
        return scene.registry.get(REGISTRY_KEY) as GameStateData;
    }

    static update(scene: Phaser.Scene, partial: Partial<GameStateData>): void {
        const current = GameState.get(scene);
        const updated = { ...current, ...partial };
        if (partial.resources) {
            updated.resources = { ...current.resources, ...partial.resources };
        }
        if (partial.chores) {
            updated.chores = { ...current.chores, ...partial.chores };
        }
        scene.registry.set(REGISTRY_KEY, updated);
    }

    static advanceDay(scene: Phaser.Scene): void {
        const state = GameState.get(scene);
        GameState.consumeResources(scene);
        GameState.update(scene, {
            currentDay: state.currentDay + 1,
            chores: {
                kitchen: false,
                greenhouse: false,
                engine: false,
                comms: false,
            },
        });
        GameState.applyCompanionChores(scene);
    }

    // Companions auto-complete their assigned chore. Runs at the start of each
    // day (via advanceDay) and again whenever a new companion joins, so arrival
    // day is covered too. Comms is skipped on rescue day (day 7) so the dog's
    // bark leads the player to the distress signal themselves.
    static applyCompanionChores(scene: Phaser.Scene): void {
        const auto: Partial<Chores> = {};
        if (GameState.hasCompanion(scene, "human")) auto.greenhouse = true;
        if (GameState.hasCompanion(scene, "cavediver")) auto.engine = true;
        if (
            GameState.hasCompanion(scene, "dog") &&
            !GameState.isRescueEventReady(scene)
        ) {
            auto.comms = true;
        }
        if (Object.keys(auto).length === 0) return;
        const current = GameState.get(scene);
        GameState.update(scene, {
            chores: { ...current.chores, ...auto },
        });
    }

    static completeChore(scene: Phaser.Scene, chore: keyof Chores): void {
        const current = GameState.get(scene);
        GameState.update(scene, {
            chores: { ...current.chores, [chore]: true },
        });
    }

    static allChoresDone(scene: Phaser.Scene): boolean {
        const { chores } = GameState.get(scene);
        return (
            chores.kitchen && chores.greenhouse && chores.engine && chores.comms
        );
    }

    static consumeResources(scene: Phaser.Scene): void {
        const state = GameState.get(scene);
        if (state.companions === 0) return;

        const rate = state.companions * 5;
        const r = state.resources;
        GameState.update(scene, {
            resources: {
                oxygen: Math.max(0, r.oxygen - rate),
                food: Math.max(0, r.food - rate),
                fuel: Math.max(0, r.fuel - rate * 0.5),
                parts: Math.max(0, r.parts - rate * 0.25),
            },
        });
    }

    static isPlanetDiscoveryDay(scene: Phaser.Scene): boolean {
        const state = GameState.get(scene);
        return state.currentDay % 2 === 0;
    }

    static isCompanionEventDay(scene: Phaser.Scene): boolean {
        const state = GameState.get(scene);
        return state.currentDay === 5;
    }

    static isEndingDay(scene: Phaser.Scene): boolean {
        const state = GameState.get(scene);
        if (state.companions < 1) return false;
        const lastFoundDay = Math.max(...state.companionList.map((c) => c.foundDay));
        return state.currentDay >= lastFoundDay + 2;
    }

    static isRescueEventReady(scene: Phaser.Scene): boolean {
        const state = GameState.get(scene);
        return (
            state.currentDay === 7 &&
            GameState.hasCompanion(scene, "dog") &&
            !GameState.hasCompanion(scene, "human")
        );
    }

    static isCavediverEventPlanet(
        scene: Phaser.Scene,
        planetId: string,
    ): boolean {
        if (GameState.hasCompanion(scene, "cavediver")) return false;
        const planet = GameState.getPlanet(scene, planetId);
        return !!planet && planet.caveLit;
    }

    // Returns 0-1: 1 = full resources + all chores done, 0 = depleted + nothing done.
    // Resources carry 75% weight (long-run threat); chores 25% (daily signal).
    static getSecondaryScale(scene: Phaser.Scene): number {
        const state = GameState.get(scene);
        const r = state.resources;
        const resourceScore = (r.oxygen + r.food + r.fuel + r.parts) / 4 / 100;
        const choresCompleted = Object.values(state.chores).filter(Boolean).length;
        const choreScore = choresCompleted / 4;
        return resourceScore * 0.75 + choreScore * 0.25;
    }

    // Returns the wellbeing value used for audio and warmth fine-tuning.
    // Respects DevPanel override when set; otherwise auto-calculates from resources/chores.
    static getWellbeing(scene: Phaser.Scene): number {
        const state = GameState.get(scene);
        return state.wellbeingOverride !== null ? state.wellbeingOverride : GameState.getSecondaryScale(scene);
    }

    // Base warmth from companion tier, nudged ±0.15 by wellbeing.
    // Respects DevPanel warmthOverride when set.
    static getSaturation(scene: Phaser.Scene): number {
        const state = GameState.get(scene);
        if (state.warmthOverride !== null) return state.warmthOverride;
        const base = Math.min(1, state.companions * 0.3);
        const wellbeing = GameState.getWellbeing(scene);
        const nudge = (wellbeing - 0.5) * 0.3;
        return Math.max(0, Math.min(1, base + nudge));
    }

    // Apply grayscale by setting a CSS filter on the canvas element.
    // Works in both WebGL and Canvas renderer modes.
    static applyGrayscale(scene: Phaser.Scene): void {
        const warmth = GameState.getSaturation(scene);
        scene.game.canvas.style.filter = `grayscale(${((1 - warmth) * 100).toFixed(1)}%)`;
        console.log(`[warmth] ${scene.scene.key} companions=${GameState.get(scene).companions} warmth=${warmth.toFixed(3)}`);
    }

    // --- Companion methods ---

    static addCompanion(scene: Phaser.Scene, companion: CompanionData): void {
        const state = GameState.get(scene);
        GameState.update(scene, {
            companions: state.companions + 1,
            companionList: [...state.companionList, companion],
        });
        GameState.applyCompanionChores(scene);
    }

    static hasCompanion(scene: Phaser.Scene, id: string): boolean {
        const state = GameState.get(scene);
        return state.companionList.some((c) => c.id === id);
    }

    static unlockDogToys(scene: Phaser.Scene): void {
        for (const id of DOG_TOY_IDS) {
            GameState.unlockPlanetItem(scene, id);
        }
    }

    static collectDogToy(scene: Phaser.Scene, uniqueId: string): void {
        const state = GameState.get(scene);
        if (!state.collectedDogToys.includes(uniqueId)) {
            GameState.update(scene, {
                collectedDogToys: [...state.collectedDogToys, uniqueId],
            });
        }
    }

    static unlockExoticPlants(scene: Phaser.Scene): void {
        for (const id of EXOTIC_PLANT_IDS) {
            GameState.unlockPlanetItem(scene, id);
        }
    }

    static unlockCaves(scene: Phaser.Scene): void {
        GameState.update(scene, { caveUnlocked: true });
        GameState.unlockAllCaveItems(scene);
    }

    static addCavediverCompanion(scene: Phaser.Scene): void {
        const state = GameState.get(scene);
        GameState.addCompanion(scene, {
            id: "cavediver",
            name: "Mira",
            type: "cavediver",
            foundDay: state.currentDay,
        });
        GameState.unlockCaves(scene);
    }

    static collectCaveItem(
        scene: Phaser.Scene,
        planetId: string,
        itemIndex: number,
    ): void {
        const state = GameState.get(scene);
        const planets = state.planets.map((p) => {
            if (p.id !== planetId) return p;
            const caveItems = p.caveItems.map((item, i) => {
                if (i !== itemIndex) return item;
                return { ...item, collected: true };
            });
            return { ...p, caveItems };
        });
        GameState.update(scene, { planets });
    }

    static recordCaveUniqueCollected(
        scene: Phaser.Scene,
        uniqueId: string,
    ): void {
        const state = GameState.get(scene);
        if (!state.collectedCaveItems.includes(uniqueId)) {
            GameState.update(scene, {
                collectedCaveItems: [...state.collectedCaveItems, uniqueId],
            });
        }
    }

    static hasUncollectedCaveItems(planet: PlanetData): boolean {
        return planet.caveItems.some((item) => !item.collected);
    }

    static isCaveUniqueId(uniqueId: string): boolean {
        return CAVE_UNIQUE_IDS.includes(uniqueId);
    }

    static collectExoticPlant(scene: Phaser.Scene, uniqueId: string): void {
        const state = GameState.get(scene);
        if (!state.collectedExoticPlants.includes(uniqueId)) {
            GameState.update(scene, {
                collectedExoticPlants: [
                    ...state.collectedExoticPlants,
                    uniqueId,
                ],
            });
        }
    }

    static collectOxygenPlant(scene: Phaser.Scene, uniqueId: string): void {
        const state = GameState.get(scene);
        if (!state.collectedOxygenPlants.includes(uniqueId)) {
            GameState.update(scene, {
                collectedOxygenPlants: [...state.collectedOxygenPlants, uniqueId],
            });
        }
    }

    static unlockPlanetItem(scene: Phaser.Scene, uniqueId: string): void {
        const state = GameState.get(scene);
        const planets = state.planets.map((p) => ({
            ...p,
            items: p.items.map((item) =>
                item.uniqueId === uniqueId ? { ...item, locked: false } : item,
            ),
        }));
        GameState.update(scene, { planets });
    }

    // --- Planet methods ---

    static discoverPlanet(scene: Phaser.Scene): PlanetData {
        const state = GameState.get(scene);
        const isFirstPlanet = state.planets.length === 0;

        const usedNames = new Set(state.planets.map((p) => p.name));
        const availableNames = PLANET_NAMES.filter((n) => !usedNames.has(n));
        const name =
            availableNames.length > 0
                ? availableNames[
                      Math.floor(Math.random() * availableNames.length)
                  ]
                : `Planet-${state.planets.length + 1}`;

        const biome = BIOMES[Math.floor(Math.random() * BIOMES.length)];

        // Generate 3-6 resource items at random positions
        const resourceTypes: ResourceType[] = [
            "oxygen",
            "food",
            "fuel",
            "parts",
        ];
        const numItems = 3 + Math.floor(Math.random() * 4);
        const items: PlanetItem[] = [];
        for (let i = 0; i < numItems; i++) {
            items.push({
                type: resourceTypes[
                    Math.floor(Math.random() * resourceTypes.length)
                ],
                x: 0,
                collected: false,
            });
        }

        // First planet always gets the rubber ball; others get a random remaining dog toy
        if (isFirstPlanet) {
            items.push({
                type: "unique",
                uniqueId: "rubber_ball",
                x: 0,
                collected: false,
                locked: true,
            });
        } else {
            const usedToys = new Set(
                state.planets.flatMap((p) =>
                    p.items
                        .filter(
                            (i) =>
                                i.uniqueId && DOG_TOY_IDS.includes(i.uniqueId),
                        )
                        .map((i) => i.uniqueId),
                ),
            );
            // rubber_ball is always on planet 1
            usedToys.add("rubber_ball");
            const availableToys = DOG_TOY_IDS.filter((id) => !usedToys.has(id));
            if (availableToys.length > 0) {
                const toyId =
                    availableToys[
                        Math.floor(Math.random() * availableToys.length)
                    ];
                items.push({
                    type: "unique",
                    uniqueId: toyId,
                    x: 0,
                    collected: false,
                    locked: true,
                });
            }
        }

        // Each planet gets a random exotic plant (locked until human companion)
        const usedPlants = new Set(
            state.planets.flatMap((p) =>
                p.items
                    .filter(
                        (i) =>
                            i.uniqueId && EXOTIC_PLANT_IDS.includes(i.uniqueId),
                    )
                    .map((i) => i.uniqueId),
            ),
        );
        const availablePlants = EXOTIC_PLANT_IDS.filter(
            (id) => !usedPlants.has(id),
        );
        if (availablePlants.length > 0) {
            const plantId =
                availablePlants[
                    Math.floor(Math.random() * availablePlants.length)
                ];
            items.push({
                type: "unique",
                uniqueId: plantId,
                x: 0,
                collected: false,
                locked: true,
            });
        }

        // Lush planets have one oxygen-producing plant (collectable immediately, no companion needed)
        if (biome === "lush") {
            const planetIndex = state.planets.length + 1;
            items.push({
                type: "unique",
                uniqueId: `oxygen_plant_${planetIndex}`,
                x: 0,
                collected: false,
                locked: false,
            });
        }

        // Distribute all surface items in slots (max-x 0.83 keeps cave zone clear)
        distributeInSlots(items, 0.06, 0.83);

        // --- Cave items ---
        const numCaveResources = 3 + Math.floor(Math.random() * 3);
        const caveItems: PlanetItem[] = [];
        for (let i = 0; i < numCaveResources; i++) {
            caveItems.push({
                type: resourceTypes[
                    Math.floor(Math.random() * resourceTypes.length)
                ],
                x: 0,
                collected: false,
                locked: true,
            });
        }

        // Distribute a unique cave item (one per planet, from pool)
        const usedCaveUniques = new Set(
            state.planets.flatMap((p) =>
                p.caveItems
                    .filter(
                        (i) =>
                            i.uniqueId && CAVE_UNIQUE_IDS.includes(i.uniqueId),
                    )
                    .map((i) => i.uniqueId),
            ),
        );
        const availableCaveUniques = CAVE_UNIQUE_IDS.filter(
            (id) => !usedCaveUniques.has(id),
        );
        if (availableCaveUniques.length > 0) {
            const uniqueId =
                availableCaveUniques[
                    Math.floor(Math.random() * availableCaveUniques.length)
                ];
            caveItems.push({
                type: "unique",
                uniqueId,
                x: 0,
                collected: false,
                locked: true,
            });
        }

        distributeInSlots(caveItems, 0.08, 0.92);

        const planet: PlanetData = {
            id: `planet_${state.planets.length + 1}`,
            name,
            biome,
            discoveredDay: state.currentDay,
            items,
            caveItems,
            caveLit: state.planets.length === CAVEDIVER_PLANET_INDEX,
            mountainCave: state.planets.length % 2 === 1,
        };

        GameState.update(scene, { planets: [...state.planets, planet] });
        return planet;
    }

    static unlockAllCaveItems(scene: Phaser.Scene): void {
        const state = GameState.get(scene);
        const planets = state.planets.map((p) => ({
            ...p,
            caveItems: p.caveItems.map((item) => ({ ...item, locked: false })),
        }));
        GameState.update(scene, { planets });
    }

    static getPlanet(
        scene: Phaser.Scene,
        planetId: string,
    ): PlanetData | undefined {
        const state = GameState.get(scene);
        return state.planets.find((p) => p.id === planetId);
    }

    static collectPlanetItem(
        scene: Phaser.Scene,
        planetId: string,
        itemIndex: number,
    ): void {
        const state = GameState.get(scene);
        const planets = state.planets.map((p) => {
            if (p.id !== planetId) return p;
            const items = p.items.map((item, i) => {
                if (i !== itemIndex) return item;
                return { ...item, collected: true };
            });
            return { ...p, items };
        });
        GameState.update(scene, { planets });
    }

    static hasUncollectedItems(planet: PlanetData): boolean {
        return planet.items.some((item) => !item.collected);
    }
}
