import { Scene } from 'phaser';

type TrackKey = 'low_ambient' | 'spooky_wind' | null;

const TARGET_VOLUME: Record<Exclude<TrackKey, null>, number> = {
    low_ambient: 0.4,
    spooky_wind: 0.35,
};

const FADE_MS = 1200;

/**
 * Global music controller. Phaser's sound system is game-scoped, so tracks
 * survive scene transitions. Each scene just declares what it wants playing.
 */
export class AudioManager {
    private static currentKey: TrackKey = null;
    private static currentSound: Phaser.Sound.BaseSound | null = null;

    /** Ensure the given track is playing (looped). Crossfades from any other track. */
    static play(scene: Scene, key: Exclude<TrackKey, null>): void {
        if (AudioManager.currentKey === key && AudioManager.currentSound) {
            return; // already playing
        }
        AudioManager.fadeOutCurrent(scene);

        const sound = scene.sound.add(key, { loop: true, volume: 0 });
        sound.play();
        scene.tweens.add({
            targets: sound,
            volume: TARGET_VOLUME[key],
            duration: FADE_MS,
            ease: 'Sine.easeOut',
        });
        AudioManager.currentKey = key;
        AudioManager.currentSound = sound;
    }

    /** Fade out whatever is playing. */
    static stop(scene: Scene): void {
        AudioManager.fadeOutCurrent(scene);
        AudioManager.currentKey = null;
    }

    private static fadeOutCurrent(scene: Scene): void {
        const prev = AudioManager.currentSound;
        if (!prev) return;
        AudioManager.currentSound = null;
        scene.tweens.add({
            targets: prev,
            volume: 0,
            duration: FADE_MS,
            ease: 'Sine.easeIn',
            onComplete: () => {
                prev.stop();
                prev.destroy();
            },
        });
    }
}
