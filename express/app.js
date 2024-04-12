const express = require('express');
const mongodb = require('mongodb');
const dotenv = require('dotenv');
const cors = require('cors');
const app = express();

dotenv.config();

const mongoClient = new mongodb.MongoClient(process.env.MONGO_DB_URL, {});

app.use(express.json());
app.use(cors());

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

// Vérifier que l'application est en marche : http://localhost:3000/api/health
app.get('/api/health', (req, res) => {
    res.send('Le serveur IntelliZon est en marche !');
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
        console.error("Une erreur est survenue lors de la récupération des dernières informations dans MongoDB :", error);
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
        console.error('Error retrieving data from MongoDB:', error);
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
        const result = await collection.insertOne(data);
        console.log("Données insérées avec l'id :", result.insertedId.toString());
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