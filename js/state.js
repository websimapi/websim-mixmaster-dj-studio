export function createState() {
    return {
        isPlaying: false,
        bpm: 128,
        activeEffects: [],
        currentLoops: {
            a: null,
            b: null
        },
        deckA: {
            player: null,
            wavesurfer: null,
            loaded: false,
            volume: 0.8,
            eq: {
                high: 0,
                mid: 0,
                low: 0
            },
            filter: 0.5
        },
        deckB: {
            player: null,
            wavesurfer: null,
            loaded: false,
            volume: 0.8,
            eq: {
                high: 0,
                mid: 0,
                low: 0
            },
            filter: 0.5
        },
        crossfaderValue: 0.5,
        fxAmount: 0.3
    };
}

