import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import Bottleneck from 'bottleneck';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Google Gemini SDK
const googleClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

// Egress Queue
const geminiQueue = new Bottleneck({
    maxConcurrent: 1,
    minTime: 3000, // 1 request per second
});

// Rate Limiter
const limiter = rateLimit({
    windowMs: 60 * 1000 * 60, // 1 hour
    max: 8, // limit each IP to 8 requests per windowMs
    message: 'Too many requests from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
});

// In-memory cache
const summaryCache = new Map();

//System Instructions
const SYSTEM_INSTRUCTIONS = `
You are an expert consumer advocate and legal assistant. Your job is to analyze Terms of Service, Privacy Policies, and End User License Agreements to highlight what matters most to an average user.
Format your response using simple Markdown with these exact sections (omit a section if no relevant information is present in the text):
### Red Flags & Gotchas
* Call out unusual waivers, mandatory arbitration clauses, class-action waivers, automatic renewals, non-refundable fees, or strict penalties.

### Data & Privacy
* Detail what personal data is collected, whether data is sold or shared with third parties, and tracking mechanisms used.

### 💳 Billing & Cancellation
* Summarize renewal mechanics, refund policies, and account termination terms.

### ✅ User Rights
* Mention key user entitlements, such as content ownership, data deletion options, or opt-out rights.

Keep points direct, easy to scan, and focused on potential user risks.
`;

// POST /api/summarize
router.post('/summarize', limiter, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'No readable text provided' });
        }

        // Generate SHA-256 hash of text for caching (Creates unique 256 bit 64 character hash)
        const contentHash = crypto.createHash('sha256').update(text.trim()).digest('hex');

        // Check cache
        if (summaryCache.has(contentHash)) {
            return res.json({ summary: summaryCache.get(contentHash), cached: true });
        }
        // Schedule API call through bottleneck queue to respect rate limits
        const summary = await geminiQueue.schedule(async () => {
            const model = googleClient.getGenerativeModel({
                model: 'gemini-3.1-flash-lite',
                systemInstruction: SYSTEM_INSTRUCTIONS,
                generationConfig: {
                temperature: 0,
                maxOutputTokens: 1024,
                },
            });
            const prompt = `Summarize the following Terms of Service text in a concise, user-friendly manner, highlighting key points and potential concerns:\n\n${text}`;
            const result = await model.generateContent(prompt);
            return result.response.text();
        });
        // Store in cache
        summaryCache.set(contentHash, summary);

        return res.json({
            summary,
            cached: false,
        });
    } catch (error) {
        console.error('Error handling /api/summarize request:', error);

        if (error.status ==429 || error.message?.includes('429')) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;