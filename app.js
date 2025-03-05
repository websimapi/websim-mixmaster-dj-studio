import * as Tone from 'tone';
import WaveSurfer from 'wavesurfer.js';

// Initialize audio context
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Tone.start();
        console.log('Audio context started');
        initializeDJ();
    } catch (error) {
        console.error('Could not start audio context:', error);
    }
});

function initializeDJ() {
    // State management
    const state = {
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

    // Create Audio Nodes
    const masterOutput = new Tone.Volume(0).toDestination();
    const analyzer = Tone.getContext().createAnalyser();
    analyzer.fftSize = 2048;
    
    // Effect chain
    const effects = {
        delay: new Tone.FeedbackDelay(0.25, 0.5),
        reverb: new Tone.Reverb(2),
        flanger: new Tone.Chorus(4, 2.5, 0.5),
        bitcrush: new Tone.BitCrusher(4)
    };
    
    // Turn off all effects initially
    Object.values(effects).forEach(effect => effect.wet.value = 0);
    
    // FX Chain
    const fxChain = new Tone.Chain(
        effects.delay,
        effects.reverb,
        effects.flanger,
        effects.bitcrush,
        masterOutput
    );
    
    // Initialize decks
    function setupDeck(deckId) {
        const deck = state[deckId];
        
        // Create WaveSurfer instance
        deck.wavesurfer = WaveSurfer.create({
            container: `#waveform-${deckId.slice(-1)}`,
            waveColor: '#6c6c6c',
            progressColor: deckId === 'deckA' ? '#ff5500' : '#00bfff',
            cursorColor: 'transparent',
            barWidth: 2,
            barGap: 1,
            height: 80,
            responsive: true
        });
        
        // Create Tone.js Player
        deck.player = new Tone.Player().connect(fxChain);
        
        // Setup EQ
        deck.eqHigh = new Tone.Filter(0, "highshelf");
        deck.eqMid = new Tone.Filter(0, "peaking");
        deck.eqLow = new Tone.Filter(0, "lowshelf");
        
        deck.eqHigh.frequency.value = 2000;
        deck.eqMid.frequency.value = 500;
        deck.eqLow.frequency.value = 250;
        
        // Filter
        deck.filterNode = new Tone.Filter(20000, "lowpass");
        
        // Connect the player through EQ and filter
        deck.player.chain(deck.eqLow, deck.eqMid, deck.eqHigh, deck.filterNode, fxChain);
        
        // Setup track loading
        document.getElementById(`load-track-${deckId.slice(-1)}`).addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const objectUrl = URL.createObjectURL(file);
            
            deck.wavesurfer.load(objectUrl);
            
            // Display the track name
            const deckHeader = document.querySelector(`#deck-${deckId.slice(-1)} .deck-header h2`);
            deckHeader.textContent = `DECK ${deckId.slice(-1).toUpperCase()}: ${file.name.slice(0, 20)}${file.name.length > 20 ? '...' : ''}`;
            
            // Setup Tone.js player with the same audio
            deck.player.load(objectUrl).then(() => {
                deck.loaded = true;
                console.log(`Track loaded in deck ${deckId.slice(-1).toUpperCase()}`);
                
                // Start animation for turntable
                const rotationIndicator = document.querySelector(`#deck-${deckId.slice(-1)} .rotation-indicator`);
                rotationIndicator.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
            });
        });
        
        // Set initial volume
        deck.player.volume.value = Tone.gainToDb(deck.volume);
    }
    
    setupDeck('deckA');
    setupDeck('deckB');
    
    // Play/Pause handler
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
    
    // BPM control
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
        updateCrossfader();
    });
    
    function updateCrossfader() {
        // Logarithmic crossfading for more natural transitions
        const gainA = Math.cos(state.crossfaderValue * Math.PI / 2);
        const gainB = Math.cos((1 - state.crossfaderValue) * Math.PI / 2);
        
        state.deckA.player.volume.value = Tone.gainToDb(state.deckA.volume * gainA);
        state.deckB.player.volume.value = Tone.gainToDb(state.deckB.volume * gainB);
    }
    
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
    
    // FX Section
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
    
    // Loop Pads
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
    
    // Sample pads with drum sounds
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
    
    document.querySelectorAll('.sample-pad').forEach(pad => {
        pad.addEventListener('click', (e) => {
            const sample = e.target.dataset.sample;
            if (samples[sample]) {
                samples[sample].start();
            }
        });
    });
    
    // Initialize visualizer
    const canvas = document.getElementById('visualizer-canvas');
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Audio visualization
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        
        analyzer.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw spectrum analyzer
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            
            // Gradient based on frequency
            const hue = i / bufferLength * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    drawVisualizer();
    
    // Connect Tone.js to our analyzer
    Tone.connect(masterOutput, analyzer);
    
    // Set initial BPM
    Tone.Transport.bpm.value = state.bpm;
}

