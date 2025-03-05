import * as Tone from 'tone';
import { createState } from './state.js';

export async function initializeAudio() {
    // Initialize audio context
    try {
        await Tone.start();
        console.log('Audio context started');
        
        const state = createState();
        const audio = setupAudioNodes(state);
        
        return { state, audio };
    } catch (error) {
        console.error('Could not start audio context:', error);
        throw error;
    }
}

function setupAudioNodes(state) {
    // Create master output and analyzer
    const masterOutput = new Tone.Volume(0).toDestination();
    const analyzer = Tone.getContext().createAnalyser();
    analyzer.fftSize = 2048;
    
    // Setup effects
    const effects = createEffects();
    
    // FX Chain
    const fxChain = new Tone.Chain(
        effects.delay,
        effects.reverb,
        effects.flanger,
        effects.bitcrush,
        masterOutput
    );
    
    // Connect Tone.js to our analyzer
    Tone.connect(masterOutput, analyzer);
    
    // Load samples
    const samples = loadSamples();
    
    // Set initial BPM
    Tone.Transport.bpm.value = state.bpm;
    
    return { masterOutput, analyzer, effects, fxChain, samples };
}

function createEffects() {
    const effects = {
        delay: new Tone.FeedbackDelay(0.25, 0.5),
        reverb: new Tone.Reverb(2),
        flanger: new Tone.Chorus(4, 2.5, 0.5),
        bitcrush: new Tone.BitCrusher(4)
    };
    
    // Turn off all effects initially
    Object.values(effects).forEach(effect => effect.wet.value = 0);
    
    return effects;
}

function loadSamples() {
    const samples = {
        kick: new Tone.Player('https://cdn.jsdelivr.net/gh/Tonejs/Tone.js/examples/audio/505/kick.mp3').toDestination(),
        snare: new Tone.Player('https://cdn.jsdelivr.net/gh/Tonejs/Tone.js/examples/audio/505/snare.mp3').toDestination(),
        hihat: new Tone.Player('https://cdn.jsdelivr.net/gh/Tonejs/Tone.js/examples/audio/505/hh.mp3').toDestination(),
        clap: new Tone.Player('https://cdn.jsdelivr.net/gh/Tonejs/Tone.js/examples/audio/505/clap.mp3').toDestination(),
        tom: new Tone.Player('https://freesound.org/data/previews/41/41155_90729-lq.mp3').toDestination(),
        crash: new Tone.Player('https://freesound.org/data/previews/133/133799_2096340-lq.mp3').toDestination()
    };
    
    // Preload samples
    Promise.all(Object.values(samples).map(player => player.load())).then(() => {
        console.log('All samples loaded');
    });
    
    return samples;
}