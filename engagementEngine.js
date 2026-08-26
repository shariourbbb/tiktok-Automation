const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function followUser(page, profileUrl) {
  console.log(`[Engagement] Following user at ${profileUrl}`);
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    const followButton = await page.$('[data-e2e="follow-button"]');
    if (!followButton) {
      console.log('[Engagement] Follow button not found (maybe already following or private)');
      return false;
    }

    const buttonText = await followButton.innerText();
    if (buttonText.toLowerCase().includes('following')) {
      console.log('[Engagement] Already following this user');
      return false;
    }

    await followButton.click();
    await sleep(randomBetween(1000, 3000));

    const followingText = await followButton.innerText();
    const success = followingText.toLowerCase().includes('following');
    console.log(`[Engagement] ${success ? 'Successfully followed' : 'Failed to follow'} user`);
    return success;
  } catch (err) {
    console.error(`[Engagement] Error following user:`, err.message);
    return false;
  }
}

async function likeRecentVideo(page, profileUrl, maxScroll = 2) {
  console.log(`[Engagement] Liking recent video from ${profileUrl}`);
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    for (let i = 0; i < maxScroll; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
    }

    const videoLink = await page.$('a[href*="/video/"]');
    if (!videoLink) {
      console.log('[Engagement] No video found to like');
      return false;
    }

    const videoUrl = await videoLink.evaluate(el => el.href);
    await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    const likeButton = await page.$('[data-e2e="like-icon"]');
    if (!likeButton) {
      console.log('[Engagement] Like button not found');
      return false;
    }

    const likeState = await likeButton.evaluate(el => el.getAttribute('data-e2e-like-state') || '');
    if (likeState === 'liked') {
      console.log('[Engagement] Already liked this video');
      return false;
    }

    await likeButton.click();
    await sleep(1000);
    console.log('[Engagement] Video liked successfully');
    return true;
  } catch (err) {
    console.error(`[Engagement] Error liking video:`, err.message);
    return false;
  }
}

module.exports = { followUser, likeRecentVideo };
