import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import summarizeRoutes from './routes/summarize.js';

const app = express();
const PORT = process.env.PORT || 5000;


app.use(express.json({limit: '10mb'}));

const extensionID = process.env.EXTENSION_ID;
if (!extensionID || extensionID.trim() === '' || extensionID === 'default-extension-id') {
    throw new Error('Fatal: EXTENSION_ID environment variable is missing or invalid. Please configure a valid EXTENSION_ID in your environment.');
}

app.use(cors({
    origin: `chrome-extension://${extensionID}`,
    methods: ['POST', 'OPTIONS'],
    optionsSuccessStatus: 200
}));

app.use('/api', summarizeRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
