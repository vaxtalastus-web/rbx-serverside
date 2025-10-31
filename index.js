const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'database.json');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.post('/api/servers/players/add', async (req, res) => {
    const { user, jobId, placeId } = req.body;
    if (!user || !jobId || !placeId) {
        return res.status(400).send({ error: 'Missing user, jobId, or placeId' });
    }
    try {
        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
        const serverId = `${placeId}_${jobId}`;
        if (!data.servers[serverId]) {
            data.servers[serverId] = { placeId, jobId, players: [] };
        }
        if (!data.servers[serverId].players.includes(user)) {
            data.servers[serverId].players.push(user);
        }
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
        res.status(200).send({ message: 'User added' });
    } catch (error) {
        console.error('Player Add Error:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});
app.post('/api/servers/players/remove', async (req, res) => {
    const { user, jobId, placeId } = req.body;
    if (!user || !jobId || !placeId) {
        return res.status(400).send({ error: 'Missing user, jobId, or placeId' });
    }
    try {
        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
        const serverId = `${placeId}_${jobId}`;

        if (data.servers[serverId]) {
            data.servers[serverId].players = data.servers[serverId].players.filter(p => p !== user);
            if (data.servers[serverId].players.length === 0) {
                delete data.servers[serverId];
                if (data.toexecute[serverId]) {
                    delete data.toexecute[serverId];
                }
            }
        }
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
        res.status(200).send({ message: 'User removed' });
    } catch (error) {
        console.error('Player Remove Error:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});
app.post('/api/servers/shutdown', async (req, res) => {
    const { jobId, placeId } = req.body;
    if (!jobId || !placeId) {
        return res.status(400).send({ error: 'Missing jobId or placeId' });
    }
    try {
        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
        const serverId = `${placeId}_${jobId}`;
        if (data.servers[serverId]) {
            if (!data.loggedGames) data.loggedGames = {};
            data.loggedGames[serverId] = {
                ...data.servers[serverId],
                shutdownTime: new Date().toISOString()
            };
            delete data.servers[serverId];
        }
        if (data.toexecute[serverId]) {
            delete data.toexecute[serverId];
        }
        await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
        res.status(200).send({ message: 'Server moved to history' });
    } catch (error) {
        console.error('Shutdown Error:', error);
        res.status(500).send({ error: 'Internal server error' });
    }
});
app.route('/api/servers/execute-queue')
    .get(async (req, res) => {
        const { jobId, placeId } = req.query;
        if (!jobId || !placeId) {
            return res.status(400).send('');
        }
        try {
            const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
            const serverId = `${placeId}_${jobId}`;
            if (data.toexecute[serverId]) {
                const { text } = data.toexecute[serverId];
                delete data.toexecute[serverId];
                await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
                return res.send(text);
            }
            res.send('');
        } catch (error) {
            console.error('execute Queue GET Error:', error);
            res.status(500).send('');
        }
    })
    .post(async (req, res) => {
        const { textToExecute, username } = req.body;
        if (!textToExecute || !username) {
            return res.status(400).send('Missing text or username');
        }
        try {
            const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
            const serverId = Object.keys(data.servers).find(id => data.servers[id].players.includes(username));

            if (serverId) {
                data.toexecute[serverId] = { text: textToExecute };
                await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
                return res.redirect('/?status=success');
            } else {
                return res.redirect('/?status=notfound');
            }
        } catch (error) {
            console.error('execute Queue POST Error:', error);
            res.status(500).redirect('/?status=error');
        }
    });
app.get('/api/servers', async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
        res.json(data.servers);
    } catch (error) {
        console.error('Get Servers Error:', error);
        res.status(500).json({ error: 'Could not fetch servers' });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
