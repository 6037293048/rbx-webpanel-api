const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const DATA_FILE = './panels.json';

// Daten laden
let panels = [];
if (fs.existsSync(DATA_FILE)) {
    panels = JSON.parse(fs.readFileSync(DATA_FILE));
}

// Hilfsfunktion zum Speichern
const saveItems = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(panels, null, 2));
};

// --- PANEL MANAGEMENT ---

// Panel Details abrufen (Inklusive der Buttons)
app.get('/panels/details/:panelKey', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel nicht gefunden" });
    
    // Falls das Array noch nicht existiert, erstellen wir es kurz
    if (!panel.buttons) panel.buttons = [];
    
    res.json({
        name: panel.name,
        key: panel.panelKey,
        buttons: panel.buttons
    });
});

// Button hinzufügen
app.post('/panels/:panelKey/buttons/add', (req, res) => {
    const { label, cmdId } = req.body;
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    
    if (panel) {
        if (!panel.buttons) panel.buttons = [];
        panel.buttons.push({ label, cmdId });
        saveItems();
        res.json({ success: true });
    } else {
        res.status(404).send();
    }
});

// BUTTON LÖSCHEN (DIESE ROUTE FEHLTE WAHRSCHEINLICH)
app.post('/panels/:panelKey/buttons/delete', (req, res) => {
    const { index } = req.body;
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    
    if (panel && panel.buttons && panel.buttons[index] !== undefined) {
        panel.buttons.splice(index, 1);
        saveItems();
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Button nicht gefunden" });
    }
});

// --- COMMAND SYSTEM (ROBLOX) ---

// Befehl hinzufügen (Web -> Server)
app.post('/api/:panelKey/command/add', (req, res) => {
    const { command } = req.body;
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    
    if (panel) {
        if (!panel.commandQueue) panel.commandQueue = [];
        panel.commandQueue.push({ command, timestamp: Date.now() });
        saveItems();
        res.json({ success: true });
    } else {
        res.status(404).send();
    }
});

// Nächsten Befehl abrufen (Roblox -> Server)
app.get('/api/:panelKey/command/next', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (panel && panel.commandQueue && panel.commandQueue.length > 0) {
        res.json(panel.commandQueue[0]);
    } else {
        res.json({ command: "none" });
    }
});

// Befehl löschen wenn fertig (Roblox -> Server)
app.post('/api/:panelKey/command/done', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (panel && panel.commandQueue && panel.commandQueue.length > 0) {
        panel.commandQueue.shift();
        saveItems();
        res.json({ success: true });
    } else {
        res.json({ success: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
