const { scrapeTikTokProfile, extractCommentersFromVideo } = require('../profileScraper');

async function scrapeProfile(page, profileUrl, keyword) {
  return scrapeTikTokProfile(page, profileUrl, keyword);
}

async function extractCommenters(page, videoUrl, maxCommenters) {
  return extractCommentersFromVideo(page, videoUrl, maxCommenters);
}

module.exports = { scrapeProfile, extractCommenters };
