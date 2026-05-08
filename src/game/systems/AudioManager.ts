import { Scene } from 'phaser';
import { musicPool, eventTrack, namedTrack } from './MusicRegistry';

export type LocationKey = 'ship' | 'room' | 'planet' | 'cave' | 'navigation';
export type MoodKey = 'very_sad' | 'sad' | 'neutral' | 'happy' | 'very_happy';
export type EventKey = 'companion_found' | 'rescue' | 'cavediver' | 'alarm';

export interface AudioCtx {
    warmth: number;       // 0-1: drives mood tier + tension
    location: LocationKey;
    biome?: string;
}

// Warmth thresholds mapping to mood folders
const WARMTH_BRACKETS: Array<{ max: number; mood: MoodKey }> = [
    { max: 0.20, mood: 'very_sad'  },
    { max: 0.40, mood: 'sad'       },
    { max: 0.60, mood: 'neutral'   },
    { max: 0.80, mood: 'happy'     },
    { max: 1.01, mood: 'very_happy'},
];

// Low-intensity pools (ship / rooms / navigation) — derived from MusicRegistry
const LOW_TRACKS: Record<MoodKey, string[]> = {
    very_sad:   musicPool('very-sad',   'low'),
    sad:        musicPool('sad',        'low'),
    neutral:    musicPool('neutral',    'low'),
    happy:      musicPool('happy',      'low'),
    very_happy: musicPool('very-happy', 'low'),
};

// Medium-intensity pools (planets / caves) — derived from MusicRegistry
const MEDIUM_TRACKS: Record<MoodKey, string[]> = {
    very_sad:   musicPool('very-sad',   'medium'),
    sad:        musicPool('sad',        'medium'),
    neutral:    musicPool('neutral',    'medium'),
    happy:      musicPool('happy',      'medium'),
    very_happy: musicPool('very-happy', 'medium'),
};

// Event tracks — pinned by name where a specific track is required
const EVENT_TRACKS: Record<EventKey, string> = {
    companion_found: namedTrack('finding-doggo.mp3'),
    rescue:          eventTrack('happy'),
    cavediver:       eventTrack('neutral'),
    alarm:           namedTrack('bensound-november.mp3'),
};

// Environment sounds by location (independent of mood)
const ENV_MAP: Record<LocationKey, string | null> = {
    ship:       'env_ship',
    room:       'env_room',
    navigation: 'env_ship',
    planet:     null,   // resolved per biome below
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

// Tension (spooky_wind) fades in when warmth drops below this level.
// Intensity scales linearly from 0 at threshold to max at warmth=0.
const TENSION_THRESHOLD  = 0.40;
const TENSION_MAX_VOLUME = 0.25;

export class AudioManager {
    private static musicKey: string | null = null;
    private static musicSound: Phaser.Sound.BaseSound | null = null;
    private static currentMood: MoodKey | null = null;
    private static currentLocation: LocationKey | null = null;
    private static envKey: string | null = null;
    private static envSound: Phaser.Sound.BaseSound | null = null;
    private static tensionActive = false;
    private static tensionSound: Phaser.Sound.BaseSound | null = null;
    private static eventActive = false;
    private static currentEventKey: EventKey | null = null;

    static getCurrentMusicKey(): string | null { return AudioManager.musicKey; }
    static isEventActive(): boolean { return AudioManager.eventActive; }
    static getCurrentEventKey(): EventKey | null { return AudioManager.currentEventKey; }
    static getMoodName(warmth: number): MoodKey { return AudioManager.moodFromWarmth(warmth); }

    /** Main call: scenes declare their audio context, AudioManager handles the rest. */
    static update(scene: Scene, ctx: AudioCtx): void {
        if (AudioManager.eventActive) return;
        const mood     = AudioManager.moodFromWarmth(ctx.warmth);
        const musicKey = AudioManager.resolveMusic(scene, mood, ctx.location);
        const envKey   = AudioManager.resolveEnv(ctx.location, ctx.biome);
        AudioManager.currentMood     = mood;
        AudioManager.currentLocation = ctx.location;
        AudioManager.updateMusic(scene, musicKey);
        AudioManager.updateEnv(scene, envKey);
        AudioManager.updateTension(scene, ctx.warmth);
    }

    /**
     * Play a high-intensity event track, pausing the normal music layer.
     * Call once from the event scene's create(). AudioManager.stop() or the next
     * update() call (when entering a regular scene) will clear the event state.
     */
    static playEvent(scene: Scene, event: EventKey): void {
        const key = EVENT_TRACKS[event];
        if (!scene.cache.audio.has(key)) return;
        AudioManager.fadeOut(scene, AudioManager.musicSound);
        AudioManager.musicSound = null;
        AudioManager.musicKey   = null;
        AudioManager.fadeOutTension(scene);
        const sound = scene.sound.add(key, { loop: true, volume: 0 });
        sound.play();
        scene.tweens.add({ targets: sound, volume: MUSIC_VOLUME, duration: FADE_MS, ease: 'Sine.easeOut' });
        AudioManager.musicKey        = key;
        AudioManager.musicSound      = sound;
        AudioManager.eventActive     = true;
        AudioManager.currentEventKey = event;
    }

    /** Fade out all layers. Use for cutscenes that want silence, or to clear event state. */
    static stop(scene: Scene): void {
        AudioManager.fadeOut(scene, AudioManager.musicSound);
        AudioManager.musicSound      = null;
        AudioManager.musicKey        = null;
        AudioManager.currentMood     = null;
        AudioManager.currentLocation = null;
        AudioManager.eventActive     = false;
        AudioManager.currentEventKey = null;
        AudioManager.fadeOut(scene, AudioManager.envSound);
        AudioManager.envSound = null;
        AudioManager.envKey   = null;
        AudioManager.fadeOutTension(scene);
    }

    /**
     * Clear event state so the next update() call resumes normal music.
     * musicSound is intentionally kept so updateMusic() can fade it out gracefully.
     */
    static clearEvent(): void {
        AudioManager.eventActive     = false;
        AudioManager.currentEventKey = null;
        AudioManager.musicKey        = null; // force re-resolve; updateMusic fades old sound
        AudioManager.currentMood     = null; // force fresh track pick on resume
        AudioManager.currentLocation = null;
    }

    private static moodFromWarmth(warmth: number): MoodKey {
        for (const bracket of WARMTH_BRACKETS) {
            if (warmth < bracket.max) return bracket.mood;
        }
        return 'very_happy';
    }

    private static resolveMusic(scene: Scene, mood: MoodKey, location: LocationKey): string | null {
        const isExploration = location === 'planet' || location === 'cave';
        const pool   = isExploration ? MEDIUM_TRACKS[mood] : LOW_TRACKS[mood];
        const loaded = pool.filter(k => scene.cache.audio.has(k));
        if (loaded.length === 0) return null;
        // Keep the current track only if both mood and intensity tier are unchanged.
        const sameContext = mood === AudioManager.currentMood && location === AudioManager.currentLocation;
        if (sameContext && AudioManager.musicKey && loaded.includes(AudioManager.musicKey)) {
            return AudioManager.musicKey;
        }
        const choices = loaded.filter(k => k !== AudioManager.musicKey);
        return choices.length > 0
            ? choices[Math.floor(Math.random() * choices.length)]
            : loaded[0];
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

    private static updateTension(scene: Scene, warmth: number): void {
        if (warmth < TENSION_THRESHOLD) {
            const intensity = (TENSION_THRESHOLD - warmth) / TENSION_THRESHOLD;
            const targetVol = TENSION_MAX_VOLUME * intensity;
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
