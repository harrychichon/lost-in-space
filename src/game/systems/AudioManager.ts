import { Scene } from 'phaser';

export type MusicTier = 0 | 1 | 2 | 3;
export type LocationKey = 'ship' | 'room' | 'planet' | 'cave' | 'navigation';

export interface AudioCtx {
    tier: MusicTier;
    location: LocationKey;
    wellbeing: number;
    biome?: string;
}

// Tier defaults for the music layer. Swap a key for the real asset once it exists.
const MUSIC_TIER_DEFAULT: Record<MusicTier, string> = {
    0: 'music_solo',
    1: 'music_dog',
    2: 'music_botanist',
    3: 'music_crew',
};

// Sparse overrides: MUSIC_MAP[tier][location] beats the tier default.
// Example: 1: { planet: 'music_solo' }  — planet feels lonelier at tier 1.
const MUSIC_MAP: Partial<Record<MusicTier, Partial<Record<LocationKey, string>>>> = {};

// Environment sounds by location (independent of tier).
const ENV_MAP: Record<LocationKey, string | null> = {
    ship:       'env_ship',
    room:       'env_room',
    navigation: 'env_ship',
    planet:     null,        // resolved per biome below
    cave:       'env_cave',
};

const ENV_PLANET_BIOME: Record<string, string> = {
    rocky:  'env_planet_rocky',
    lush:   'env_planet_lush',
    frozen: 'env_planet_frozen',
    desert: 'env_planet_desert',
};

const MUSIC_VOLUME = 0.4;
const ENV_VOLUME   = 0.2;
const FADE_MS      = 1200;

// Tension layer (spooky_wind) fades in when wellbeing drops below threshold.
const TENSION_CONFIG: Record<MusicTier, { threshold: number | null; maxVolume: number }> = {
    0: { threshold: 0.45, maxVolume: 0.25 },
    1: { threshold: 0.35, maxVolume: 0.18 },
    2: { threshold: 0.35, maxVolume: 0.12 },
    3: { threshold: null,  maxVolume: 0    },
};

/**
 * Global audio controller. Three independent layers: music, environment, tension.
 * Phaser's sound system is game-scoped, so all state survives scene transitions.
 *
 * To add a new music track: load it in Preloader, add the key to MUSIC_TIER_DEFAULT
 * (or MUSIC_MAP for a tier×location override). No call sites change.
 * To add environment sounds: load in Preloader, the silent no-op will become active.
 */
export class AudioManager {
    private static musicKey: string | null = null;
    private static musicSound: Phaser.Sound.BaseSound | null = null;
    private static envKey: string | null = null;
    private static envSound: Phaser.Sound.BaseSound | null = null;
    private static tensionActive = false;
    private static tensionSound: Phaser.Sound.BaseSound | null = null;

    /** Main call: scenes declare their context and AudioManager handles the rest. */
    static update(scene: Scene, ctx: AudioCtx): void {
        const musicKey = AudioManager.resolveMusic(scene, ctx.tier, ctx.location);
        const envKey   = AudioManager.resolveEnv(ctx.location, ctx.biome);
        AudioManager.updateMusic(scene, musicKey);
        AudioManager.updateEnv(scene, envKey);
        AudioManager.updateTension(scene, ctx.tier, ctx.wellbeing);
    }

    /** Fade out all layers. Use for cutscenes that want silence. */
    static stop(scene: Scene): void {
        AudioManager.fadeOut(scene, AudioManager.musicSound);
        AudioManager.musicSound = null;
        AudioManager.musicKey   = null;
        AudioManager.fadeOut(scene, AudioManager.envSound);
        AudioManager.envSound = null;
        AudioManager.envKey   = null;
        AudioManager.fadeOutTension(scene);
    }

    private static resolveMusic(scene: Scene, tier: MusicTier, location: LocationKey): string | null {
        const key = MUSIC_MAP[tier]?.[location] ?? MUSIC_TIER_DEFAULT[tier];
        if (scene.cache.audio.has(key)) return key;
        // Asset not loaded yet — fall back to music_solo
        return scene.cache.audio.has('music_solo') ? 'music_solo' : null;
    }

    private static resolveEnv(location: LocationKey, biome?: string): string | null {
        if (location === 'planet') {
            return biome ? (ENV_PLANET_BIOME[biome] ?? null) : null;
        }
        return ENV_MAP[location];
    }

    private static updateMusic(scene: Scene, key: string | null): void {
        if (key === AudioManager.musicKey && AudioManager.musicSound) return;
        AudioManager.fadeOut(scene, AudioManager.musicSound);
        AudioManager.musicSound = null;
        AudioManager.musicKey   = null;
        if (!key || !scene.cache.audio.has(key)) return;
        const sound = scene.sound.add(key, { loop: true, volume: 0 });
        sound.play();
        scene.tweens.add({ targets: sound, volume: MUSIC_VOLUME, duration: FADE_MS, ease: 'Sine.easeOut' });
        AudioManager.musicKey   = key;
        AudioManager.musicSound = sound;
    }

    private static updateEnv(scene: Scene, key: string | null): void {
        if (key === AudioManager.envKey && AudioManager.envSound) return;
        AudioManager.fadeOut(scene, AudioManager.envSound);
        AudioManager.envSound = null;
        AudioManager.envKey   = null;
        if (!key || !scene.cache.audio.has(key)) return;
        const sound = scene.sound.add(key, { loop: true, volume: 0 });
        sound.play();
        scene.tweens.add({ targets: sound, volume: ENV_VOLUME, duration: FADE_MS, ease: 'Sine.easeOut' });
        AudioManager.envKey   = key;
        AudioManager.envSound = sound;
    }

    private static updateTension(scene: Scene, tier: MusicTier, wellbeing: number): void {
        const config = TENSION_CONFIG[tier];
        if (config.threshold === null) {
            AudioManager.fadeOutTension(scene);
            return;
        }
        if (wellbeing <= config.threshold) {
            const intensity  = (config.threshold - wellbeing) / config.threshold;
            const targetVol  = config.maxVolume * intensity;
            if (AudioManager.tensionActive && AudioManager.tensionSound) {
                scene.tweens.add({ targets: AudioManager.tensionSound, volume: targetVol, duration: FADE_MS, ease: 'Sine.easeOut' });
            } else {
                if (!scene.cache.audio.has('spooky_wind')) return;
                const sound = scene.sound.add('spooky_wind', { loop: true, volume: 0 });
                sound.play();
                scene.tweens.add({ targets: sound, volume: targetVol, duration: FADE_MS, ease: 'Sine.easeOut' });
                AudioManager.tensionSound  = sound;
                AudioManager.tensionActive = true;
            }
        } else {
            AudioManager.fadeOutTension(scene);
        }
    }

    private static fadeOut(scene: Scene, sound: Phaser.Sound.BaseSound | null): void {
        if (!sound) return;
        scene.tweens.add({
            targets: sound,
            volume: 0,
            duration: FADE_MS,
            ease: 'Sine.easeIn',
            onComplete: () => { sound.stop(); sound.destroy(); },
        });
    }

    private static fadeOutTension(scene: Scene): void {
        if (!AudioManager.tensionActive || !AudioManager.tensionSound) return;
        AudioManager.fadeOut(scene, AudioManager.tensionSound);
        AudioManager.tensionSound  = null;
        AudioManager.tensionActive = false;
    }
}
