import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./style.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ||
  (location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://secret-doodle-production.up.railway.app");

const socket = io(SERVER_URL, { autoConnect: false, transports: ["websocket", "polling"] });

const PACKS = [
  { id: "soft", label: "Fun tranquille", emoji: "🌈" },
  { id: "chaos", label: "Chaos entre potes", emoji: "🔥" },
  { id: "weird", label: "Absurdoodle", emoji: "🛸" },
  { id: "school", label: "École", emoji: "🎒" },
  { id: "gaming", label: "Gaming", emoji: "🎮" },
  { id: "mixed", label: "Méga mix", emoji: "🎲" },
];
const REACTIONS = ["😂", "💀", "😱", "🔥", "🤡", "👀", "🎨", "🚨"];
const FUNNY_VOTES = ["😂 Trop drôle", "🎨 Chef-d’œuvre", "💀 Malaise", "🧠 200 IQ", "🤡 N’importe quoi"];

function App() {
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState(localStorage.getItem("sd_name") || "");
  const [joinCode, setJoinCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState(false);
  const [drawTask, setDrawTask] = useState(null);
  const [submittedDrawing, setSubmittedDrawing] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [voted, setVoted] = useState(false);
  const [result, setResult] = useState(null);
  const [funnyVote, setFunnyVote] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    socket.connect();
    socket.on("connect", () => { setConnected(true); setPlayerId(socket.id); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("room:update", (nextRoom) => setRoom(nextRoom));
    socket.on("question:personal", ({ question }) => { setQuestion(question); setAnswer(""); setSubmittedAnswer(false); setDrawTask(null); setReveal(null); setResult(null); });
    socket.on("draw:task", (task) => { setDrawTask(task); setSubmittedDrawing(false); });
    socket.on("guess:reveal", (data) => { setReveal(data); setVoted(false); setResult(null); setFunnyVote(""); });
    socket.on("guess:result", (data) => setResult(data));
    socket.on("game:results", () => { setReveal(null); setResult(null); });
    socket.on("room:reaction", (data) => {
      const item = { ...data, id: Date.now() + Math.random() };
      setFloatingReactions((prev) => [...prev.slice(-8), item]);
      setTimeout(() => setFloatingReactions((prev) => prev.filter((x) => x.id !== item.id)), 2200);
    });
    return () => socket.removeAllListeners();
  }, []);

  const isHost = room?.hostId === playerId;
  const me = room?.players?.find((p) => p.id === playerId);
  const everyoneReady = room?.players?.length >= 2 && room.players.every((p) => p.ready);

  function validName() {
    const clean = name.trim();
    if (clean.length < 2) { setError("Mets un pseudo avec au moins 2 lettres."); return null; }
    localStorage.setItem("sd_name", clean); setError(""); return clean;
  }
  function createRoom() {
    const clean = validName(); if (!clean) return;
    socket.emit("room:create", { name: clean }, (res) => {
      if (!res?.ok) return setError(res?.error || "Erreur création room.");
      setPlayerId(res.playerId || socket.id);
    });
  }
  function joinRoom() {
    const clean = validName(); if (!clean) return;
    const code = joinCode.trim().toUpperCase(); if (!code) return setError("Mets le code de la room.");
    socket.emit("room:join", { code, name: clean }, (res) => {
      if (!res?.ok) return setError(res?.error || "Impossible de rejoindre.");
      setPlayerId(res.playerId || socket.id);
    });
  }
  function updateSettings(next) {
    socket.emit("room:settings", { code: room.code, settings: { ...room.settings, ...next } }, (res) => {
      if (!res?.ok) setError("Impossible de modifier les options.");
    });
  }
  function toggleReady() { socket.emit("player:ready", { code: room.code }); }
  function startGame() { socket.emit("game:start", { code: room.code }, (res) => !res?.ok && setError(res.error)); }
  function submitAnswer(e) {
    e.preventDefault(); if (!answer.trim()) return;
    socket.emit("answer:submit", { code: room.code, answer: answer.trim() }, (res) => res?.ok && setSubmittedAnswer(true));
  }
  function submitDrawing(image) { socket.emit("draw:submit", { code: room.code, image }, (res) => res?.ok && setSubmittedDrawing(true)); }
  function vote(id) {
    socket.emit("guess:vote", { code: room.code, guessedId: id, funnyVote }, (res) => {
      if (res?.ok) setVoted(true); else setError(res?.error || "Vote impossible.");
    });
  }
  function resetGame() { socket.emit("game:reset", { code: room.code }); }
  function sendChat(e) {
    e.preventDefault();
    if (!chatMessage.trim() || !room) return;
    socket.emit("room:chat", { code: room.code, message: chatMessage.trim() });
    setChatMessage("");
  }
  function sendReaction(reaction) {
    if (!room) return;
    socket.emit("room:reaction", { code: room.code, reaction });
  }
  function loadGallery() {
    if (!room) return;
    socket.emit("gallery:get", { code: room.code }, (res) => {
      if (res?.ok) setGallery(res.gallery || []);
    });
  }

  return <div className="app">
    <div className="stars" /><div className="orb one" /><div className="orb two" />
    <header className="hero">
      <div className="brand"><span className="brandIcon">✦</span><div><div className="logo">Secret Doodle</div><p>Dessine. Devine. Survis au malaise.</p></div></div>
      <span className={connected ? "pill ok" : "pill"}>{connected ? "Serveur connecté" : "Connexion..."}</span>
    </header>
    {error && <div className="toast" onClick={() => setError("")}>{error}</div>}
    <div className="reactionLayer">{floatingReactions.map((r) => <div className="floatReaction" key={r.id}><b>{r.reaction}</b><small>{r.name}</small></div>)}</div>

    {!room && <main className="panel home">
      <div className="tag">Party game multijoueur</div>
      <h1>Crée une room et balance les secrets.</h1>
      <p className="muted">Réponds à une question, dessine la réponse de quelqu’un, puis devine à qui appartient le secret.</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton pseudo" maxLength={18} />
      <div className="split">
        <button onClick={createRoom}>Créer une room</button>
        <div className="joinBox"><input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={5} /><button onClick={joinRoom}>Rejoindre</button></div>
      </div>
      <div className="featureGrid"><span>🎭 Réponses pièges</span><span>🏆 1 à 10 rounds</span><span>😂 votes bonus</span><span>🛸 questions absurdes</span><span>💬 mini chat</span><span>⚡ événements chaos</span><span>🖼 galerie finale</span><span>🎮 pack gaming</span></div>
    </main>}

    {room?.phase === "lobby" && <main className="panel lobby">
      <div className="roomTop"><div><h1>Room <span>{room.code}</span></h1><p className="muted">Partage ce code à tes potes.</p></div><div className="roundBadge">{room.players.length}/10 joueurs</div></div>
      {isHost && <Settings settings={room.settings} onChange={updateSettings} />}
      <PlayerList room={room} playerId={playerId} />
      <ReactionBar onReact={sendReaction} />
      <ChatBox room={room} value={chatMessage} setValue={setChatMessage} onSubmit={sendChat} />
      <div className="actions">
        <button className={me?.ready ? "readyBtn" : ""} onClick={toggleReady}>{me?.ready ? "Pas prêt" : "Je suis prêt"}</button>
        {isHost && everyoneReady && <button className="start" onClick={startGame}>Lancer la partie</button>}
      </div>
      {isHost && !everyoneReady && <p className="muted center">Le bouton lancer apparaît quand tout le monde est prêt. Minimum 2 joueurs.</p>}
    </main>}

    {room?.phase === "answer" && <main className="panel phase">
      <PhaseHeader room={room} label="Question secrète" />
      <Timer endsAt={room.phaseEndsAt} />
      {room.roundEvent && <div className="eventCard"><b>⚡ {room.roundEvent.title}</b><span>{room.roundEvent.desc}</span></div>}
      <div className="question">{question || "Chargement de ta question..."}</div>
      {!submittedAnswer ? <form onSubmit={submitAnswer}>
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Réponds franchement... ou très bizarrement 😈" maxLength={180} />
        <div className="miniInfo">{answer.length}/180 caractères</div>
        <button>Envoyer ma réponse</button>
      </form> : <Waiting text={`Réponse envoyée. ${room.answerCount}/${room.players.length} joueurs ont répondu.`} />}
    </main>}

    {room?.phase === "draw" && <main className="panel phase wide">
      <PhaseHeader room={room} label="Dessine la réponse" />
      <Timer endsAt={room.phaseEndsAt} />
      {room.roundEvent && <div className="eventCard"><b>⚡ {room.roundEvent.title}</b><span>{room.roundEvent.desc}</span></div>}
      {drawTask && <div className="drawTask"><small>{drawTask.question}</small><b>{drawTask.answer}</b><em>Défi bonus : {drawTask.challenge}</em></div>}
      {!submittedDrawing ? <CanvasBoard onSubmit={submitDrawing} /> : <Waiting text={`Dessin envoyé. ${room.drawingCount}/${room.players.length} artistes ont terminé.`} />}
    </main>}

    {room?.phase === "guess" && reveal && <main className="panel phase wide">
      <PhaseHeader room={room} label={`Reveal ${room.currentRevealIndex + 1}/${room.revealsCount}`} />
      <div className="revealGrid">
        <div className="artCard"><img className="drawing" src={reveal.image} alt="Dessin" /><p className="answerReveal">“{reveal.answer}”</p><small>Défi : {reveal.challenge}</small></div>
        <div className="voteBox">
          <p>Dessin par <b>{reveal.drawerName}</b></p>
          {result ? <div className="result">C’était à <b>{result.correctOwnerName}</b> !<FunnySummary summary={result.funnySummary} /></div> : voted ? <div className="waiting compact"><div className="loader" /><p>Vote envoyé...</p></div> : <>
            <div className="funnyVotes">{FUNNY_VOTES.map(v => <button type="button" className={funnyVote === v ? "chip active" : "chip"} onClick={() => setFunnyVote(v)} key={v}>{v}</button>)}</div>
            {room.players.filter((p) => p.id !== reveal.drawerId).map((p) => <button key={p.id} onClick={() => vote(p.id)}>{p.name}</button>)}
            {room.settings.fakeAnswer && <button onClick={() => vote("FAKE_AI")}>🤖 Réponse piège</button>}
          </>}
        </div>
      </div>
    </main>}

    {room?.phase === "results" && <main className="panel phase">
      <h1>Résultats finaux</h1><p className="muted center">Le chaos est terminé. Pour l’instant.</p>
      <div className="scoreList">{[...room.players].sort((a, b) => b.score - a.score).map((p, i) => <div className="score" key={p.id}><span>#{i + 1} {p.name}<small>{p.badges?.join(" ")}</small></span><b>{p.score} pts</b></div>)}</div>
      <button onClick={loadGallery}>Afficher la galerie des dessins ({room.galleryCount})</button>
      {gallery.length > 0 && <Gallery items={gallery} />}
      {isHost && <button className="start" onClick={resetGame}>Retour lobby</button>}
    </main>}
  </div>;
}

function Settings({ settings, onChange }) {
  return <div className="settings megaSettings">
    <div><label>Rounds</label><select value={settings.rounds} onChange={(e) => onChange({ rounds: Number(e.target.value) })}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} round{n>1 ? "s" : ""}</option>)}</select></div>
    <div><label>Pack</label><select value={settings.pack} onChange={(e) => onChange({ pack: e.target.value })}>{PACKS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}</select></div>
    <div><label>Temps réponse</label><select value={settings.answerTimer} onChange={(e) => onChange({ answerTimer: Number(e.target.value) })}>{[30,45,60,90,120,180,240].map(n => <option key={n} value={n}>{n}s</option>)}</select></div>
    <div><label>Temps dessin</label><select value={settings.drawTimer} onChange={(e) => onChange({ drawTimer: Number(e.target.value) })}>{[45,60,90,120,180,240,300].map(n => <option key={n} value={n}>{n}s</option>)}</select></div>
    <label className="toggle"><input type="checkbox" checked={settings.fakeAnswer} onChange={(e) => onChange({ fakeAnswer: e.target.checked })} /> Réponse piège</label>
    <label className="toggle"><input type="checkbox" checked={settings.bonusVotes} onChange={(e) => onChange({ bonusVotes: e.target.checked })} /> Votes bonus</label>
    <label className="toggle"><input type="checkbox" checked={settings.chaosEvents} onChange={(e) => onChange({ chaosEvents: e.target.checked })} /> Événements chaos</label>
  </div>;
}

function Timer({ endsAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  if (!endsAt) return null;
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const min = String(Math.floor(left / 60)).padStart(2, "0");
  const sec = String(left % 60).padStart(2, "0");
  return <div className={left <= 10 ? "timer danger" : "timer"}>⏳ {min}:{sec}</div>;
}

function ReactionBar({ onReact }) {
  return <div className="reactionBar">{REACTIONS.map((r) => <button className="chip" key={r} onClick={() => onReact(r)}>{r}</button>)}</div>;
}

function ChatBox({ room, value, setValue, onSubmit }) {
  return <div className="chatBox">
    <div className="chatMessages">{room.chat?.length ? room.chat.map((m) => <p key={m.id}><b>{m.name}</b> {m.message}</p>) : <p className="muted">Mini chat de room...</p>}</div>
    <form onSubmit={onSubmit} className="chatForm"><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Message rapide..." maxLength={120} /><button>Envoyer</button></form>
  </div>;
}

function FunnySummary({ summary }) {
  const entries = Object.entries(summary || {});
  if (!entries.length) return null;
  return <div className="funnySummary">{entries.map(([k,v]) => <span key={k}>{k} ×{v}</span>)}</div>;
}

function Gallery({ items }) {
  return <div className="gallery">{items.map((g, i) => <div className="galleryItem" key={i}><img src={g.image} alt="Dessin" /><b>Round {g.round} — {g.drawerName}</b><small>Secret : {g.answer}</small></div>)}</div>;
}

function PhaseHeader({ room, label }) { return <div className="phaseHead"><div><span className="tag">Round {room.round}/{room.totalRounds}</span><h1>{label}</h1></div><div className="roundBadge">{room.roundTitle}</div></div>; }
function PlayerList({ room, playerId }) { return <div className="players">{room.players.map((p) => <div className="player" key={p.id}><div className="avatar">{p.name.slice(0, 1).toUpperCase()}</div><div><b>{p.name}</b>{room.hostId === p.id && <small> Host</small>}{playerId === p.id && <small> Toi</small>}</div><span className={p.ready ? "status ready" : "status"}>{p.ready ? "PRÊT" : "PAS PRÊT"}</span></div>)}</div>; }
function Waiting({ text }) { return <div className="waiting"><div className="loader" /><p>{text}</p></div>; }

function CanvasBoard({ onSubmit }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const history = useRef([]);
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(6);
  const [eraser, setEraser] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    saveHistory();
  }, []);

  function saveHistory() {
    const c = canvasRef.current;
    if (!c) return;
    history.current.push(c.toDataURL("image/png"));
    if (history.current.length > 18) history.current.shift();
  }
  function restore(data) {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0); };
    img.src = data;
  }
  function undo() {
    if (history.current.length <= 1) return;
    history.current.pop();
    restore(history.current[history.current.length - 1]);
  }
  function pos(e) { const canvas = canvasRef.current; const rect = canvas.getBoundingClientRect(); const touch = e.touches?.[0]; return { x: ((touch?.clientX ?? e.clientX) - rect.left) * (canvas.width / rect.width), y: ((touch?.clientY ?? e.clientY) - rect.top) * (canvas.height / rect.height) }; }
  function down(e) { drawing.current = true; last.current = pos(e); saveHistory(); }
  function move(e) { if (!drawing.current) return; e.preventDefault(); const canvas = canvasRef.current; const ctx = canvas.getContext("2d"); const p = pos(e); ctx.strokeStyle = eraser ? "#0b1020" : color; ctx.lineWidth = eraser ? size * 2 : size; ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last.current = p; }
  function up() { drawing.current = false; }
  function clear() { saveHistory(); const c = canvasRef.current; const ctx = c.getContext("2d"); ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, c.width, c.height); }
  function send() { onSubmit(canvasRef.current.toDataURL("image/png")); }
  const palette = ["#ffffff", "#00d4ff", "#8c52ff", "#ff4ecd", "#41ff9a", "#ffd166", "#ff6578", "#111827"];
  return <div className="canvasWrap">
    <canvas ref={canvasRef} width="900" height="520" onMouseDown={down} onMouseMove={move} onMouseUp={up} onMouseLeave={up} onTouchStart={down} onTouchMove={move} onTouchEnd={up} />
    <div className="palette">{palette.map((c) => <button key={c} className="colorDot" style={{ background: c }} onClick={() => { setColor(c); setEraser(false); }} />)}</div>
    <div className="tools"><input type="color" value={color} onChange={(e) => { setColor(e.target.value); setEraser(false); }} /><input type="range" min="2" max="26" value={size} onChange={(e) => setSize(Number(e.target.value))} /><button className={eraser ? "chip active" : ""} onClick={() => setEraser(!eraser)}>Gomme</button><button onClick={undo}>Undo</button><button onClick={clear}>Effacer</button><button className="start" onClick={send}>Envoyer le dessin</button></div>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
