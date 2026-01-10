const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// In-Memory Speicher (geht bei Render-Neustart verloren)
// Für Persistenz könnte man hier fs.writeFileSync nutzen.
let panels = []; 

// Hilfsfunktion zum Finden eines Panels per Key
const getPanelByKey = (key) => panels.find(p => p.panelKey === key);

// --- PANEL VERWALTUNG (AUTH ERFORDERLICH) ---

// 1. Alle Panels des Users abrufen
app.get('/panels', (req, res) => {
    const userPanels = panels.filter(p => p.ownerUserId === req.user.id);
    res.json({
        panels: userPanels.map(p => ({
            id: p.id,
            name: p.name,
            key: p.panelKey
        }))
    });
});

// 2. Neues Panel erstellen
app.post('/panels/create', (req, res) => {
    const newPanel = {
        id: Date.now(),
        ownerUserId: req.user.id,
        name: req.body.name || "Neues Panel",
        panelKey: crypto.randomUUID(),
        commandQueue: []
    };
    panels.push(newPanel);
    res.json({ success: true, panel: { id: newPanel.id, name: newPanel.name, key: newPanel.panelKey } });
});

// --- ROBLOX API (KEIN AUTH, NUR PANEL-KEY) ---

// 3. Nächsten Befehl abrufen
app.get('/api/:panelKey/command/next', (req, res) => {
    const panel = getPanelByKey(req.params.panelKey);
    if (!panel || panel.commandQueue.length === 0) {
        return res.json({ command: "none" });
    }
    // Gibt den ältesten Befehl zurück
    res.json({ command: panel.commandQueue[0] });
});

// 4. Befehl hinzufügen (z.B. durch Web-Button)
app.post('/api/:panelKey/command/add', (req, res) => {
    const panel = getPanelByKey(req.params.panelKey);
    const { command } = req.body;
    if (!panel) return res.status(404).json({ error: "Panel nicht gefunden" });
    
    panel.commandQueue.push(command);
    res.json({ success: true });
});

// 5. Befehl als erledigt markieren (Löschen)
app.post('/api/:panelKey/command/done', (req, res) => {
    const panel = getPanelByKey(req.params.panelKey);
    if (panel && panel.commandQueue.length > 0) {
        panel.commandQueue.shift(); // Entfernt den ersten Befehl
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API läuft auf Port ${PORT}`));
