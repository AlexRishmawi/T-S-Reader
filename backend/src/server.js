import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import summarizeRoutes from './routes/summarize.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.EXTENSION_ID || '')
    .split(',')
    .map(id => `chrome-extension://${id.trim()}`);

app.use(express.json({limit: '10mb'}));
const extensionID = process.env.EXTENSION_ID || 'default-extension-id';
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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
