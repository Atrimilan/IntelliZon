const express = require('express');
const mongodb = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');
const app = express();

dotenv.config();

const username = encodeURIComponent(process.env.MONGO_DB_USERNAME);
const password = encodeURIComponent(process.env.MONGO_DB_PASSWORD);
const mongoClient = new mongodb.MongoClient(
    `mongodb://${username}:${password}@${process.env.MONGO_DB_URL}/?authMechanism=DEFAULT`, {}
);

app.use(express.json());
app.use(cors());

// Nom des appareils écrit en dur, car nous n'avons pas d'API_KEY pour requêter Helium IoT
const deviceNames = {
    "2cf7f1c04400049d": 'Capteur Jardin',
    "2cf7f1c04280021c": 'Capteur Salle de bains',
    "2cf7f1c04280041c": 'Capteur Salon'
};

// Nom des ampoules connectées écrit en dur, car nous n'avons pas le matériel nécessaire
const connectedLights = {
    "cd0f2a78-5235-4c16-b8f9-32593cd54f01": "A67 - Ampoule connectée E27 - 1600",
    "1fe274d8-9283-48e1-b4ad-946d1c42f46b": "A60 - Ampoule connectée E27 - 1600",
    "f90965da-3751-4d0b-9ee4-d65193ed8bd8": "MR16 - Spots connectés",
    "55bdadb4-5e8b-4463-a559-98d2315b9dd2": "Spot extérieur Lily XL",
    "cb552d01-7d9c-4609-8691-888dbede1df6": "Plafonnier moyen Infuse"
};

// Middleware d'authentification Helium
function authHelium(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== process.env.HELIUM_IOT_API_KEY) {
        return res.status(401).send('Unauthorized');
    }
    next();
}

// Middleware d'authentification du Front
function authFront(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== process.env.INTELLIZON_FRONT_API_KEY) {
        return res.status(401).send('Unauthorized');
    }
    next();
}

// Validation des configurations Min-Max
function validateMinMax(min, max, minValue, maxValue, fieldName) {
    if (!min && !max) {
        return { isValid: false, message: `Lorsque ${fieldName} est renseigné, il doit avoir au moins un min ou un max` };
    }
    if (min !== undefined && (typeof min !== 'number' || min < minValue || min > maxValue)) {
        return { isValid: false, message: `Le min de ${fieldName} doit être un nombre entre ${minValue} et ${maxValue}` };
    }
    if (max !== undefined && (typeof max !== 'number' || max < minValue || max > maxValue)) {
        return { isValid: false, message: `Le max de ${fieldName} doit être un nombre entre ${minValue} et ${maxValue}` };
    }
    if (min && max && min > max) {
        return { isValid: false, message: `Le min de ${fieldName} ne peut être supérieur à son max` };
    }
    return { isValid: true };
}

// Validation des configurations Toggle
function validateToggle(toggle, minValue, maxValue, fieldName) {
    if (toggle === undefined) {
        return { isValid: false, message: `${fieldName} doit avoir un toggle` };
    }
    if (typeof toggle !== 'number' || toggle < minValue || toggle > maxValue) {
        return { isValid: false, message: `Le toggle de ${fieldName} doit être un nombre entre ${minValue} et ${maxValue}` };
    }
    return { isValid: true };
}

// Validation de l'existence d'une lumière connectée pour chaque UUID spécifié
function validateUuids(uuids, allowedUuids, fieldName) {
    if (uuids === undefined || !Array.isArray(uuids) || uuids.length === 0) {
        return { isValid: false, message: `Le champ ${fieldName} doit être un tableau non vide` };
    }
    for (const uuid of uuids) {
        if (!allowedUuids.includes(uuid)) {
            return { isValid: false, message: `L'UUID ${uuid} n'existe pas pour le champ ${fieldName}` };
        }
    }
    return { isValid: true };
}

// Vérifier que l'application est en marche : http://localhost:3000/api/health
app.get('/api/health', (req, res) => {
    res.send('Le serveur IntelliZon est en marche !');
});

// Obtenir la liste des collections MongoDB
app.get('/api/intellizon-front/collections', authFront, async (req, res) => {
    try {
        await mongoClient.connect();
        const db = mongoClient.db('intellizon_helium');
        const collections = await db.listCollections().toArray();

        const devices = collections.map(collection => {
            const deviceEui = collection.name;
            const deviceName = deviceNames[deviceEui] || `Capteur ${deviceEui}`;
            const deviceType = "SenseCap K1100";

            return { deviceEui, deviceName, deviceType };
        });

        res.status(200).send(devices);

    } catch (error) {
        console.error('Impossible de récupérer les collections :', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await mongoClient.close();
    }
});

// Récupérer les dernières données d'un appareil
app.get('/api/intellizon-front/getLatestData/:device', authFront, async (req, res) => {
    try {
        const device = req.params.device;

        await mongoClient.connect();
        const collection = mongoClient.db('intellizon_helium').collection(device);
        const data = await collection.findOne({}, { sort: { _id: -1 } });

        res.status(200).send(data);

    } catch (error) {
        console.error("Impossible de récupérer les informations :", error);
        res.status(500).send('Internal server error');
    } finally {
        await mongoClient.close();
    }
});

// Récupérer une plage de données d'un appareil (à partir d'un START et d'un END faculatifs)
app.get('/api/intellizon-front/getDataRange/:device', authFront, async (req, res) => {
    try {
        const start = req.query.start || null;
        const end = req.query.end || null;
        const device = req.params.device;

        await mongoClient.connect();
        const collection = mongoClient.db('intellizon_helium').collection(device);

        // Construire l'objet de requête, si un START et/ou un END sont définis dans le corps de la requête
        const query = {};
        if (start || end) {
            query.datetime = {};
        }
        if (start) {
            query.datetime.$gte = new Date(start);
        }
        if (end) {
            query.datetime.$lte = new Date(end);
        }

        const documents = await collection.find(query).toArray();
        res.status(200).send(documents);

    } catch (error) {
        console.error('Impossible de récupérer les informations :', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await mongoClient.close();
    }
});

// Obtenir la liste des lumières connectées
app.get('/api/intellizon-front/getConnectedLights', authFront, async (req, res) => {
    res.status(200).send(connectedLights);
});

// Création ou mise à jour des configurations liées à un appareil
app.put('/api/intellizon-front/saveConfig/:device', authFront, async (req, res) => {
    try {
        const device = req.params.device;
        const config = req.body;

        if (config.temperature) {
            let minMaxValidator = validateMinMax(config.temperature.min, config.temperature.max, -100, 100, 'temperature');

            if (!minMaxValidator.isValid) {
                return res.status(400).send(minMaxValidator.message);
            }
        }

        if (config.humidity) {
            let minMaxValidator = validateMinMax(config.humidity.min, config.humidity.max, 0, 100, 'humidity');

            if (!minMaxValidator.isValid) {
                return res.status(400).send(minMaxValidator.message);
            }
        }

        if (config.light) {
            let toggleValidator = validateToggle(config.light.toggle, 0, 1000, 'light');
            let uuidsValidator = validateUuids(config.light.controlledLights, Object.keys(connectedLights), 'light.controlledLights');

            if (!toggleValidator.isValid) {
                return res.status(400).send(toggleValidator.message);
            }
            if (!uuidsValidator.isValid) {
                return res.status(400).send(uuidsValidator.message);
            }
        }

        await mongoClient.connect();
        const collection = mongoClient.db('intellizon_config').collection(device);

        await collection.replaceOne({ _id: device }, config, { upsert: true });

        res.status(200).send('OK');

    } catch (error) {
        console.error("Une erreur est survenue lors de l'enregistrement dans MongoDB :", error);
        res.status(500).send('Internal Server Error');
    } finally {
        await mongoClient.close();
    }
});

// Obtenir la configuration liée à un appareil
app.get('/api/intellizon-front/getConfig/:device', authFront, async (req, res) => {
    try {
        const device = req.params.device;

        await mongoClient.connect();
        const collection = mongoClient.db('intellizon_config').collection(device);

        const config = await collection.findOne();

        if (!config) {
            return res.status(404).send('La configuration demandée n\'existe pas');
        }

        res.status(200).send(config);

    } catch (error) {
        console.error("Une erreur est survenue lors de la récupération de la configuration dans MongoDB :", error);
        res.status(500).send('Internal Server Error');
    } finally {
        await mongoClient.close();
    }
});

// Enregistrer des données à jour
app.post('/api/helium/saveData', authHelium, async (req, res) => {
    try {
        const deviceEUI = req.body.deviceInfo.devEui;
        const timeISO = new Date(req.body.time);
        const humidity = req.body.object.humidity;
        const temperature = req.body.object.temp;
        const light = req.body.object.light;

        if (!timeISO || !deviceEUI || !humidity || !temperature || !light) {
            return res.status(400).send('Bad Request: Missing required fields');
        }

        await mongoClient.connect();
        const collection = mongoClient.db('intellizon_helium').collection(deviceEUI);

        const data = {
            datetime: timeISO,
            humidity: {
                value: humidity / 100,
                unit: '%'
            },
            temperature: {
                value: temperature / 100,
                unit: '°C'
            },
            light: {
                value: light,
                unit: 'lx'
            }
        };

        await collection.insertOne(data);

        res.status(200).send('OK');

    } catch (error) {
        console.error("Une erreur est survenue lors de l'enregistrement dans MongoDB :", error);
        res.status(500).send('Internal Server Error');
    } finally {
        await mongoClient.close();
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Serveur IntelliZon ouvert sur le port ${PORT}`);
});

// Afficher une erreur 500 si la requête est invalide
app.use((err, req, res, next) => {
    // console.error(err);
    res.status(500).send('Internal server error');
});