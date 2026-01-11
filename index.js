import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

const DATA_FILE = path.join(__dirname, 'panels.json');

let panels = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        panels = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) { panels = []; }
}

const saveItems = () => fs.writeFileSync(DATA_FILE, JSON.stringify(panels, null, 2));

// --- AUTH MIDDLEWARE (WIE VORGEGEBEN) ---
const authMiddleware = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: "Unauthorized" });
    const token = header.split(' ')[1];
    try {
        const verifyRes = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=AIzaSyCje12QpL2M2WqjNLqvpTvJmXQH6Hxzk9w`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
        });
        const userData = await verifyRes.json();
        if (userData.users && userData.users[0]) {
            req.user = { id: userData.users[0].localId };
            next();
        } else { res.status(401).json({ error: "Invalid Token" }); }
    } catch (error) { res.status(500).json({ error: "Auth Check Failed" }); }
};

app.get('/panels', authMiddleware, (req, res) => {
    const userPanels = panels.filter(p => p.ownerUserId === req.user.id);
    res.json({ panels: userPanels.map(p => ({ id: p.id, name: p.name, key: p.panelKey })) });
});

app.post('/panels/create', authMiddleware, (req, res) => {
    const newPanel = {
        id: Date.now(),
        ownerUserId: req.user.id,
        name: req.body.name || "Main Panel",
        panelKey: crypto.randomBytes(16).toString('hex'),
        commandQueue: []
    };
    panels.push(newPanel);
    saveItems();
    res.json({ success: true, panel: { id: newPanel.id, name: newPanel.name, key: newPanel.panelKey } });
});

app.get('/api/:panelKey/command/next', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel || !panel.commandQueue || panel.commandQueue.length === 0) return res.json({ command: "none" });
    res.json({ command: panel.commandQueue[0] });
});

app.post('/api/:panelKey/command/add', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel not found" });
    panel.commandQueue.push(req.body.command);
    saveItems();
    res.json({ success: true });
});

app.post('/panels/:panelKey/buttons/add', (req, res) => {
    const { label, cmdId } = req.body;
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    
    if (!panel) return res.status(404).json({ error: "Panel nicht gefunden" });
    
    if (!panel.customButtons) panel.customButtons = [];
    
    panel.customButtons.push({ label, cmdId });
    saveItems();
    
    res.json({ success: true, buttons: panel.customButtons });
});


app.get('/panels/details/:panelKey', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel nicht gefunden" });
    
    res.json({
        name: panel.name,
        key: panel.panelKey,
        buttons: panel.customButtons || []
    });
});

app.post('/api/:panelKey/command/done', (req, res) => {
    const panel = panels.find(p => p.panelKey === req.params.panelKey);
    if (panel && panel.commandQueue.length > 0) {
        panel.commandQueue.shift();
        saveItems();
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

