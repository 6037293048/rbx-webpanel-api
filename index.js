import express from 'express';
import crypto from 'crypto';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

admin.initializeApp({
apiKey: "AIzaSyCje12QpL2M2WqjNLqvpTvJmXQH6Hxzk9w",
authDomain: "robloxwebpanel.firebaseapp.com",
projectId: "robloxwebpanel",
storageBucket: "robloxwebpanel.firebasestorage.app",
messagingSenderId: "811191493138",
appId: "1:811191493138:web:4752345b9cd2017529eecb"
});

const app = express();
app.use(express.json());
app.use(cors());

const DATA_FILE = path.join(__dirname, 'panels.json');

let panels = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        panels = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        panels = [];
    }
}

const saveItems = () => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(panels, null, 2));
};

const authMiddleware = async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.split(' ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = { id: decodedToken.uid };
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid Token" });
    }
};

app.get('/panels', authMiddleware, (req, res) => {
    const userPanels = panels.filter(p => p.ownerUserId === req.user.id);
    res.json({
        panels: userPanels.map(p => ({
            id: p.id,
            name: p.name,
            key: p.panelKey
        }))
    });
});

app.post('/panels/create', authMiddleware, (req, res) => {
    const newPanel = {
        id: Date.now(),
        ownerUserId: req.user.id,
        name: req.body.name || "Neues Panel",
        panelKey: crypto.randomBytes(16).toString('hex'),
        commandQueue: []
    };
    panels.push(newPanel);
    saveItems();
    res.json({ success: true, panel: { id: newPanel.id, name: newPanel.name, key: newPanel.panelKey } });
});

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

