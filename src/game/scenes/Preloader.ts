import { Scene } from "phaser";
import { loadPlayerAssets, createPlayerAnimations } from "../objects/Player";
import { loadDogAssets, createDogAnimations } from "../objects/Dog";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
    }

    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, "background");

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on("progress", (progress: number) => {
            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + 460 * progress;
        });
    }

    preload() {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath("assets");

        this.load.image("logo", "logo.png");

        // --- Music: mood-based (warmth 0→1 maps very_sad→sad→neutral→happy→very_happy) ---
        // sad low intensity (warmth < 0.4)
        this.load.audio("music_sad_low_1",     "audio/music/2. sad/1. low intensity/bensound-silentsuspicions.mp3");
        this.load.audio("music_sad_low_2",     "audio/music/2. sad/1. low intensity/bensound-stifledscreams.mp3");
        this.load.audio("music_sad_low_3",     "audio/music/2. sad/1. low intensity/bensound-vanishinghope.mp3");
        // sad medium intensity (warmth < 0.4)
        this.load.audio("music_sad_medium",    "audio/music/2. sad/2. medium intensity/bensound-refract.mp3");
        // neutral low intensity (warmth 0.4–0.6)
        this.load.audio("music_neutral_low",   "audio/music/3. neutral/1. low intensity/freesound_community-low-ambient-01-61547.mp3");
        // neutral medium intensity (warmth 0.4–0.6, also fallback for happy/very_happy)
        this.load.audio("music_neutral_medium_1", "audio/music/3. neutral/2. medium intensity/bensound-asyourworldgrowssmaller.mp3");
        this.load.audio("music_neutral_medium_2", "audio/music/3. neutral/2. medium intensity/finding-doggo.mp3");
        // --- Music: high-intensity event tracks ---
        this.load.audio("music_event_verysad", "audio/music/1. very sad/3. high intensity/bensound-november.mp3");
        this.load.audio("music_event_happy_1", "audio/music/4. happy/3. high intensity/bensound-hearty.mp3");
        this.load.audio("music_event_happy_2", "audio/music/4. happy/3. high intensity/bensound-longnight.mp3");
        // --- Tension + SFX ---
        this.load.audio("spooky_wind",   "audio/environment/dragon-studio-spooky-wind-429221.mp3");
        this.load.audio("creepy_static", "audio/environment/creepy_static.wav");
        this.load.audio("beep_sequence", "audio/environment/beep_sequence_02.wav");
        // Environment ambience (uncomment once files are added)
        // this.load.audio("env_ship",           "audio/environment/env_ship.mp3");
        // this.load.audio("env_room",           "audio/environment/env_room.mp3");
        // this.load.audio("env_cave",           "audio/environment/env_cave.mp3");
        // this.load.audio("env_planet_rocky",   "audio/environment/env_planet_rocky.mp3");
        // this.load.audio("env_planet_lush",    "audio/environment/env_planet_lush.mp3");
        // this.load.audio("env_planet_frozen",  "audio/environment/env_planet_frozen.mp3");
        // this.load.audio("env_planet_desert",  "audio/environment/env_planet_desert.mp3");

        // Planet art (round-robin by discovery index in Navigation)
        const planetNumbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20];
        for (const n of planetNumbers) {
            this.load.image(`planet${n}`, `navplanets/planet${n}.png`);
        }
        this.load.image("planet18", "navplanets/planet18_0.png");

        // Spaceship sprites (DayIntro)
        this.load.image("ship_default", "spaceship/default.png");
        this.load.image("ship_active", "spaceship/active.png");

        // Seamless parallax space background (3 layers)
        this.load.image("bg_space", "bg_space_seamless.png");
        this.load.image("bg_space_fl1", "bd_space_seamless_fl1.png");
        this.load.image("bg_space_fl2", "bg_space_seamless_fl2.png");

        // Planet surface backdrops
        this.load.image("bg_grass", "planetbgs/grass.png");
        this.load.image("bg_rock", "planetbgs/rock.png");
        this.load.image("bg_snow", "planetbgs/snow.png");

        // Terrain tile atlas (Kenney-style XML)
        this.load.atlasXML(
            "tiles",
            "tiles/spritesheet-tiles-default.png",
            "tiles/spritesheet-tiles-default.xml",
        );

        // Plant sprites (2×4 grid of 32×32 frames; frame 6 = bottom-left fully grown)
        const plantSheet = (key: string, file: string) => {
            this.load.spritesheet(key, `plants/${file}`, { frameWidth: 32, frameHeight: 32 });
        };
        plantSheet("plant_basicblue", "basicblue.png");
        plantSheet("plant_basicyellow", "basicyellow.png");
        plantSheet("plant_voidbloom", "purplebulb.png");
        plantSheet("plant_sweetmoss", "blueflower.png");
        plantSheet("plant_starspice", "orangeflower.png");

        // Player spritesheet (15 frames: 3 rows × 5 cols)
        loadPlayerAssets(this);

        // Dog idle spritesheet (4 frames)
        loadDogAssets(this);

        // Door tileset (5 cols × 3 rows, 24×32 per frame)
        this.load.spritesheet("doors", "door.png", {
            frameWidth: 24,
            frameHeight: 32,
        });
    }

    create() {
        createPlayerAnimations(this);
        createDogAnimations(this);
        this.textures.get("doors").setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.textures.get("tiles").setFilter(Phaser.Textures.FilterMode.NEAREST);
        for (const key of ["plant_basicblue", "plant_basicyellow", "plant_voidbloom", "plant_sweetmoss", "plant_starspice"]) {
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
        this.scene.start("MainMenu");
    }
}
