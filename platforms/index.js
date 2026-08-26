const tiktok = require('./tiktok');
const instagram = require('./instagram');
const youtube = require('./youtube');

const adapters = { tiktok, instagram, youtube };

async function scrapeProfile(platform, page, profileUrl, keyword) {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter.scrapeProfile(page, profileUrl, keyword);
}

async function extractCommenters(platform, page, videoUrl, maxCommenters) {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter.extractCommenters(page, videoUrl, maxCommenters);
}

async function postComment(platform, page, videoUrl, comment, imagePath) {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter.postComment(page, videoUrl, comment, imagePath);
}

async function followUser(platform, page, profileUrl) {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
  return adapter.followUser(page, profileUrl);
}

module.exports = { scrapeProfile, extractCommenters, postComment, followUser, adapters };
