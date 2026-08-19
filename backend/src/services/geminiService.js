import crypto from 'crypto';
import Bottleneck from 'bottleneck';
import { GoogleGenerativeAI } from '@google/generative-ai';
// Google Gemini SDK
const googleClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

// Egress Queue
const geminiQueue = new Bottleneck({
    maxConcurrent: 1,
    minTime: 3000, // 1 request per second
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

### Billing & Cancellation
* Summarize renewal mechanics, refund policies, and account termination terms.

### User Rights
* Mention key user entitlements, such as content ownership, data deletion options, or opt-out rights.

Keep points direct, easy to scan, and focused on potential user risks.
`;

export async function summarizeText(text, onChunk) {
    // Generate SHA-256 hash of text for caching (Creates unique 256 bit 64 character hash)
            const contentHash = crypto.createHash('sha256').update(text.trim()).digest('hex');
    
            // Check cache
            if (summaryCache.has(contentHash)) {
                onChunk(summaryCache.get(contentHash));
                return {
                    cached: true,
                };
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
                const result = await model.generateContentStream(prompt);
                let fullResponse = '';
                for await (const chunk of result.stream) {
                    fullResponse += chunk.text();
                    if (onChunk) {
                        onChunk(chunk.text());
                    }
                }
                return fullResponse;
            });

            // Store in cache
            summaryCache.set(contentHash, summary);
            return { summary, cached: false };
}