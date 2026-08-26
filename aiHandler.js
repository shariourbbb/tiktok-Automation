// aiHandler.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyzes scraped video data, selects top 3 by engagement rate,
 * and generates a contextual, human‑sounding comment for each.
 *
 * @param {Array} videos  - Objects: { url, caption, views, likes, comments }
 * @returns {Promise<Array>}  - topVideos array: [{ videoUrl, comment }]
 */
async function getTopVideosAndComments(videos) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // or 'gemini-1.5-flash'

    const systemPrompt = `You are a TikTok viral marketing expert.
Analyse these **million-view viral videos**. For each video, calculate engagement rate = (likes + comments) / views.
Select the **3 videos with the BEST POTENTIAL for brand visibility** considering:
1. High engagement rate (virality signal)
2. Comment-friendly content (topics that spark discussion)
3. Positive/uplifting themes (safe for brand association)
4. Niche relevance for marketing

For each selected video, generate a **unique, natural, contextual comment** (max 150 characters) based on its caption.
The comment should:
- Feel genuinely human (not bot-like)
- Relate to the video content specifically
- Add value or a unique perspective
- Encourage further interaction (questions, opinions)
- Never be generic like "nice video" or "great content"

Return ONLY a valid JSON object with a "topVideos" array containing objects with "videoUrl" and "comment".`;

    const userMessage = JSON.stringify(videos);

    const prompt = `${systemPrompt}\n\nHere is the video data:\n${userMessage}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text();

    // Remove any markdown code fences if present
    const cleanJson = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (!parsed.topVideos || !Array.isArray(parsed.topVideos)) {
        throw new Error('AI did not return expected "topVideos" array');
    }
    return parsed.topVideos;
}

module.exports = { getTopVideosAndComments };