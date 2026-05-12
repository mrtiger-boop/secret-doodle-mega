import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import "./style.css";

const SERVER_URL = "https://secret-doodle-mega.onrender.com";

const socket = io(SERVER_URL, {
  autoConnect: false,
});

function App() {
  const [connected, setConnected] = useState(false);

  const [name, setName] = useState(
    localStorage.getItem("sd_name") || ""
  );

  const [joinCode, setJoinCode] = useState("");

  const [playerId, setPlayerId] = useState("");

  const [room, setRoom] = useState(null);

  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");

  const [answer, setAnswer] = useState("");

  const [submittedAnswer, setSubmittedAnswer] =
    useState(false);

  const [drawTask, setDrawTask] = useState(null);

  const [submittedDrawing, setSubmittedDrawing] =
    useState(false);

  const [reveal, setReveal] = useState(null);

  const [voted, setVoted] = useState(false);

  const [result, setResult] = useState(null);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      setPlayerId(socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("room:update", (data) => {
      setRoom(data);
    });

    socket.on("question:personal", ({ question }) => {
      setQuestion(question);
      setSubmittedAnswer(false);
      setAnswer("");
    });

    socket.on("draw:task", (task) => {
      setDrawTask(task);
      setSubmittedDrawing(false);
    });

    socket.on("guess:reveal", (data) => {
      setReveal(data);
      setResult(null);
      setVoted(false);
    });

    socket.on("guess:result", (data) => {
      setResult(data);
    });

    return () => {
      socket.removeAllListeners();
    };
  }, []);

  const settings = room?.settings || {
    rounds: 5,
    answerTime: 60,
    drawTime: 90,
    pack: "mega",
    trapAnswer: true,
    chaosEvents: true,
  };

  const isHost = room?.hostId === playerId;

  const me = room?.players?.find(
    (p) => p.id === playerId
  );

  const everyoneReady =
    room?.players?.length >= 2 &&
    room.players.every((p) => p.ready);

  function validName() {
    const clean = name.trim();

    if (clean.length < 2) {
      setError("Pseudo invalide.");
      return null;
    }

    localStorage.setItem("sd_name", clean);

    return clean;
  }

  function createRoom() {
    const clean = validName();

    if (!clean) return;

    socket.emit(
      "room:create",
      {
        name: clean,
      },
      (res) => {
        if (!res?.ok) {
          setError(res?.error || "Erreur.");
          return;
        }

        setPlayerId(res.playerId || socket.id);
      }
    );
  }

  function joinRoom() {
    const clean = validName();

    if (!clean) return;

    const code = joinCode.trim().toUpperCase();

    if (!code) {
      setError("Mets un code.");
      return;
    }

    socket.emit(
      "room:join",
      {
        code,
        name: clean,
      },
      (res) => {
        if (!res?.ok) {
          setError(res?.error || "Impossible.");
          return;
        }

        setPlayerId(res.playerId || socket.id);
      }
    );
  }

  function toggleReady() {
    socket.emit("player:ready", {
      code: room.code,
    });
  }

  function startGame() {
    socket.emit(
      "game:start",
      {
        code: room.code,
      },
      (res) => {
        if (!res?.ok) {
          setError(res?.error || "Erreur.");
        }
      }
    );
  }

  function submitAnswer(e) {
    e.preventDefault();

    if (!answer.trim()) return;

    socket.emit(
      "answer:submit",
      {
        code: room.code,
        answer,
      },
      (res) => {
        if (res?.ok) {
          setSubmittedAnswer(true);
        }
      }
    );
  }

  function submitDrawing(image) {
    socket.emit(
      "draw:submit",
      {
        code: room.code,
        image,
      },
      (res) => {
        if (res?.ok) {
          setSubmittedDrawing(true);
        }
      }
    );
  }

  function vote(id) {
    socket.emit(
      "guess:vote",
      {
        code: room.code,
        guessedId: id,
      },
      (res) => {
        if (res?.ok) {
          setVoted(true);
        }
      }
    );
  }

  return (
    <div className="app">
      <div className="stars" />

      <header className="hero">
        <div className="logo">
          Secret Doodle MEGA
        </div>

        <p>
          Dessine. Devine. Survis au malaise.
        </p>

        <span
          className={
            connected ? "pill ok" : "pill"
          }
        >
          {connected
            ? "Serveur connecté"
            : "Connexion..."}
        </span>
      </header>

      {error && (
        <div
          className="toast"
          onClick={() => setError("")}
        >
          {error}
        </div>
      )}

      {!room && (
        <main className="panel home">
          <h1>
            Créer ou rejoindre une room
          </h1>

          <input
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Ton pseudo"
            maxLength={18}
          />

          <div className="split">
            <button onClick={createRoom}>
              Créer une room
            </button>

            <div className="joinBox">
              <input
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="CODE"
                maxLength={5}
              />

              <button onClick={joinRoom}>
                Rejoindre
              </button>
            </div>
          </div>
        </main>
      )}

      {room?.phase === "lobby" && (
        <main className="panel lobby">
          <h1>
            Room {room.code}
          </h1>

          <div className="settingsBox">
            <div>
              Rounds : {settings.rounds}
            </div>

            <div>
              Pack : {settings.pack}
            </div>

            <div>
              Chaos :
              {settings.chaosEvents
                ? " ON"
                : " OFF"}
            </div>
          </div>

          <div className="players">
            {room.players.map((p) => (
              <div
                className="player"
                key={p.id}
              >
                <div className="avatar">
                  {p.name[0]}
                </div>

                <div>
                  <b>{p.name}</b>
                </div>

                <span
                  className={
                    p.ready
                      ? "status ready"
                      : "status"
                  }
                >
                  {p.ready
                    ? "PRÊT"
                    : "PAS PRÊT"}
                </span>
              </div>
            ))}
          </div>

          <div className="actions">
            <button
              onClick={toggleReady}
            >
              {me?.ready
                ? "Pas prêt"
                : "Je suis prêt"}
            </button>

            {isHost &&
              everyoneReady && (
                <button
                  className="start"
                  onClick={startGame}
                >
                  Lancer
                </button>
              )}
          </div>
        </main>
      )}

      {room?.phase === "answer" && (
        <main className="panel phase">
          <h1>Question secrète</h1>

          <div className="question">
            {question}
          </div>

          {!submittedAnswer ? (
            <form
              onSubmit={submitAnswer}
            >
              <textarea
                value={answer}
                onChange={(e) =>
                  setAnswer(
                    e.target.value
                  )
                }
                placeholder="Ta réponse..."
              />

              <button>
                Envoyer
              </button>
            </form>
          ) : (
            <div className="waiting">
              Attente des autres...
            </div>
          )}
        </main>
      )}

      {room?.phase === "draw" && (
        <main className="panel phase">
          <h1>Dessine</h1>

          {drawTask && (
            <div className="drawTask">
              <small>
                {drawTask.question}
              </small>

              <b>
                {drawTask.answer}
              </b>
            </div>
          )}

          {!submittedDrawing ? (
            <CanvasBoard
              onSubmit={
                submitDrawing
              }
            />
          ) : (
            <div className="waiting">
              Attente des dessins...
            </div>
          )}
        </main>
      )}

      {room?.phase === "guess" &&
        reveal && (
          <main className="panel phase">
            <h1>
              À qui appartient
              cette réponse ?
            </h1>

            <img
              className="drawing"
              src={reveal.image}
            />

            <p>
              "{reveal.answer}"
            </p>

            {!voted &&
              room.players
                .filter(
                  (p) =>
                    p.id !==
                    reveal.drawerId
                )
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      vote(p.id)
                    }
                  >
                    {p.name}
                  </button>
                ))}

            {result && (
              <div className="result">
                C’était :
                {
                  result.correctOwnerName
                }
              </div>
            )}
          </main>
        )}

      {room?.phase === "results" && (
        <main className="panel phase">
          <h1>Résultats</h1>

          {[...room.players]
            .sort(
              (a, b) =>
                b.score - a.score
            )
            .map((p) => (
              <div
                className="score"
                key={p.id}
              >
                {p.name} : {p.score}
              </div>
            ))}
        </main>
      )}
    </div>
  );
}

function CanvasBoard({
  onSubmit,
}) {
  const canvasRef = useRef(null);

  const drawing = useRef(false);

  const last = useRef({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext("2d");

    ctx.fillStyle = "#111827";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, []);

  function pos(e) {
    const canvas =
      canvasRef.current;

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        (e.clientX -
          rect.left) *
        (canvas.width /
          rect.width),

      y:
        (e.clientY -
          rect.top) *
        (canvas.height /
          rect.height),
    };
  }

  function down(e) {
    drawing.current = true;

    last.current = pos(e);
  }

  function move(e) {
    if (!drawing.current) return;

    const canvas =
      canvasRef.current;

    const ctx =
      canvas.getContext("2d");

    const p = pos(e);

    ctx.strokeStyle =
      "#ffffff";

    ctx.lineWidth = 5;

    ctx.lineCap = "round";

    ctx.beginPath();

    ctx.moveTo(
      last.current.x,
      last.current.y
    );

    ctx.lineTo(p.x, p.y);

    ctx.stroke();

    last.current = p;
  }

  function up() {
    drawing.current = false;
  }

  function send() {
    onSubmit(
      canvasRef.current.toDataURL(
        "image/png"
      )
    );
  }

  return (
    <div className="canvasWrap">
      <canvas
        ref={canvasRef}
        width="900"
        height="500"
        onMouseDown={down}
        onMouseMove={move}
        onMouseUp={up}
        onMouseLeave={up}
      />

      <button
        className="start"
        onClick={send}
      >
        Envoyer le dessin
      </button>
    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);