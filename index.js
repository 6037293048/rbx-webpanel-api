const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const db = {
    panels: []
};

function generateKey() {
    return crypto.randomBytes(10).toString('hex');
}

app.get('/panels', (req, res) => {
    const userPanels = db.panels
        .filter(p => p.ownerUserId === req.user.id)
        .map(({ id, name, panelKey }) => ({ id, name, key: panelKey }));
    
    res.json({ panels: userPanels });
});

app.post('/panels/create', (req, res) => {
    const userPanelsCount = db.panels.filter(p => p.ownerUserId === req.user.id).length;
    
    const newPanel = {
        id: Date.now(),
        ownerUserId: req.user.id,
        name: `Panel ${userPanelsCount + 1}`,
        panelKey: generateKey(),
        commandQueue: []
    };

    db.panels.push(newPanel);
    
    res.json({
        success: true,
        panel: {
            id: newPanel.id,
            name: newPanel.name,
            key: newPanel.panelKey
        }
    });
});

app.get('/api/:panelKey/command/next', (req, res) => {
    const panel = db.panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel not found" });

    if (panel.commandQueue.length === 0) {
        return res.json({ command: "none" });
    }

    res.json({ command: panel.commandQueue[0] });
});

app.post('/api/:panelKey/command/add', (req, res) => {
    const panel = db.panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel not found" });

    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "No command provided" });

    panel.commandQueue.push(command);
    res.json({ success: true, queueLength: panel.commandQueue.length });
});

app.post('/api/:panelKey/command/done', (req, res) => {
    const panel = db.panels.find(p => p.panelKey === req.params.panelKey);
    if (!panel) return res.status(404).json({ error: "Panel not found" });

    panel.commandQueue.shift();
    res.json({ success: true, remaining: panel.commandQueue.length });
});

app.listen(process.env.PORT || 3000);
