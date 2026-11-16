// Demo scene: 10 seconds, vertical, no sound. It exists to show the engine:
// a piece entering, a pose and a face changing, letters arriving, a part spinning,
// camera moves (a slow push, a punch-in, a shake) and the sheet tearing between shots.
// The text is placeholder. Copy this file and change everything.
export default {
  width: 1080, height: 1920, fps: 12, jitter: 1,
  shots: [
    {
      duration: 3.5,
      background: { color: "navy", seed: 3 },
      layers: [
        { type: "band", y: 1480, height: 500, color: "coffee" },
        { type: "art", name: "window", x: 80, y: 340, scale: 1.05 },
        { id: "clock", type: "art", name: "clock", x: 730, y: 390, scale: 0.82 },
        { id: "dev", type: "character", name: "dev", face: "happy", x: 210, y: 690, scale: 1.65 },
        { type: "art", name: "mug", x: 640, y: 1250, scale: 0.95 },
        { type: "text", text: "FRIDAY", place: "title", size: 104, ransom: "", at: 0.15, arrive: "drop" },
        { type: "text", text: "5:59 PM. ALL QUIET.", place: "caption", size: 54, strip: "black", tilt: -1.5, at: 1.0 },
      ],
      actions: [
        { at: 0, target: "clock", part: "minute-hand", spin: 300, duration: 3.2 },
        { at: 1.9, target: "dev", pose: "wave", face: "laughing" },
        { at: 0, target: "camera", zoom: 1.12, on: "dev", duration: 3.5, ease: "linear" },
      ],
    },
    {
      duration: 3.4, transition: "tear",
      background: { color: "red", seed: 5 },
      layers: [
        { type: "band", y: 1500, height: 480, color: "coffee" },
        { id: "dev", type: "character", name: "dev", face: "neutral", x: 540, y: 800, scale: 1.5 },
        { id: "boss", type: "character", name: "boss", face: "happy", pose: "point", x: -20, y: 780, scale: 1.5, at: 0.7, enter: "slide-left" },
        { type: "art", name: "speech-bubble", x: 150, y: 330, scale: 1.55, at: 1.2, enter: "pop" },
        { type: "text", text: "DEPLOY?", x: 414, y: 524, size: 78, anchor: "middle", tilt: -3, fixed: false, at: 1.2, arrive: "none" },
        { type: "art", name: "drop", x: 930, y: 760, scale: 1, rotate: 14, at: 1.6, enter: "pop" },
        { type: "text", text: "JUST A QUICK DEPLOY", place: "caption", size: 52, strip: "cream", tilt: 1.2, at: 1.7 },
      ],
      actions: [
        { at: 1.0, target: "dev", face: "suspicious" },
        { at: 1.6, target: "dev", face: "scared", pose: "shrug", hop: 1 },
        { at: 1.6, target: "camera", zoom: 1.5, on: "dev.head", duration: 0.25, ease: "punch" },
      ],
    },
    {
      duration: 3.3, transition: "tear",
      background: { color: "purple", seed: 2 },
      layers: [
        { type: "band", y: 1500, height: 480, color: "coffee" },
        { type: "art", name: "moon", x: 60, y: 330, scale: 0.85 },
        { id: "server", type: "art", name: "server", x: 610, y: 950, scale: 1.4 },
        { id: "fire", type: "art", name: "fire", x: 720, y: 690, scale: 1.5, at: 0.9, enter: "pop", jitter: 3 },
        { id: "dev", type: "character", name: "dev", face: "tired", pose: "slump", x: 60, y: 800, scale: 1.5 },
        { type: "art", name: "anger", x: 470, y: 720, scale: 0.75, at: 1.5, enter: "pop" },
        { type: "text", text: "11:40 PM", place: "title", size: 104, ransom: "white,cream,yellow", at: 0.3, arrive: "drop" },
        { type: "text", text: "QUICK.", place: "caption", size: 70, strip: "red", tilt: -2, at: 1.7 },
      ],
      actions: [
        { at: 0.9, target: "server", shake: 0.5 },
        { at: 1.5, target: "dev", face: "angry", pose: "scold" },
        { at: 0.9, target: "camera", shake: 0.4 },
        { at: 1.5, target: "camera", zoom: 1.4, on: "dev.head", duration: 0.25, ease: "punch" },
        { at: 2.2, target: "camera", zoom: 1.6, duration: 1.1, ease: "linear" },
      ],
    },
  ],
};
