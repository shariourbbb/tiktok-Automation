// bot.js
require('dotenv').config();
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const readline = require('readline');
const { processImage } = require('./imageProcessor');
const { getTopVideosAndComments } = require('./aiHandler');
const { addLead, updateLead } = require('./leadsManager');
const { scrapeTikTokProfile, extractCommentersFromVideo } = require('./profileScraper');
const { followUser, likeRecentVideo } = require('./engagementEngine');

// ───────────────── Configuration ─────────────────
const CONFIG = {
    keywords: ['trending dance', '#viral', 'funny pets'],   // hashtags / search terms
    accounts: [
        { id: 'user_1', userDataDir: './sessions/user_1' },
        { id: 'user_2', userDataDir: './sessions/user_2' },
        { id: 'user_3', userDataDir: './sessions/user_3' },
    ],
    imagesDir: path.resolve('./images'),
    processedDir: path.resolve('./processed_images'),
    headless: false,                  // true = invisible browser; false = visible
    cooldownBetweenAccounts: { min: 5 * 60_000, max: 10 * 60_000 }, // 5–10 min
    cooldownBetweenVideos: { min: 30_000, max: 90_000 },            // 30–90 sec
    typingDelay: { min: 50, max: 150 },                             // ms per keystroke
    autoFollow: true,                // auto-follow high-value leads (score >= 60)
    autoLike: false,                 // auto-like video owner's recent video
    maxLeadsPerVideo: 3,             // max commenters to capture as leads per video
    minViews: 1_000_000,             // only target videos with >= this many views
    maxVideosToCheck: 30,            // max candidates to pull from search
    maxQualifiedVideos: 10,          // stop once we have this many million-view videos
};

// ───────────────── Helper Utilities ─────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function waitForUserInput(prompt) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(prompt, () => {
            rl.close();
            resolve();
        });
    });
}

async function checkCaptcha(page) {
    // Common captcha indicators on TikTok
    const captchaSelectors = [
        'iframe[src*="captcha"]',
        'iframe[src*="recaptcha"]',
        'div.captcha_verify',
        'div#captcha_container',
        'text="Verify to continue"',
    ];
    for (const sel of captchaSelectors) {
        const element = await page.$(sel);
        if (element) return true;
    }
    return false;
}

// ───────────────── Account Setup ─────────────────
async function launchContexts() {
    const contexts = [];
    for (const account of CONFIG.accounts) {
        const { id, userDataDir } = account;
        const dirExists = await fs.access(userDataDir).then(() => true).catch(() => false);

        // First run: launch headful so you can log in manually
        if (!dirExists) {
            console.log(`\n[Setup] First time for ${id}. Launching visible browser.`);
            const context = await chromium.launchPersistentContext(userDataDir, {
                headless: false,
                viewport: { width: 1280, height: 800 },
            });
            const page = await context.newPage();
            await page.goto('https://www.tiktok.com/login');
            console.log(`[Setup] Please log in to account "${id}" manually.`);
            console.log(`[Setup] After logging in, press Enter in this terminal...`);
            await waitForUserInput('Press Enter once you are logged in...');
            await context.close();
            console.log(`[Setup] Session saved for ${id}.`);
        }

        // Now launch the persistent context (headless or not)
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: CONFIG.headless,
            viewport: { width: 1280, height: 800 },
        });
        contexts.push({ id, context });
        console.log(`[Context] Launched persistent context for ${id}`);
    }
    return contexts;
}

// ───────────────── View Count Extraction ─────────────────
const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    if (!str) return 0;
    if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
    if (str.endsWith('K')) return parseFloat(str) * 1_000;
    if (str.endsWith('B')) return parseFloat(str) * 1_000_000_000;
    return parseInt(str, 10) || 0;
};

async function getVideoViewCount(page, videoUrl) {
    try {
        await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
        await sleep(2000);

        const selectors = [
            'strong[data-e2e="video-views"]',
            '[data-e2e="video-views"]',
            'span[data-e2e="video-views"] strong',
            'strong:has-text("views")',
            '[class*="videoViews"] strong',
            'strong:has-text("View")',
        ];

        for (const sel of selectors) {
            try {
                const el = await page.$(sel);
                if (el) {
                    const text = await el.innerText();
                    const count = parseCount(text);
                    if (count > 0) return count;
                }
            } catch {}
        }

        // Backup: try getting the view count from the page title or meta
        try {
            const text = await page.evaluate(() => {
                const el = document.querySelector('h1[data-e2e="video-desc"]');
                if (!el) return '';
                const parent = el.closest('div')?.parentElement;
                if (!parent) return '';
                return parent.innerText;
            });
            const match = text.match(/([\d.]+[MBK]?)\s*(Views|views)/);
            if (match) return parseCount(match[1]);
        } catch {}

        // Try JSON-LD structured data
        try {
            const views = await page.evaluate(() => {
                const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                for (const s of scripts) {
                    try {
                        const data = JSON.parse(s.innerText);
                        if (data?.interactionStatistic) {
                            for (const stat of data.interactionStatistic) {
                                if (stat.interactionType?.includes('WatchAction')) {
                                    return parseInt(stat.userInteractionCount) || 0;
                                }
                            }
                        }
                    } catch {}
                }
                return 0;
            });
            if (views > 0) return views;
        } catch {}

        return 0;
    } catch (err) {
        console.warn(`[Scraper] Failed to get views for ${videoUrl}:`, err.message);
        return 0;
    }
}

// ───────────────── Scraping TikTok ─────────────────
async function scrapeVideos(page, keyword) {
    const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;
    console.log(`[Scraper] Navigating to search: "${keyword}"`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    try {
        await page.waitForSelector('[data-e2e="search_video-item"]', { timeout: 10000 });
    } catch (e) {
        console.warn(`[Scraper] No video items found for "${keyword}". Skipping.`);
        return [];
    }

    for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(2000);
    }

    const videoCards = await page.$$('[data-e2e="search_video-item"]');
    const candidates = [];

    for (const card of videoCards.slice(0, CONFIG.maxVideosToCheck)) {
        try {
            const linkEl = await card.$('a[href*="/video/"]');
            if (!linkEl) continue;
            const url = await linkEl.evaluate(el => el.href);

            let caption = '';
            const captionEl = await card.$('[data-e2e="search_video-item-caption"] span');
            if (captionEl) caption = await captionEl.innerText();

            const getStat = async (selector) => {
                const el = await card.$(selector);
                return el ? (await el.innerText()).trim() : '0';
            };
            const likesText = await getStat('[data-e2e="search_video-item-like-count"]');
            const commentsText = await getStat('[data-e2e="search_video-item-comment-count"]');

            candidates.push({
                url, caption, keyword,
                likes: parseCount(likesText),
                comments: parseCount(commentsText),
            });
        } catch (err) {
            console.warn('[Scraper] Failed to extract a video card:', err.message);
        }
    }

    console.log(`[Scraper] Collected ${candidates.length} candidates for "${keyword}". Checking view counts...`);

    // Visit each video page to get accurate view count
    const videos = [];
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const views = await getVideoViewCount(page, c.url);

        if (views >= CONFIG.minViews) {
            console.log(`  ✓ [${i + 1}/${candidates.length}] ${views.toLocaleString()} views — ${c.url.split('/').pop()}`);
            videos.push({
                url: c.url,
                caption: c.caption,
                keyword: c.keyword,
                views,
                likes: c.likes,
                comments: c.comments,
            });
        } else {
            console.log(`  ✗ [${i + 1}/${candidates.length}] ${views.toLocaleString()} views (below ${CONFIG.minViews.toLocaleString()})`);
        }

        if (videos.length >= CONFIG.maxQualifiedVideos) break;
    }

    console.log(`[Scraper] Found ${videos.length}/${candidates.length} videos with ${CONFIG.minViews.toLocaleString()}+ views for "${keyword}"`);
    return videos;
}

// ───────────────── Posting a Comment with Image ─────────────────
async function postComment(page, videoUrl, comment, imagePath) {
    console.log(`[Post] Navigating to ${videoUrl}`);
    await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for comment section to be visible
    try {
        await page.waitForSelector('[data-e2e="comment-input"]', { timeout: 10000 });
    } catch {
        throw new Error('Comment input not found. Selector may have changed.');
    }

    // Click the comment input to focus
    const commentInput = await page.$('[data-e2e="comment-input"] textarea, [data-e2e="comment-input"] div[contenteditable="true"]');
    if (!commentInput) throw new Error('Could not locate comment text field.');
    await commentInput.click();
    await sleep(1000);

    // Type the AI-generated comment with human-like delays
    await page.keyboard.type(comment, { delay: randomBetween(CONFIG.typingDelay.min, CONFIG.typingDelay.max) });
    await sleep(500);

    // Upload image: click the image/camera icon
    const imageIcon = await page.$('[data-e2e="comment-image-upload"], [data-e2e="comment-image-icon"]');
    if (!imageIcon) throw new Error('Image upload icon not found.');
    await imageIcon.click();

    // Wait for the hidden file input to appear (usually appears as a direct child of body)
    const fileInput = await page.waitForSelector('input[type="file"][accept*="image"]', { timeout: 5000 });
    await fileInput.setInputFiles(imagePath);
    console.log('[Post] Image uploaded, waiting for preview...');
    // Wait until the upload is processed (thumbnail appears)
    await page.waitForSelector('[data-e2e="comment-image-preview"], img[class*="comment-image"]', { timeout: 10000 }).catch(() => {
        console.warn('[Post] Image preview not detected, proceeding anyway.');
    });
    await sleep(1000);

    // Click the "Post" button
    const postButton = await page.$('[data-e2e="comment-post-button"]');
    if (!postButton) throw new Error('Post button not found.');
    await postButton.click();

    // Verify post was successful (e.g., wait for new comment to appear or a success message)
    await page.waitForTimeout(3000);
    console.log(`[Post] Comment posted successfully.`);
}

// ───────────────── Main Bot Routine ─────────────────
async function runBot() {
    console.log('=== TikTok Marketing Bot ===');

    // 1. Launch persistent contexts (will trigger manual login on first run)
    const contexts = await launchContexts();

    // 2. Scrape videos for all keywords (using first account's context)
    const { context: firstContext } = contexts[0];
    const page = await firstContext.newPage();
    const allVideos = [];
    for (const kw of CONFIG.keywords) {
        const videos = await scrapeVideos(page, kw);
        allVideos.push(...videos);
        // Random short pause between keywords
        await sleep(randomBetween(3000, 7000));
    }
    await page.close();

    if (allVideos.length === 0) {
        console.log('[Bot] No videos found. Exiting.');
        for (const ctx of contexts) await ctx.context.close();
        return;
    }

    // Build keyword lookup map for lead tracking
    const urlToKeyword = {};
    for (const v of allVideos) {
        urlToKeyword[v.url] = v.keyword || 'general';
    }

    // 3. Use AI to select top 3 videos and generate comments
    console.log('[AI] Requesting top viral videos & comments...');
    const topVideos = await getTopVideosAndComments(allVideos);
    console.log(`[AI] Selected ${topVideos.length} videos:`, topVideos.map(v => v.videoUrl));

    // 4. Prepare a pool of processed images (one per comment; we process on the fly)
    //    We'll need 3 videos * 3 accounts = 9 unique images.
    //    We'll pick a random source image each time and process it.
    const imageFiles = await fs.readdir(CONFIG.imagesDir);
    if (imageFiles.length === 0) {
        console.error('[Bot] No source images found in', CONFIG.imagesDir);
        for (const ctx of contexts) await ctx.context.close();
        return;
    }

    // 5. Sequential posting queue: Account by Account
    for (let accIndex = 0; accIndex < contexts.length; accIndex++) {
        const { id, context } = contexts[accIndex];
        console.log(`\n======= Starting with ${id} =======`);

        const accPage = await context.newPage();

        // Detect captcha on every page load via a listener
        accPage.on('load', async () => {
            if (await checkCaptcha(accPage)) {
                console.error(`[CRITICAL] CAPTCHA detected on ${id}.`);
                console.error(`[Bot] Pausing execution. Please solve the captcha manually.`);
                await waitForUserInput('Press Enter after solving the captcha...');
            }
        });

        // Iterate over the top 3 videos
        for (let vidIndex = 0; vidIndex < topVideos.length; vidIndex++) {
            const { videoUrl, comment } = topVideos[vidIndex];
            console.log(`[${id}] Posting comment on video ${vidIndex + 1}: ${videoUrl}`);

            try {
                // Pick a random source image and process it
                const randomSource = imageFiles[Math.floor(Math.random() * imageFiles.length)];
                const sourcePath = path.join(CONFIG.imagesDir, randomSource);
                const processedImagePath = await processImage(sourcePath, CONFIG.processedDir);

                // Execute the post
                await postComment(accPage, videoUrl, comment, processedImagePath);

                // ── Lead Capture ──────────────────────────────────────
                try {
                    const videoKeyword = urlToKeyword[videoUrl] || 'general';
                    const { videoOwner } = await extractCommentersFromVideo(accPage, videoUrl, 0);
                    if (videoOwner && videoOwner.url) {
                        const profile = await scrapeTikTokProfile(accPage, videoOwner.url, videoKeyword);
                        if (profile && profile.username) {
                            const lead = await addLead({
                                ...profile,
                                sourceVideo: videoUrl,
                                sourceKeyword: videoKeyword,
                                interactions: [{ type: 'comment', content: comment }],
                            });
                            console.log(`[Lead] Captured: ${profile.username} (score: ${lead.leadScore})`);

                            if (lead.leadScore >= 60 && CONFIG.autoFollow) {
                                const followed = await followUser(accPage, videoOwner.url);
                                if (followed) {
                                    await addInteraction(lead.id, { type: 'follow', content: 'Auto-followed after comment' });
                                }
                            }
                        }
                    }
                    const { commenters } = await extractCommentersFromVideo(accPage, videoUrl, 3);
                    for (const commenter of commenters) {
                        if (commenter && commenter.url) {
                            const cProfile = await scrapeTikTokProfile(accPage, commenter.url, videoKeyword);
                            if (cProfile && cProfile.username && cProfile.followers >= 1000) {
                                await addLead({
                                    ...cProfile,
                                    sourceVideo: videoUrl,
                                    sourceKeyword: videoKeyword,
                                    tags: ['commenter'],
                                });
                                console.log(`[Lead] Captured commenter: ${cProfile.username}`);
                            }
                        }
                    }
                } catch (leadErr) {
                    console.warn(`[Lead] Capture error:`, leadErr.message);
                }
                // ── End Lead Capture ──────────────────────────────────

                // Clean up the temporary processed image (optional)
                // await fs.unlink(processedImagePath);

            } catch (error) {
                console.error(`[${id}] Error on video ${videoUrl}:`, error.message);
                // Continue with next video despite errors on this one
            }

            // Cooldown between videos of the same account
            const cooldown = randomBetween(CONFIG.cooldownBetweenVideos.min, CONFIG.cooldownBetweenVideos.max);
            console.log(`[${id}] Cooling down for ${cooldown / 1000}s before next video...`);
            await sleep(cooldown);
        }

        await accPage.close();

        // Inter-account cooldown (except after the last account)
        if (accIndex < contexts.length - 1) {
            const globalCooldown = randomBetween(CONFIG.cooldownBetweenAccounts.min, CONFIG.cooldownBetweenAccounts.max);
            console.log(`\n[Bot] Finished with ${id}. Cooling down for ${globalCooldown / 60000} minutes...`);
            await sleep(globalCooldown);
        }
    }

    // 6. Cleanup
    for (const ctx of contexts) {
        await ctx.context.close();
    }
    console.log('[Bot] All done. Exiting.');
}

// ───────────────── Entry Point ─────────────────
runBot().catch(err => {
    console.error('Bot crashed:', err);
    process.exit(1);
});