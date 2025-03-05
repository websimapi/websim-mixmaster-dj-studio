import { initializeAudio } from './audioEngine.js';
import { setupUI } from './interface.js';
import { setupVisualizer } from './visualizer.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const { state, audio } = await initializeAudio();
        setupUI(state, audio);
        setupVisualizer(audio.analyzer);
    } catch (error) {
        console.error('Could not initialize application:', error);
    }
});

