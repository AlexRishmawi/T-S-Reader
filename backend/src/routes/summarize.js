import express from 'express';
import rateLimit from 'express-rate-limit';
import { summarizeText } from '../services/geminiService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
const router = express.Router();

// Rate Limiter
const limiter = rateLimit({
    windowMs: 60 * 1000 * 60, // 1 hour
    max: 12, // limit each IP to 6 requests per windowMs (Change this before deployment)
    message: 'Too many requests from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});


// POST /api/summarize
router.post('/summarize', limiter, async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            res.write(`data: ${JSON.stringify({ error: 'Invalid input text' })}\n\n`);
            return res.end();
        }

        const { summary, cached } = await summarizeText(text, (chunk) => {
            console.log("Chunk generated:", chunk.substring(0, 15) + "...");
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        });

        res.write(`data: ${JSON.stringify({ done: true, cached: cached || false })}\n\n`);
        res.end()

    } catch (error) {
        console.error('Streaming error:', error);
        if (error.status === 429 || error.message?.includes('429')) {
            res.write(`data: ${JSON.stringify({ error: 'Rate limit exceeded. Try again later.' })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
        }
        res.end();
    }
});

export default router;