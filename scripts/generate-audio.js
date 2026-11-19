'use strict';

// Música e efeitos sintetizados localmente — sem amostras de terceiros,
// portanto livres para uso comercial no vídeo do Cuco.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const output = path.join(root, 'videos', 'audio-linkedin.wav');
const rate = 44100;
const seconds = 75;
const frames = rate * seconds;
const left = new Float32Array(frames);
const right = new Float32Array(frames);

const notes = {
  C3: 130.81, E3: 164.81, G3: 196.00, A3: 220.00,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.00, A4: 440.00, B4: 493.88, C5: 523.25,
};

const chords = [
  ['C3', 'E3', 'G3', 'C4'],
  ['A3', 'C4', 'E4', 'A4'],
  ['F4', 'A3', 'C4', 'F4'].map((n) => notes[n] ? n : 'F3'),
  ['G3', 'B4', 'D4', 'G4'].map((n) => notes[n] ? n : 'G4'),
];

function tone(freq, time, duration, volume, type = 'pad') {
  const start = Math.floor(time * rate);
  const length = Math.floor(duration * rate);
  for (let i = 0; i < length && start + i < frames; i++) {
    const t = i / rate;
    const attack = Math.min(1, t / 0.35);
    const release = Math.min(1, (duration - t) / 0.6);
    const env = Math.max(0, attack * release);
    const wave = type === 'bell'
      ? Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(4 * Math.PI * freq * t)
      : Math.sin(2 * Math.PI * freq * t) + 0.18 * Math.sin(4 * Math.PI * freq * t);
    const value = wave * env * volume;
    left[start + i] += value;
    right[start + i] += value * 0.97;
  }
}

// proceededura: pad de acordes + arpeggio suave
for (let bar = 0; bar < 15; bar++) {
  const start = bar * 5;
  const chord = chords[bar % chords.length];
  for (const name of chord) {
    if (notes[name]) tone(notes[name], start, 5, 0.022, 'pad');
  }
  const arp = [chord[0], chord[2], chord[1], chord[3]];
  for (let step = 0; step < 8; step++) {
    const name = arp[step % arp.length];
    if (notes[name]) tone(notes[name] * 2, start + step * 0.625, 0.55, 0.012, 'bell');
  }
}

// efeitos: pop suave no início de cada cena
const sceneStarts = [0, 3, 15, 28, 41, 54, 67];
for (const at of sceneStarts) {
  const start = Math.floor(at * rate);
  const length = Math.floor(0.22 * rate);
  for (let i = 0; i < length && start + i < frames; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 22);
    const sweep = 520 + 900 * t;
    const value = Math.sin(2 * Math.PI * sweep * t) * env * 0.07;
    left[start + i] += value;
    right[start + i] += value;
  }
}

// fade global e normalização leve
for (let i = 0; i < frames; i++) {
  const fadeIn = Math.min(1, i / (rate * 1.2));
  const fadeOut = Math.min(1, (frames - i) / (rate * 1.8));
  const gain = fadeIn * fadeOut;
  left[i] = Math.max(-1, Math.min(1, left[i] * gain));
  right[i] = Math.max(-1, Math.min(1, right[i] * gain));
}

const dataSize = frames * 4;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(rate, 24);
buffer.writeUInt32LE(rate * 4, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);
for (let i = 0; i < frames; i++) {
  buffer.writeInt16LE(Math.round(left[i] * 32767), 44 + i * 4);
  buffer.writeInt16LE(Math.round(right[i] * 32767), 46 + i * 4);
}
fs.writeFileSync(output, buffer);
console.log('Áudio gerado:', output, `${seconds}s`);
