#!/usr/bin/env node

/**
 * Convert Xtream Codes JSON to M3U playlist
 * Run: node scripts/json-to-m3u.js
 */

const fs = require('fs');
const path = require('path');

const XTREAM_SERVER = 'http://m3u.best-smarter.me';
const USERNAME = '2b9dbfe35aa1';
const PASSWORD = '1a292b87b3';

const streamsPath = path.join(__dirname, '..', 'streams.json');
const categoriesPath = path.join(__dirname, '..', 'categories.json');
const outputPath = path.join(__dirname, '..', 'playlist.m3u');

console.log('[JSON->M3U] Starting conversion...');

// Read streams JSON
if (!fs.existsSync(streamsPath)) {
  console.error(`[ERROR] streams.json not found at: ${streamsPath}`);
  console.log('\nTo download streams.json, run:');
  console.log(`curl -s "${XTREAM_SERVER}/player_api.php?username=${USERNAME}&password=${PASSWORD}&action=get_live_streams" > ${streamsPath}`);
  process.exit(1);
}

const streams = JSON.parse(fs.readFileSync(streamsPath, 'utf-8'));
console.log(`[JSON->M3U] Loaded ${streams.length} streams`);

// Read categories JSON (optional)
let categoryMap = new Map();
if (fs.existsSync(categoriesPath)) {
  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  categories.forEach(cat => {
    categoryMap.set(cat.category_id, cat.category_name);
  });
  console.log(`[JSON->M3U] Loaded ${categories.length} categories`);
} else {
  console.log('[JSON->M3U] No categories.json found, using category IDs as names');
}

// Generate M3U content
let m3uContent = '#EXTM3U\n';

streams.forEach(stream => {
  const categoryName = categoryMap.get(stream.category_id) || `Category ${stream.category_id}`;
  const streamUrl = `${XTREAM_SERVER}/live/${USERNAME}/${PASSWORD}/${stream.stream_id}.m3u8`;

  // Build EXTINF line
  const extinf = [
    `#EXTINF:-1`,
    `tvg-id="${stream.epg_channel_id || ''}"`,
    `tvg-name="${stream.name}"`,
    `tvg-logo="${stream.stream_icon || ''}"`,
    `group-title="${categoryName}"`,
    `,${stream.name}`
  ].join(' ');

  m3uContent += `${extinf}\n${streamUrl}\n`;
});

// Write M3U file
fs.writeFileSync(outputPath, m3uContent);

console.log(`[JSON->M3U] Generated playlist with ${streams.length} channels`);
console.log(`[JSON->M3U] Saved to: ${outputPath}`);
console.log('\nTo use this playlist, set environment variable:');
console.log('M3U8_URLS="./playlist.m3u" USE_M3U8=true pm2 restart teslaplayer');
