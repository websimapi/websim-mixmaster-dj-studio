import * as Tone from 'tone';
import { setupDeck } from './deck.js';

export function setupUI(state, audio) {
    // Setup decks
    setupDeck('deckA', state, audio);
    setupDeck('deckB', state, audio);
    
    // Play/Pause controller
    setupPlaybackControls(state);
    
    // BPM controls
    setupBPMControls(state);
    
    // Volume and EQ controls
    setupMixerControls(state);
    
    // Effects section
    setupEffects(state, audio.effects);
    
    // Loop pads
    setupLoopPads(state);
    
    // Sample pads
    setupSamplePads(audio.samples);
}

function setupPlaybackControls(state) {
    document.getElementById('play-pause').addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        
        if (state.isPlaying) {
            Tone.Transport.start();
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            
            if (state.deckA.loaded) {
                state.deckA.player.start();
                state.deckA.wavesurfer.play();
                document.querySelector('#deck-a .rotation-indicator').style.animationPlayState = 'running';
            }
            
            if (state.deckB.loaded) {
                state.deckB.player.start();
                state.deckB.wavesurfer.play();
                document.querySelector('#deck-b .rotation-indicator').style.animationPlayState = 'running';
            }
        } else {
            Tone.Transport.pause();
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            
            if (state.deckA.loaded) {
                state.deckA.player.pause();
                state.deckA.wavesurfer.pause();
                document.querySelector('#deck-a .rotation-indicator').style.animationPlayState = 'paused';
            }
            
            if (state.deckB.loaded) {
                state.deckB.player.pause();
                state.deckB.wavesurfer.pause();
                document.querySelector('#deck-b .rotation-indicator').style.animationPlayState = 'paused';
            }
        }
    });
}

function setupBPMControls(state) {
    document.getElementById('bpm-slider').addEventListener('input', (e) => {
        state.bpm = parseInt(e.target.value);
        document.getElementById('bpm-value').value = state.bpm;
        Tone.Transport.bpm.value = state.bpm;
    });
    
    document.getElementById('bpm-value').addEventListener('change', (e) => {
        state.bpm = parseInt(e.target.value);
        document.getElementById('bpm-slider').value = state.bpm;
        Tone.Transport.bpm.value = state.bpm;
    });
}

function setupMixerControls(state) {
    // Volume controls
    document.getElementById('volume-a').addEventListener('input', (e) => {
        state.deckA.volume = parseFloat(e.target.value);
        state.deckA.player.volume.value = Tone.gainToDb(state.deckA.volume);
    });
    
    document.getElementById('volume-b').addEventListener('input', (e) => {
        state.deckB.volume = parseFloat(e.target.value);
        state.deckB.player.volume.value = Tone.gainToDb(state.deckB.volume);
    });
    
    // Crossfader
    document.getElementById('crossfader').addEventListener('input', (e) => {
        state.crossfaderValue = parseFloat(e.target.value);
        updateCrossfader(state);
    });
    
    // EQ controls
    document.querySelectorAll('.eq-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const deck = e.target.dataset.deck;
            const band = e.target.dataset.band;
            const value = parseFloat(e.target.value);
            
            state[`deck${deck.toUpperCase()}`].eq[band] = value;
            
            // Apply EQ
            let eqNode;
            if (band === 'high') {
                eqNode = state[`deck${deck.toUpperCase()}`].eqHigh;
            } else if (band === 'mid') {
                eqNode = state[`deck${deck.toUpperCase()}`].eqMid;
            } else {
                eqNode = state[`deck${deck.toUpperCase()}`].eqLow;
            }
            
            eqNode.gain.value = value;
        });
    });
    
    // Filter controls
    document.getElementById('filter-a').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        state.deckA.filter = value;
        
        // Map 0-1 to filter frequency (20-20000Hz logarithmically)
        const freq = 20 * Math.pow(1000, value);
        state.deckA.filterNode.frequency.value = freq;
    });
    
    document.getElementById('filter-b').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        state.deckB.filter = value;
        
        const freq = 20 * Math.pow(1000, value);
        state.deckB.filterNode.frequency.value = freq;
    });
}

function updateCrossfader(state) {
    // Logarithmic crossfading for more natural transitions
    const gainA = Math.cos(state.crossfaderValue * Math.PI / 2);
    const gainB = Math.cos((1 - state.crossfaderValue) * Math.PI / 2);
    
    state.deckA.player.volume.value = Tone.gainToDb(state.deckA.volume * gainA);
    state.deckB.player.volume.value = Tone.gainToDb(state.deckB.volume * gainB);
}

function setupEffects(state, effects) {
    document.querySelectorAll('.fx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const effect = e.target.dataset.effect;
            
            if (state.activeEffects.includes(effect)) {
                // Remove effect
                state.activeEffects = state.activeEffects.filter(e => e !== effect);
                e.target.classList.remove('active');
                effects[effect].wet.value = 0;
            } else {
                // Add effect
                state.activeEffects.push(effect);
                e.target.classList.add('active');
                effects[effect].wet.value = state.fxAmount;
            }
        });
    });
    
    document.getElementById('fx-amount').addEventListener('input', (e) => {
        state.fxAmount = parseFloat(e.target.value);
        
        // Update all active effects
        state.activeEffects.forEach(effect => {
            effects[effect].wet.value = state.fxAmount;
        });
    });
}

function setupLoopPads(state) {
    document.querySelectorAll('.loop-pad').forEach(pad => {
        pad.addEventListener('click', (e) => {
            const beats = parseInt(e.target.dataset.beats);
            
            // Determine which deck is more prominent based on crossfader
            const activeDeck = state.crossfaderValue < 0.5 ? 'a' : 'b';
            const deck = state[`deck${activeDeck.toUpperCase()}`];
            
            // Clear any existing loop on this deck
            if (state.currentLoops[activeDeck]) {
                state.currentLoops[activeDeck].pad.classList.remove('active');
                
                // If the same pad was clicked, just remove the loop
                if (state.currentLoops[activeDeck].beats === beats) {
                    if (deck.wavesurfer) {
                        deck.wavesurfer.setLoopPoints(0, 0);
                    }
                    state.currentLoops[activeDeck] = null;
                    return;
                }
            }
            
            // Set the new loop
            const beatLengthSeconds = 60 / state.bpm;
            const loopDuration = beats * beatLengthSeconds;
            
            if (deck.wavesurfer) {
                const currentTime = deck.wavesurfer.getCurrentTime();
                deck.wavesurfer.setLoopPoints(currentTime, currentTime + loopDuration);
            }
            
            // Highlight active loop pad
            document.querySelectorAll('.loop-pad').forEach(p => {
                if (p.dataset.beats === e.target.dataset.beats && p !== e.target) {
                    p.classList.remove('active');
                }
            });
            
            e.target.classList.add('active');
            
            state.currentLoops[activeDeck] = {
                beats: beats,
                pad: e.target
            };
        });
    });
}

function setupSamplePads(samples) {
    document.querySelectorAll('.sample-pad').forEach(pad => {
        pad.addEventListener('click', (e) => {
            const sample = e.target.dataset.sample;
            if (samples[sample]) {
                samples[sample].start();
            }
        });
    });
}