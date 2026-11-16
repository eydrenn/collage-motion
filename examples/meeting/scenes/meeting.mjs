// The narrated example: one scene in three languages. Each scenes/meeting-<lang>/scene.mjs calls make(<lang>).
const LANGS = {
  en: {
    words: { minute: "minute", take: "take", happy: "happy", shares: "shares", boss: "boss", someone: "someone", question: "question", nobody: "nobody", asleep: "asleep", schedule: "schedule", end: "follow-up" },
    text: { title: "5-MINUTE MEETING", titleSize: 64, topsSize: 56, tops: "FIVE MINUTES. TOPS.", minute: "MINUTE", screen: "CAN YOU SEE MY SCREEN?", silence: "SILENCE.", end: "FOLLOW-UP." },
  },
  "pt-BR": {
    words: { minute: "minuto", take: "levar", happy: "feliz", shares: "compartilha", boss: "chefe", someone: "alguém", question: "pergunta", nobody: "ninguém", asleep: "dormiu", schedule: "marcar", end: "outra" },
    text: { title: "REUNIÃO DE 5 MINUTOS", titleSize: 54, topsSize: 54, tops: "CINCO MINUTOS. NO MÁXIMO.", minute: "MINUTO", screen: "TÃO VENDO MINHA TELA?", silence: "SILÊNCIO.", end: "OUTRA REUNIÃO." },
  },
  es: {
    words: { minute: "minuto", take: "durar", happy: "contentos", shares: "comparte", boss: "jefe", someone: "alguien", question: "pregunta", nobody: "nadie", asleep: "dormido", schedule: "programar", end: "otra" },
    text: { title: "REUNIÓN DE 5 MINUTOS", titleSize: 54, topsSize: 51, tops: "CINCO MINUTOS. COMO MUCHO.", minute: "MINUTO", screen: "¿SE VE MI PANTALLA?", silence: "SILENCIO.", end: "OTRA REUNIÓN." },
  },
};

export default function make(lang) {
  const { words: w, text: t } = LANGS[lang];
  const at = (key, shift = "") => `word:${w[key]}${shift}`;
  const cut = (n) => `word:${w.minute}#${n}-0.1`;
  return {
    width: 1080, height: 1920, fps: 12, jitter: 1,
    sound: { narration: `audio/${lang}.mp3`, words: `audio/${lang}.json` },
    shots: [
      {
        until: cut(1),
        background: { color: "teal", seed: 4 },
        layers: [
          { type: "band", y: 1500, height: 480, color: "coffee" },
          { type: "art", name: "clock", x: 700, y: 420, scale: 0.85 },
          { id: "boss", type: "character", name: "boss", face: "happy", x: 120, y: 790, scale: 1.5 },
          { type: "text", text: t.title, place: "title", size: t.titleSize, ransom: "", at: 0.1, arrive: "drop" },
          { type: "text", text: t.tops, place: "caption", size: t.topsSize, strip: "black", tilt: -1.5, at: 0.6 },
        ],
        actions: [
          { at: at("take"), target: "boss", pose: "present", face: "smug" },
          { at: 0, target: "camera", zoom: 1.1, on: "boss", duration: 2.4, ease: "linear" },
        ],
      },
      {
        until: cut(2),
        background: { color: "yellow", seed: 2 },
        layers: [
          { type: "band", y: 1500, height: 480, color: "coffee" },
          { id: "ana", type: "character", name: "ana", face: "happy", x: 10, y: 960, scale: 1.15 },
          { id: "dev", type: "character", name: "dev", face: "happy", x: 365, y: 960, scale: 1.15 },
          { id: "intern", type: "character", name: "intern", face: "happy", x: 720, y: 960, scale: 1.15 },
          { type: "art", name: "sparkle", x: 420, y: 700, scale: 0.9, at: at("happy"), enter: "pop" },
          { type: "text", text: `${t.minute} 1`, place: "title", size: 104, ransom: "", arrive: "drop" },
        ],
        actions: [
          { at: at("happy"), target: "ana", pose: "cheer", face: "laughing", hop: 1 },
          { at: at("happy", "+0.15"), target: "dev", pose: "wave", face: "excited", hop: 1 },
          { at: at("happy", "+0.3"), target: "intern", pose: "arms-out", face: "laughing", hop: 1 },
        ],
      },
      {
        until: cut(3), transition: "tear",
        background: { color: "navy", seed: 6 },
        layers: [
          { type: "band", y: 1500, height: 480, color: "graphite" },
          { id: "monitor", type: "art", name: "monitor", x: 560, y: 640, scale: 1.2 },
          { id: "boss", type: "character", name: "boss", face: "happy", pose: "present", x: 40, y: 790, scale: 1.5 },
          { type: "text", text: `${t.minute} 10`, place: "title", size: 104, ransom: "white,cream,yellow", at: 0.5, arrive: "drop" },
          { type: "text", text: t.screen, place: "caption", size: 52, strip: "cream", tilt: 1.2, at: at("boss") },
        ],
        actions: [
          { at: at("shares"), target: "monitor", shake: 0.3 },
          { at: at("shares"), target: "boss", pose: "point", face: "excited" },
          { at: at("shares"), target: "camera", zoom: 1.15, x: 560, y: 1050, duration: 1.2, ease: "out" },
        ],
      },
      {
        until: cut(4),
        background: { color: "moss", seed: 8 },
        layers: [
          { type: "band", y: 1500, height: 480, color: "coffee" },
          { id: "client", type: "character", name: "client", face: "neutral", x: 30, y: 870, scale: 1.3 },
          { type: "art", name: "question", x: 480, y: 740, scale: 1.1, at: at("question"), enter: "pop" },
          { id: "dev", type: "character", name: "dev", face: "neutral", x: 640, y: 960, scale: 1.15 },
          { type: "text", text: `${t.minute} 30`, place: "title", size: 104, ransom: "", arrive: "drop" },
          { type: "text", text: t.silence, place: "caption", size: 64, strip: "black", tilt: 1.5, at: at("nobody") },
        ],
        actions: [
          { at: at("someone"), target: "client", pose: "point-up", face: "thinking" },
          { at: at("question"), target: "dev", face: "worried" },
          { at: at("nobody"), target: "dev", pose: "shrug", face: "confused" },
          { at: at("nobody"), target: "client", pose: "idle", face: "suspicious" },
          { at: at("nobody"), target: "camera", zoom: 1.25, on: "dev", duration: 0.25, ease: "punch" },
        ],
      },
      {
        until: cut(5), transition: "tear",
        background: { color: "purple", seed: 3 },
        layers: [
          { type: "band", y: 1500, height: 480, color: "graphite" },
          { type: "art", name: "moon", x: 640, y: 330, scale: 0.8 },
          { id: "intern", type: "character", name: "intern", face: "tired", pose: "slump", x: 220, y: 800, scale: 1.5 },
          { type: "art", name: "mug", x: 700, y: 1260, scale: 0.9 },
          { type: "art", name: "zzz", x: 640, y: 640, scale: 1, at: at("asleep"), enter: "pop", jitter: 3 },
          { type: "text", text: `${t.minute} 50`, place: "title", size: 104, ransom: "white,cream,yellow", at: 0.5, arrive: "drop" },
        ],
        actions: [
          { at: at("asleep"), target: "intern", face: "asleep", pose: "look-down" },
          { at: 0.5, target: "camera", zoom: 1.3, on: "intern.head", duration: 2.4, ease: "in-out" },
        ],
      },
      {
        duration: 4.8,
        background: { color: "red", seed: 5 },
        layers: [
          { type: "band", y: 1500, height: 480, color: "coffee" },
          { type: "art", name: "calendar", x: 700, y: 600, scale: 0.85, at: at("schedule"), enter: "pop" },
          { id: "boss", type: "character", name: "boss", face: "tired", x: 30, y: 790, scale: 1.5 },
          { id: "ana", type: "character", name: "ana", face: "neutral", x: 620, y: 960, scale: 1.15, at: 0.4, enter: "slide-right" },
          { type: "text", text: `${t.minute} 60`, place: "title", size: 104, ransom: "", arrive: "drop" },
          { type: "text", text: t.end, place: "caption", size: 72, strip: "black", tilt: -2, at: at("end") },
        ],
        actions: [
          { at: at("schedule"), target: "boss", pose: "present", face: "smug" },
          { at: at("end"), target: "ana", pose: "facepalm", face: "shocked" },
          { at: at("end"), target: "camera", shake: 0.4 },
          { at: at("end"), target: "camera", zoom: 1.2, x: 560, y: 1100, duration: 0.25, ease: "punch" },
        ],
      },
    ],
  };
}
