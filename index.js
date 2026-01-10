const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const DATA_FILE = path.join(__dirname, 'panels.json');

// Daten laden oder leeres Array erstellen
let panels = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        panels = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        panels = [];
    }
}

// Hilfsfunktion: Speichern
const saveItems = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(panels, null, 2));
};

// --- PANEL VERWALTUNG (AUTH MIDDLEWARE WIRD VORRAUSGESETZT) ---

app.get('/panels', (req, res) => {
    // req.user.id kommt von deinem Firebase Middleware
    const userPanels = panels.filter(p => p.ownerUserId === req.user.id);
    res.json({
        panels: userPanels.map(p => ({
            id: p.id,
            name: p.name,
            key: p.panelKey
        }))
    });
});

app.post('/panels/create', (req, res) => {
    const newPanel = {
        id: Date.now(),
        ownerUserId: req.user.id,
        name: req.body.name || "Neues Panel",
        panelKey: crypto.randomBytes(16).toString('hex'), // Sicherer Key
        commandQueue: []
    };
    panels.push(newPanel);
    saveItems();
    res.json({ success: true, panel: { id: newPanel.id, name: newPanel.name, key: newPanel.panelKey } });
});

// --- ROBLOX API (KEIN AUTH) ---

app.get('/api/:panelKey/command/next', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel || !panel.commandQueue || panel.commandQueue.length === 0) {
        return res.json({ command: "none" });
    }
    res.json({ command: panel.commandQueue[0] });
});

app.post('/api/:panelKey/command/add', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel not found" });
    
    panel.commandQueue.push(req.body.command);
    saveItems();
    res.json({ success: true });
});

app.post('/api/:panelKey/command/done', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (panel && panel.commandQueue.length > 0) {
        panel.commandQueue.shift();
        saveItems();
    }
    res.json({ success: true });
});

// WICHTIG FÜR RENDER: Port muss über process.env.PORT kommen
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
