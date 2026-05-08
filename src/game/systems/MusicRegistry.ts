export type TrackMood      = 'very-sad' | 'sad' | 'neutral' | 'happy';
export type TrackIntensity = 'low' | 'medium' | 'high';

const MOOD_DIR: Record<TrackMood, string> = {
    'very-sad': '1. very sad',
    sad:        '2. sad',
    neutral:    '3. neutral',
    happy:      '4. happy',
};

const INTENSITY_DIR: Record<TrackIntensity, string> = {
    low:    '1. low intensity',
    medium: '2. medium intensity',
    high:   '3. high intensity',
};

interface TrackDef { mood: TrackMood; intensity: TrackIntensity; file: string; }

const TRACKS: TrackDef[] = [
    // very sad — high intensity (events: alarm, companion_found)
    { mood: 'very-sad', intensity: 'high',   file: 'bensound-november.mp3'  },
    { mood: 'very-sad', intensity: 'high',   file: 'finding-doggo.mp3'      },

    // sad — low intensity (ship / rooms / navigation)
    { mood: 'sad',      intensity: 'low',    file: 'bensound-silentsuspicions.mp3' },
    { mood: 'sad',      intensity: 'low',    file: 'bensound-stifledscreams.mp3'  },
    { mood: 'sad',      intensity: 'low',    file: 'bensound-vanishinghope.mp3'   },

    // sad — medium intensity (planets / caves)
    { mood: 'sad',      intensity: 'medium', file: 'bensound-refract.mp3' },

    // neutral — low intensity (ship / rooms / navigation)
    { mood: 'neutral',  intensity: 'low',    file: 'freesound-community-low-ambient-01-61547.mp3' },
    { mood: 'neutral',  intensity: 'low',    file: 'tin-can-sky.mp3'  },
    { mood: 'neutral',  intensity: 'low',    file: 'tin-can-sky-2.mp3' },

    // neutral — medium intensity (planets / caves)
    { mood: 'neutral',  intensity: 'medium', file: 'bensound-asyourworldgrowssmaller.mp3' },

    { mood: 'neutral',  intensity: 'medium', file: 'celesta-rain.mp3'     },
    { mood: 'neutral',  intensity: 'medium', file: 'celesta-rain-2.mp3'   },
    { mood: 'neutral',  intensity: 'medium', file: 'cobalt-thunder-2.mp3' },

    // neutral — high intensity (event: cavediver)
    { mood: 'neutral',  intensity: 'high',   file: 'cobalt-thunder.mp3' },

    // happy — medium intensity (planets / caves)
    { mood: 'happy',    intensity: 'medium', file: 'bensound-longnight.mp3'      },
    { mood: 'happy',    intensity: 'medium', file: 'echoes-between-quests.mp3'   },
    { mood: 'happy',    intensity: 'medium', file: 'reactive-echoes.mp3'         },
    { mood: 'happy',    intensity: 'medium', file: 'reactive-echoes-2.mp3'       },

    // happy — high intensity (event: rescue)
    { mood: 'happy',    intensity: 'high',   file: 'bensound-hearty.mp3' },
];

function toKey(t: TrackDef): string {
    return `music/${t.mood}/${t.intensity}/${t.file.replace(/\.[^.]+$/, '')}`;
}

function toPath(t: TrackDef): string {
    return `audio/music/${MOOD_DIR[t.mood]}/${INTENSITY_DIR[t.intensity]}/${t.file}`;
}

/** All [key, path] pairs — loop over this in Preloader to load every track. */
export function musicEntries(): Array<[string, string]> {
    return TRACKS.map(t => [toKey(t), toPath(t)]);
}

/** Phaser keys for all tracks matching mood + intensity — used to build AudioManager pools. */
export function musicPool(mood: TrackMood, intensity: TrackIntensity): string[] {
    return TRACKS.filter(t => t.mood === mood && t.intensity === intensity).map(toKey);
}

/** First high-intensity track for a mood — used for event playback. */
export function eventTrack(mood: TrackMood): string {
    return musicPool(mood, 'high')[0] ?? '';
}

/** Phaser key for a specific file — used to pin a track to an exact event. */
export function namedTrack(file: string): string {
    const track = TRACKS.find(t => t.file === file);
    if (!track) throw new Error(`MusicRegistry: no track found for file "${file}"`);
    return toKey(track);
}
