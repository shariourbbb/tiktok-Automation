const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeProfile(page, profileUrl, keyword) {
  console.log(`[YouTube] Scraping profile: ${profileUrl}`);
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    const result = {
      platform: 'youtube',
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
      const nameEl = await page.$('#channel-header #channel-name, yt-formatted-string#text');
      if (nameEl) result.username = await nameEl.innerText();
    } catch {}

    try {
      const subsEl = await page.$('#subscriber-count, #owner-sub-count');
      if (subsEl) {
        const text = await subsEl.innerText();
        const num = text.replace(/[^0-9.]/g, '');
        if (text.includes('M')) result.followers = parseFloat(num) * 1_000_000;
        else if (text.includes('K')) result.followers = parseFloat(num) * 1_000;
        else result.followers = parseInt(num) || 0;
      }
    } catch {}

    try {
      result.isVerified = await page.$('yt-icon#channel-header yt-icon.verified').then(e => !!e).catch(() => false);
    } catch {}

    const urlParts = profileUrl.split('/').filter(Boolean);
    result.platformId = urlParts[urlParts.length - 1] || result.username;

    console.log(`[YouTube] Scraped: ${result.username} | ${result.followers} subscribers`);
    return result;
  } catch (err) {
    console.error(`[YouTube] Error scraping:`, err.message);
    return null;
  }
}

module.exports = { scrapeProfile };
