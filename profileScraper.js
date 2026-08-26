const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TIKTOK_PROFILE_SELECTORS = {
  username: '[data-e2e="user-title"]',
  bio: '[data-e2e="user-bio"]',
  followerCount: '[data-e2e="followers-count"] strong',
  followingCount: '[data-e2e="following-count"] strong',
  likeCount: '[data-e2e="likes-count"] strong',
  videoCount: '[data-e2e="video-count"] strong',
  avatar: '[data-e2e="user-avatar"] img',
  privateBadge: 'span:has-text("This account is private")',
  verifiedBadge: '[data-e2e="user-verified"]',
};

async function scrapeTikTokProfile(page, profileUrl, keyword = '') {
  console.log(`[ProfileScraper] Navigating to ${profileUrl}`);
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    const result = {
      platform: 'tiktok',
      platformId: '',
      username: '',
      profileUrl,
      avatarUrl: '',
      bio: '',
      followers: 0,
      following: 0,
      totalLikes: 0,
      videos: 0,
      isPrivate: false,
      isVerified: false,
      sourceKeyword: keyword,
    };

    try {
      const el = await page.$(TIKTOK_PROFILE_SELECTORS.username);
      if (el) result.username = await el.innerText();
    } catch {}

    try {
      const el = await page.$(TIKTOK_PROFILE_SELECTORS.bio);
      if (el) result.bio = await el.innerText();
    } catch {}

    const parseCount = (str) => {
      if (!str) return 0;
      str = str.replace(/,/g, '').trim();
      if (str.endsWith('M')) return parseFloat(str) * 1_000_000;
      if (str.endsWith('K')) return parseFloat(str) * 1_000;
      if (str.endsWith('B')) return parseFloat(str) * 1_000_000_000;
      return parseInt(str, 10) || 0;
    };

    for (const [key, sel] of Object.entries(TIKTOK_PROFILE_SELECTORS)) {
      if (key === 'username' || key === 'bio') continue;
      if (key === 'privateBadge') {
        result.isPrivate = await page.$(sel).then(e => !!e).catch(() => false);
        continue;
      }
      if (key === 'verifiedBadge') {
        result.isVerified = await page.$(sel).then(e => !!e).catch(() => false);
        continue;
      }
      if (key === 'avatar') {
        try {
          const el = await page.$(sel);
          if (el) result.avatarUrl = await el.evaluate(e => e.src);
        } catch {}
        continue;
      }
      try {
        const el = await page.$(sel);
        if (el) {
          const text = await el.innerText();
          const numKey = key === 'followerCount' ? 'followers'
            : key === 'followingCount' ? 'following'
            : key === 'likeCount' ? 'totalLikes'
            : key === 'videoCount' ? 'videos' : key;
          result[numKey] = parseCount(text);
        }
      } catch {}
    }

    const urlParts = profileUrl.split('/');
    result.platformId = urlParts[urlParts.length - 1] || result.username;

    console.log(`[ProfileScraper] Scraped: ${result.username} | ${result.followers} followers | ${result.totalLikes} likes`);
    return result;
  } catch (err) {
    console.error(`[ProfileScraper] Error scraping ${profileUrl}:`, err.message);
    return null;
  }
}

async function extractCommentersFromVideo(page, videoUrl, maxCommenters = 10) {
  console.log(`[ProfileScraper] Extracting commenters from ${videoUrl}`);
  try {
    await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    try {
      await page.waitForSelector('[data-e2e="comment-list"]', { timeout: 8000 });
    } catch {}

    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
    }

    const commenters = await page.evaluate((max) => {
      const items = document.querySelectorAll('[data-e2e="comment-list"] [data-e2e="comment-user-avatar"]');
      const result = [];
      for (const item of items) {
        if (result.length >= max) break;
        const link = item.closest('a') || item.querySelector('a');
        if (link) {
          result.push({ url: link.href, username: link.href.split('/').pop() });
        }
      }
      return result;
    }, maxCommenters);

    const videoOwner = await page.evaluate(() => {
      const els = document.querySelectorAll('a[href*="/@"]');
      for (const el of els) {
        const href = el.getAttribute('href');
        if (href && href.includes('/video/') === false && !href.includes('/search')) {
          return { url: href.startsWith('http') ? href : `https://www.tiktok.com${href}`, username: href.split('/@').pop() };
        }
      }
      return null;
    });

    return { commenters, videoOwner };
  } catch (err) {
    console.error(`[ProfileScraper] Error extracting commenters:`, err.message);
    return { commenters: [], videoOwner: null };
  }
}

module.exports = { scrapeTikTokProfile, extractCommentersFromVideo };
