import { Boot } from "./scenes/Boot";
import { GameOver } from "./scenes/GameOver";
import { MainMenu } from "./scenes/MainMenu";
import { DayIntro } from "./scenes/DayIntro";
import { Ship } from "./scenes/Ship";
import { Kitchen } from "./scenes/Kitchen";
import { Greenhouse } from "./scenes/Greenhouse";
import { Engine } from "./scenes/Engine";
import { Comms } from "./scenes/Comms";
import { Navigation } from "./scenes/Navigation";
import { Planet } from "./scenes/Planet";
import { CompanionEvent } from "./scenes/CompanionEvent";
import { RescueEvent } from "./scenes/RescueEvent";
import { CavediverEvent } from "./scenes/CavediverEvent";
import { Cave } from "./scenes/Cave";
import { Collection } from "./scenes/Collection";
import { DevPanel } from "./scenes/DevPanel";
import { AUTO, Game } from "phaser";
import { Preloader } from "./scenes/Preloader";

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: "game-container",
    backgroundColor: "#000000",
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
        },
    },
    scene: [
        Boot,
        Preloader,
        MainMenu,
        DayIntro,
        Ship,
        Kitchen,
        Greenhouse,
        Engine,
        Comms,
        Navigation,
        Planet,
        CompanionEvent,
        RescueEvent,
        CavediverEvent,
        Cave,
        Collection,
        GameOver,
        DevPanel,
    ],
};

const StartGame = (parent: string) => {
    const game = new Game({ ...config, parent });

    // Global M toggle for dev panel — works from any scene
    game.events.on("ready", () => {
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            if (e.key === "m" || e.key === "M") {
                e.preventDefault();
                const devScene = game.scene.getScene("DevPanel");
                if (devScene && devScene.scene.isActive()) {
                    devScene.scene.stop();
                } else {
                    // Use any active scene's plugin to launch DevPanel
                    const activeScenes = game.scene.getScenes(true);
                    if (activeScenes.length > 0) {
                        activeScenes[0].scene.launch("DevPanel");
                        activeScenes[0].scene.bringToTop("DevPanel");
                    }
                }
            }
        });
    });

    return game;
};

export default StartGame;
