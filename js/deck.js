import * as Tone from 'tone';
import WaveSurfer from 'wavesurfer.js';

export function setupDeck(deckId, state, audio) {
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
    deck.player = new Tone.Player().connect(audio.fxChain);
    
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
    deck.player.chain(deck.eqLow, deck.eqMid, deck.eqHigh, deck.filterNode, audio.fxChain);
    
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
    
    return deck;
}