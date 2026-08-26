const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeProfile(page, profileUrl, keyword) {
  console.log(`[Instagram] Scraping profile: ${profileUrl}`);
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    const result = {
      platform: 'instagram',
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
      const usernameEl = await page.$('header h2, header section h2');
      if (usernameEl) result.username = await usernameEl.innerText();
    } catch {}

    try {
      const bioEl = await page.$('header span[dir="auto"]');
      if (bioEl) result.bio = await bioEl.innerText();
    } catch {}

    try {
      result.isVerified = await page.$('svg[aria-label="Verified"]').then(e => !!e).catch(() => false);
    } catch {}

    const parseCount = (str) => {
      if (!str) return 0;
      str = str.replace(/,/g, '').trim();
      if (str.endsWith('m') || str.endsWith('M')) return parseFloat(str) * 1_000_000;
      if (str.endsWith('k') || str.endsWith('K')) return parseFloat(str) * 1_000;
      return parseInt(str, 10) || 0;
    };

    try {
      const stats = await page.$$('header ul li span span');
      if (stats.length >= 3) {
        const texts = await Promise.all(stats.map(el => el.innerText()));
        result.videos = parseCount(texts[0]);
        result.followers = parseCount(texts[1]);
        result.following = parseCount(texts[2]);
      }
    } catch {}

    const urlParts = profileUrl.split('/').filter(Boolean);
    result.platformId = urlParts[urlParts.length - 1] || result.username;

    console.log(`[Instagram] Scraped: ${result.username} | ${result.followers} followers`);
    return result;
  } catch (err) {
    console.error(`[Instagram] Error scraping:`, err.message);
    return null;
  }
}

module.exports = { scrapeProfile };
