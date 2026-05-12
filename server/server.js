const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.get("/", (req, res) => res.send("Secret Doodle PRO server is running."));
app.get("/health", (req, res) => res.json({ ok: true, game: "Secret Doodle PRO" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 5e6,
});

const PORT = process.env.PORT || 3001;
const rooms = new Map();

const PACKS = {
  soft: {
    label: "Fun tranquille",
    questions: [
      "C’est quoi ta pire bêtise ?",
      "C’est quoi ton plat préféré ?",
      "C’est quoi ton animal préféré ?",
      "C’est quoi ton rêve le plus bizarre ?",
      "C’est quoi le métier que tu voulais faire petit ?",
      "C’est quoi ton objet préféré chez toi ?",
      "C’est quoi ton super-pouvoir inutile ?",
      "C’est quoi ta pire excuse ?",
      "C’est quoi ton plus gros fou rire ?",
      "C’est quoi ton film ou dessin animé honteux préféré ?",
      "C’est quoi le pire cadeau que tu as déjà reçu ?",
      "C’est quoi un truc que tu fais quand personne ne regarde ?",
      "C’est quoi ton bruit préféré ?",
      "C’est quoi ton snack de survie ?",
      "C’est quoi ta chanson plaisir coupable ?",
      "C’est quoi ta pire coupe de cheveux ?",
      "C’est quoi ton talent nul mais impressionnant ?",
      "C’est quoi ton meilleur souvenir entre potes ?",
    ],
  },
  chaos: {
    label: "Chaos entre potes",
    questions: [
      "C’est quoi ton plus gros moment de honte ?",
      "C’est quoi ton mensonge le plus nul ?",
      "C’est quoi ta pire catastrophe en public ?",
      "C’est quoi le truc le plus bizarre dans ton historique mental ?",
      "C’est quoi ton pire achat ?",
      "C’est quoi ton message le plus gênant envoyé par erreur ?",
      "C’est quoi une chose que tu nies mais que tout le monde sait ?",
      "C’est quoi ton pire souvenir à l’école ?",
      "C’est quoi ta phobie la plus ridicule ?",
      "C’est quoi un truc que tu as déjà cassé en faisant semblant de rien ?",
      "C’est quoi ta pire technique pour esquiver quelqu’un ?",
      "C’est quoi le moment où tu as voulu disparaître ?",
      "C’est quoi le pire surnom qu’on pourrait te donner ?",
      "C’est quoi ton plus gros bug humain ?",
      "C’est quoi une décision que tu regrettes instantanément ?",
    ],
  },
  weird: {
    label: "Absurdoodle",
    questions: [
      "Si tu étais un meuble, tu serais quoi et pourquoi ?",
      "Quel objet pourrait ruiner ta vie s’il parlait ?",
      "Quel aliment te représenterait le mieux ?",
      "Si ton cerveau avait une musique d’attente, ce serait quoi ?",
      "Quelle créature bizarre pourrait devenir ton animal de compagnie ?",
      "Quel crime un grille-pain pourrait commettre ?",
      "À quoi ressemblerait ton double maléfique ?",
      "Quelle règle absurde tu mettrais dans ton royaume ?",
      "Si ton sac pouvait raconter un secret, ce serait quoi ?",
      "Quelle phrase dramatique dirais-tu avant de tomber d’une chaise ?",
      "Si les chaussettes avaient un chef, qui serait-ce ?",
      "Dessine mentalement ta vie sous forme de pizza : elle ressemble à quoi ?",
    ],
  },
  school: {
    label: "École & souvenirs",
    questions: [
      "C’est quoi ta pire punition ?",
      "C’est quoi ton excuse la plus éclatée pour un devoir oublié ?",
      "C’est quoi le moment le plus gênant en classe ?",
      "C’est quoi le truc le plus drôle arrivé en récré ?",
      "C’est quoi ton pire contrôle surprise ?",
      "C’est quoi ton objet indispensable dans ton sac ?",
      "C’est quoi la matière qui te transforme en zombie ?",
      "C’est quoi la pire présentation orale de ta vie ?",
      "C’est quoi une phrase de prof que tu n’oublieras jamais ?",
      "C’est quoi ton plus gros fou rire interdit ?",
    ],
  },
  gaming: {
    label: "Gaming & internet",
    questions: [
      "C’est quoi ta plus grosse rage en jeu ?",
      "C’est quoi ton pseudo le plus honteux ?",
      "C’est quoi ton pire fail en vocal ?",
      "C’est quoi ton jeu confort ?",
      "C’est quoi le skin que tu assumes pas ?",
      "C’est quoi le moment où tu t’es cru trop fort et t’as perdu ?",
      "C’est quoi ton pire achat virtuel ?",
      "C’est quoi la pire excuse après une défaite ?",
      "C’est quoi ton plus grand exploit nul ?",
      "C’est quoi ton emoji qui te représente ?",
    ],
  },
};

const DOODLE_CHALLENGES = [
  "Interdiction d’écrire des mots dans le dessin.",
  "Dessine avec seulement 3 détails importants.",
  "Ajoute une étoile cachée dans ton dessin.",
  "Ton dessin doit avoir l’air dramatique.",
  "Ajoute un personnage paniqué.",
  "Fais comme si c’était une affiche de film.",
  "Ajoute un objet totalement inutile.",
  "Dessine ça comme une scène de crime ridicule.",
  "Ajoute un mini monstre quelque part.",
  "Fais le dessin comme si tout explosait.",
];

const ROUND_TITLES = [
  "Round des petits secrets",
  "Round du malaise contrôlé",
  "Round des artistes du désastre",
  "Round du chaos organisé",
  "Round final des cerveaux grillés",
  "Round du complot des crayons",
  "Round panique au tableau",
  "Round révélation impossible",
];

const ROUND_EVENTS = [
  { id: "normal", title: "Round normal", desc: "Pas de piège. Enfin presque." },
  { id: "no_words", title: "Silence total", desc: "Le dessin sans mots est fortement conseillé." },
  { id: "drama", title: "Cinéma dramatique", desc: "Ton dessin doit ressembler à une scène de film." },
  { id: "tiny", title: "Mini détail caché", desc: "Ajoute un minuscule détail secret." },
  { id: "monster", title: "Monstre obligatoire", desc: "Cache un petit monstre quelque part." },
  { id: "meme", title: "Mode mème", desc: "Rends le dessin aussi ridicule que possible." },
  { id: "sus", title: "Tout le monde est suspect", desc: "Fais croire que la réponse appartient à quelqu’un d’autre." },
];

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? makeRoomCode() : code;
}
function cleanName(name) { return String(name || "Joueur").trim().slice(0, 18) || "Joueur"; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || min)); }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function currentPack(room) { return PACKS[room.settings.pack] || PACKS.soft; }
function allQuestions() { return Object.values(PACKS).flatMap((p) => p.questions); }

function publicRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    players: room.players.map((p) => ({ id: p.id, name: p.name, ready: p.ready, score: p.score, badges: p.badges })),
    settings: room.settings,
    round: room.round,
    roundTitle: ROUND_TITLES[(room.round - 1) % ROUND_TITLES.length],
    currentRevealIndex: room.currentRevealIndex,
    revealsCount: room.drawings.length,
    answerCount: room.responses.length,
    drawingCount: room.drawings.length,
    totalRounds: room.settings.rounds,
    roundEvent: room.roundEvent,
    phaseEndsAt: room.phaseEndsAt,
    chat: room.chat.slice(-12),
    galleryCount: room.gallery.length,
  };
}
function emitRoom(room) { io.to(room.code).emit("room:update", publicRoom(room)); }
function findPlayerRoom(socketId) {
  for (const room of rooms.values()) if (room.players.some((p) => p.id === socketId)) return room;
  return null;
}
function everyoneReady(room) { return room.players.length >= 2 && room.players.every((p) => p.ready); }
function everyoneAnswered(room) { return room.responses.length === room.players.length; }
function everyoneDrawn(room) { return room.drawings.length === room.players.length; }
function votesNeeded(room) {
  const current = room.drawings[room.currentRevealIndex];
  if (!current) return 0;
  return room.players.filter((p) => p.id !== current.drawerId).length;
}
function makeQuestions(room) {
  const source = room.settings.pack === "mixed" ? allQuestions() : currentPack(room).questions;
  const packQuestions = shuffle(source);
  return room.players.map((_, i) => packQuestions[(i + room.round - 1) % packQuestions.length]);
}
function setPhaseTimer(room, seconds) {
  room.phaseEndsAt = seconds ? Date.now() + seconds * 1000 : null;
}
function assignDrawings(room) {
  const responses = shuffle(room.responses);
  const players = room.players;
  room.drawTasks = new Map();
  for (let i = 0; i < players.length; i++) {
    let response = responses[i % responses.length];
    if (response.ownerId === players[i].id && responses.length > 1) response = responses[(i + 1) % responses.length];
    room.drawTasks.set(players[i].id, { ...response, challenge: DOODLE_CHALLENGES[(i + room.round) % DOODLE_CHALLENGES.length] });
  }
}
function startRound(room) {
  room.phase = "answer";
  room.responses = [];
  room.drawings = [];
  room.votes = [];
  room.currentRevealIndex = 0;
  room.questions = new Map();
  room.drawTasks = new Map();
  room.roundEvent = room.settings.chaosEvents ? ROUND_EVENTS[(room.round - 1) % ROUND_EVENTS.length] : ROUND_EVENTS[0];
  setPhaseTimer(room, room.settings.answerTimer);
  const qs = makeQuestions(room);
  room.players.forEach((p, index) => room.questions.set(p.id, qs[index]));
  emitRoom(room);
  room.players.forEach((p) => io.to(p.id).emit("question:personal", { question: room.questions.get(p.id), round: room.round, title: publicRoom(room).roundTitle }));
}
function finishGame(room) {
  room.phase = "results";
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  if (sorted[0]) sorted[0].badges.push("👑 Roi/Reine du malaise");
  if (sorted[1]) sorted[1].badges.push("🥈 Presque légende");
  if (sorted[2]) sorted[2].badges.push("🥉 Doodle solide");
  emitRoom(room);
  io.to(room.code).emit("game:results", publicRoom(room));
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ name }, cb) => {
    const code = makeRoomCode();
    const room = {
      code,
      phase: "lobby",
      hostId: socket.id,
      round: 1,
      currentRevealIndex: 0,
      players: [{ id: socket.id, name: cleanName(name), ready: false, score: 0, badges: [] }],
      settings: { rounds: 5, pack: "chaos", fakeAnswer: true, bonusVotes: true, chaosEvents: true, answerTimer: 90, drawTimer: 120 },
      roundEvent: ROUND_EVENTS[0],
      phaseEndsAt: null,
      chat: [],
      gallery: [],
      questions: new Map(),
      responses: [],
      drawTasks: new Map(),
      drawings: [],
      votes: [],
    };
    rooms.set(code, room);
    socket.join(code);
    cb?.({ ok: true, code, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("room:join", ({ code, name }, cb) => {
    const room = rooms.get(String(code || "").trim().toUpperCase());
    if (!room) return cb?.({ ok: false, error: "Room introuvable." });
    if (room.phase !== "lobby") return cb?.({ ok: false, error: "La partie a déjà commencé." });
    if (room.players.length >= 10) return cb?.({ ok: false, error: "Room pleine." });
    room.players.push({ id: socket.id, name: cleanName(name), ready: false, score: 0, badges: [] });
    socket.join(room.code);
    cb?.({ ok: true, code: room.code, playerId: socket.id });
    emitRoom(room);
  });

  socket.on("room:settings", ({ code, settings }, cb) => {
    const room = rooms.get(code);
    if (!room || socket.id !== room.hostId || room.phase !== "lobby") return cb?.({ ok: false });
    const nextPack = settings?.pack === "mixed" || PACKS[settings?.pack] ? settings.pack : room.settings.pack;
    room.settings = {
      rounds: clamp(settings?.rounds ?? room.settings.rounds, 1, 10),
      pack: nextPack,
      fakeAnswer: Boolean(settings?.fakeAnswer),
      bonusVotes: Boolean(settings?.bonusVotes),
      chaosEvents: Boolean(settings?.chaosEvents),
      answerTimer: clamp(settings?.answerTimer ?? room.settings.answerTimer, 30, 240),
      drawTimer: clamp(settings?.drawTimer ?? room.settings.drawTimer, 45, 300),
    };
    emitRoom(room);
    cb?.({ ok: true });
  });

  socket.on("room:chat", ({ code, message }) => {
    const room = rooms.get(code);
    const player = room?.players.find((p) => p.id === socket.id);
    if (!room || !player) return;
    const clean = String(message || "").trim().slice(0, 120);
    if (!clean) return;
    room.chat.push({ id: Date.now() + Math.random(), name: player.name, message: clean });
    emitRoom(room);
  });

  socket.on("room:reaction", ({ code, reaction }) => {
    const room = rooms.get(code);
    const player = room?.players.find((p) => p.id === socket.id);
    if (!room || !player) return;
    io.to(room.code).emit("room:reaction", { name: player.name, reaction: String(reaction || "✨").slice(0, 8) });
  });

  socket.on("player:ready", ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.phase !== "lobby") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    player.ready = !player.ready;
    emitRoom(room);
  });

  socket.on("game:start", ({ code }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb?.({ ok: false, error: "Room introuvable." });
    if (room.hostId !== socket.id) return cb?.({ ok: false, error: "Seul l’host peut lancer." });
    if (!everyoneReady(room)) return cb?.({ ok: false, error: "Tous les joueurs doivent être prêts. Minimum 2 joueurs." });
    room.round = 1;
    room.gallery = [];
    room.players.forEach((p) => { p.score = 0; p.badges = []; });
    startRound(room);
    cb?.({ ok: true });
  });

  socket.on("answer:submit", ({ code, answer }, cb) => {
    const room = rooms.get(code);
    if (!room || room.phase !== "answer") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player || room.responses.some((r) => r.ownerId === socket.id)) return;
    room.responses.push({ ownerId: socket.id, ownerName: player.name, question: room.questions.get(socket.id), answer: String(answer || "").trim().slice(0, 180) });
    cb?.({ ok: true });
    emitRoom(room);
    if (everyoneAnswered(room)) {
      if (room.settings.fakeAnswer) {
        room.responses.push({ ownerId: "FAKE_AI", ownerName: "Réponse piège", question: "Question bonus", answer: "J’ai volé un nugget imaginaire et je l’ai caché sous mon oreiller." });
      }
      assignDrawings(room);
      room.phase = "draw";
      setPhaseTimer(room, room.settings.drawTimer);
      emitRoom(room);
      room.players.forEach((p) => {
        const task = room.drawTasks.get(p.id);
        io.to(p.id).emit("draw:task", { question: task.question, answer: task.answer, challenge: task.challenge, round: room.round });
      });
    }
  });

  socket.on("draw:submit", ({ code, image }, cb) => {
    const room = rooms.get(code);
    if (!room || room.phase !== "draw") return;
    const task = room.drawTasks.get(socket.id);
    const drawer = room.players.find((p) => p.id === socket.id);
    if (!task || !drawer || room.drawings.some((d) => d.drawerId === socket.id)) return;
    const drawingEntry = { drawerId: socket.id, drawerName: drawer.name, ownerId: task.ownerId, ownerName: task.ownerName, question: task.question, answer: task.answer, challenge: task.challenge, round: room.round, eventTitle: room.roundEvent?.title || "", image };
    room.drawings.push(drawingEntry);
    room.gallery.push(drawingEntry);
    cb?.({ ok: true });
    emitRoom(room);
    if (everyoneDrawn(room)) {
      room.drawings = shuffle(room.drawings);
      room.phase = "guess";
      setPhaseTimer(room, null);
      room.currentRevealIndex = 0;
      room.votes = [];
      emitRoom(room);
      io.to(room.code).emit("guess:reveal", room.drawings[0]);
    }
  });

  socket.on("guess:vote", ({ code, guessedId, funnyVote }, cb) => {
    const room = rooms.get(code);
    if (!room || room.phase !== "guess") return;
    const current = room.drawings[room.currentRevealIndex];
    if (!current) return;
    if (socket.id === current.drawerId) return cb?.({ ok: false, error: "Tu ne votes pas sur ton propre dessin." });
    if (room.votes.some((v) => v.voterId === socket.id && v.revealIndex === room.currentRevealIndex)) return;
    const correct = guessedId === current.ownerId;
    if (correct) {
      const voter = room.players.find((p) => p.id === socket.id);
      const drawer = room.players.find((p) => p.id === current.drawerId);
      if (voter) voter.score += current.ownerId === "FAKE_AI" ? 150 : 100;
      if (drawer) drawer.score += 50;
    }
    if (room.settings.bonusVotes && funnyVote) {
      const drawer = room.players.find((p) => p.id === current.drawerId);
      if (drawer) drawer.score += 10;
    }
    room.votes.push({ revealIndex: room.currentRevealIndex, voterId: socket.id, guessedId, correct, funnyVote: funnyVote || "" });
    cb?.({ ok: true });
    emitRoom(room);
    const currentVotes = room.votes.filter((v) => v.revealIndex === room.currentRevealIndex).length;
    if (currentVotes >= votesNeeded(room)) {
      const revealVotes = room.votes.filter((v) => v.revealIndex === room.currentRevealIndex);
      const funnySummary = revealVotes.reduce((acc, v) => { if (v.funnyVote) acc[v.funnyVote] = (acc[v.funnyVote] || 0) + 1; return acc; }, {});
      io.to(room.code).emit("guess:result", { correctOwnerId: current.ownerId, correctOwnerName: current.ownerName, votes: revealVotes, funnySummary });
      setTimeout(() => {
        room.currentRevealIndex += 1;
        if (room.currentRevealIndex >= room.drawings.length) {
          if (room.round < room.settings.rounds) {
            room.round += 1;
            startRound(room);
          } else {
            finishGame(room);
          }
        } else {
          emitRoom(room);
          io.to(room.code).emit("guess:reveal", room.drawings[room.currentRevealIndex]);
        }
      }, 3500);
    }
  });

  socket.on("game:reset", ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id) return;
    room.phase = "lobby";
    room.round = 1;
    room.players.forEach((p) => { p.ready = false; p.score = 0; p.badges = []; });
    room.gallery = []; room.phaseEndsAt = null; room.roundEvent = ROUND_EVENTS[0];
    room.questions.clear(); room.responses = []; room.drawings = []; room.drawTasks.clear(); room.votes = []; room.currentRevealIndex = 0;
    emitRoom(room);
  });

  socket.on("gallery:get", ({ code }, cb) => {
    const room = rooms.get(code);
    if (!room || !room.players.some((p) => p.id === socket.id)) return cb?.({ ok: false, gallery: [] });
    cb?.({ ok: true, gallery: room.gallery });
  });

  socket.on("disconnect", () => {
    const room = findPlayerRoom(socket.id);
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== socket.id);
    if (room.players.length === 0) return rooms.delete(room.code);
    if (room.hostId === socket.id) room.hostId = room.players[0].id;
    emitRoom(room);
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Secret Doodle PRO server running on ${PORT}`));
