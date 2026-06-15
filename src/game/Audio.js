/* ==========================================================================
   AUDIO.JS - DYNAMIC PROCEDURAL AUDIO SYNTHESIZER (WEB AUDIO API)
   ========================================================================== */

export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = null;
        this.filterNode = null;
        this.muted = false;
        
        // Music sequencing properties
        this.musicIntervalId = null;
        this.currentBeat = 0;
        this.tempo = 120; // BPM
        this.chordProgression = [
            [130.81, 155.56, 196.00, 233.08], // Cm7 (C3, Eb3, G3, Bb3)
            [146.83, 174.61, 220.00, 261.63], // Dm7 (D3, F3, A3, C4)
            [116.54, 138.59, 174.61, 207.65], // Bbm7 (Bb2, Db3, F3, Ab3)
            [130.81, 164.81, 196.00, 246.94]  // Cmaj7 (C3, E3, G3, B3)
        ];
        this.currentChordIndex = 0;
    }

    init() {
        if (this.ctx) return;
        
        try {
            // Lazy initialization on first user click to bypass browser autoplay policy
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
            
            // Master Gain Node
            this.masterVolume = this.ctx.createGain();
            this.masterVolume.gain.value = this.muted ? 0 : 0.35;
            
            // Master Low-pass Filter for low health or paused states
            this.filterNode = this.ctx.createBiquadFilter();
            this.filterNode.type = 'lowpass';
            this.filterNode.frequency.value = 20000; // default fully open
            
            // Connect: Source -> Filter -> Master -> Destination
            this.filterNode.connect(this.masterVolume);
            this.masterVolume.connect(this.ctx.destination);
            
        } catch (e) {
            console.error("Web Audio API is not supported in this browser:", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterVolume) {
            this.masterVolume.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
        }
        return this.muted;
    }

    applyLowPassFilter(enabled) {
        if (!this.ctx || !this.filterNode) return;
        
        const targetFreq = enabled ? 300 : 20000;
        this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.15);
    }

    playLaser() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.filterNode);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playHit() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gain);
        gain.connect(this.filterNode);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playExplosion() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const duration = 0.5;
        
        // Synthesize noise for explosion crash
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Low-pass filter specifically for explosion bass rumble
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(300, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(10, now + duration);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.filterNode);
        
        noise.start(now);
        noise.stop(now + duration);
        
        // Add a low-frequency oscillator hum for impact
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(100, now);
        subOsc.frequency.linearRampToValueAtTime(30, now + duration);
        
        subGain.gain.setValueAtTime(0.4, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        subOsc.connect(subGain);
        subGain.connect(this.filterNode);
        
        subOsc.start(now);
        subOsc.stop(now + duration);
    }

    playShieldBreak() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const duration = 0.4;
        
        // Glassy high metallic frequency sound
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, now);
        osc1.frequency.linearRampToValueAtTime(600, now + duration);
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1777, now);
        osc2.frequency.linearRampToValueAtTime(200, now + duration);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.filterNode);
        
        osc1.start(now);
        osc2.start(now);
        
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    playLevelUp() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        
        notes.forEach((freq, i) => {
            const noteTime = now + (i * 0.08);
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteTime);
            
            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(0.12, noteTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.35);
            
            osc.connect(gain);
            gain.connect(this.filterNode);
            
            osc.start(noteTime);
            osc.stop(noteTime + 0.38);
        });
    }

    playPowerUp() {
        this.init();
        this.resume();
        if (!this.ctx || this.muted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(gain);
        gain.connect(this.filterNode);
        
        osc.start(now);
        osc.stop(now + 0.25);
    }

    startMusic() {
        this.init();
        this.resume();
        if (!this.ctx) return;
        
        this.stopMusic(); // Clear any existing loops
        
        const noteDuration = 60 / this.tempo / 2; // 8th notes
        this.musicIntervalId = setInterval(() => {
            if (this.muted || !this.ctx) return;
            
            const now = this.ctx.currentTime;
            
            // Change chords every 16 beats
            if (this.currentBeat % 16 === 0) {
                this.currentChordIndex = (this.currentChordIndex + 1) % this.chordProgression.length;
            }
            
            const chord = this.chordProgression[this.currentChordIndex];
            
            // Arpeggiate chord notes based on beat
            const chordNote = chord[this.currentBeat % chord.length];
            const octaveShift = (this.currentBeat % 8 < 4) ? 1 : 2; // Shift up/down octave
            const freq = chordNote * octaveShift;
            
            // Create synth note
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            // Alternating wave types for richness
            osc.type = (this.currentBeat % 2 === 0) ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            // Mellow plucky envelope
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration * 0.9);
            
            osc.connect(gain);
            gain.connect(this.filterNode);
            
            osc.start(now);
            osc.stop(now + noteDuration);
            
            this.currentBeat++;
        }, noteDuration * 1000);
    }

    stopMusic() {
        if (this.musicIntervalId) {
            clearInterval(this.musicIntervalId);
            this.musicIntervalId = null;
        }
        this.currentBeat = 0;
    }
}
export const audio = new AudioManager();
