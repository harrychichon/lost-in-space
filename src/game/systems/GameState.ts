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

export interface PlanetData {
    id: string;
    name: string;
    biome: "rocky" | "lush" | "frozen" | "desert";
    discoveredDay: number;
    items: PlanetItem[];
}

export interface CompanionData {
    id: string;
    name: string;
    type: "dog" | "human";
    foundDay: number;
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
}

const EXOTIC_PLANT_IDS = ["voidbloom", "sweetmoss", "starspice"];
const DOG_TOY_IDS = [
    "rubber_ball",
    "squeaky_bone",
    "chew_rope",
    "cozy_blanket",
];

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

const BIOMES: PlanetData["biome"][] = ["rocky", "lush", "frozen", "desert"];

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
};

const REGISTRY_KEY = "gameState";

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

    static isRescueEventReady(scene: Phaser.Scene): boolean {
        const state = GameState.get(scene);
        return state.currentDay >= 9 && !GameState.hasCompanion(scene, "human");
    }

    static getSaturation(scene: Phaser.Scene): number {
        const state = GameState.get(scene);
        return Math.min(1, state.companions * 0.3);
    }

    // --- Companion methods ---

    static addCompanion(scene: Phaser.Scene, companion: CompanionData): void {
        const state = GameState.get(scene);
        GameState.update(scene, {
            companions: state.companions + 1,
            companionList: [...state.companionList, companion],
        });
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
                x: 0.08 + Math.random() * 0.84,
                collected: false,
            });
        }

        // First planet always gets the rubber ball; others get a random remaining dog toy
        if (isFirstPlanet) {
            items.push({
                type: "unique",
                uniqueId: "rubber_ball",
                x: 0.5 + Math.random() * 0.3,
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
                    x: 0.15 + Math.random() * 0.7,
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
                x: 0.15 + Math.random() * 0.7,
                collected: false,
                locked: true,
            });
        }

        const planet: PlanetData = {
            id: `planet_${state.planets.length + 1}`,
            name,
            biome,
            discoveredDay: state.currentDay,
            items,
        };

        GameState.update(scene, { planets: [...state.planets, planet] });
        return planet;
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
