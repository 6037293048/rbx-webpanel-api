const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const DB_FILE = "database.json";

function loadDB() {
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Root (Test)
app.get("/", (req, res) => {
  res.send("API läuft ✅");
});

// Panel erstellen
app.post("/api/create-panel", (req, res) => {
  const db = loadDB();
  const key = uuidv4();

  db.panels[key] = { created: Date.now() };
  db.commands[key] = [];

  saveDB(db);
  res.json({ panelKey: key });
});

// Command senden (Carrd)
app.post("/api/:panelKey/command/send", (req, res) => {
  const { panelKey } = req.params;
  const { command } = req.body;

  const db = loadDB();
  if (!db.panels[panelKey]) {
    return res.status(403).json({ error: "Invalid panel key" });
  }

  db.commands[panelKey].push({
    id: uuidv4(),
    command,
    done: false
  });

  saveDB(db);
  res.json({ ok: true });
});

// Command abrufen (Roblox)
app.get("/api/:panelKey/command/next", (req, res) => {
  const { panelKey } = req.params;
  const db = loadDB();

  if (!db.commands[panelKey]) return res.json({});

  const cmd = db.commands[panelKey].find(c => !c.done);
  if (!cmd) return res.json({});

  res.json(cmd);
});

// Command als erledigt markieren
app.post("/api/:panelKey/command/done", (req, res) => {
  const { panelKey } = req.params;
  const { id } = req.body;

  const db = loadDB();
  const cmds = db.commands[panelKey];
  if (!cmds) return res.status(404).end();

  const cmd = cmds.find(c => c.id === id);
  if (cmd) cmd.done = true;

  saveDB(db);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("API läuft auf http://localhost:" + PORT);
});
