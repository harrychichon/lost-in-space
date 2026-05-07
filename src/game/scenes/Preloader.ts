import { Scene } from "phaser";
import { loadPlayerAssets, createPlayerAnimations } from "../objects/Player";

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

        // Audio tracks
        this.load.audio("low_ambient", "audio/freesound_community-low-ambient-01-61547.mp3");
        this.load.audio("spooky_wind", "audio/dragon-studio-spooky-wind-429221.mp3");

        // Planet art (round-robin by discovery index in Navigation)
        const planetNumbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20];
        for (const n of planetNumbers) {
            this.load.image(`planet${n}`, `planet${n}.png`);
        }
        this.load.image("planet18", "planet18_0.png");

        // Seamless parallax space background (3 layers)
        this.load.image("bg_space", "bg_space_seamless.png");
        this.load.image("bg_space_fl1", "bd_space_seamless_fl1.png");
        this.load.image("bg_space_fl2", "bg_space_seamless_fl2.png");

        // Player spritesheet (15 frames: 3 rows × 5 cols)
        loadPlayerAssets(this);
    }

    create() {
        createPlayerAnimations(this);
        this.scene.start("MainMenu");
    }
}
