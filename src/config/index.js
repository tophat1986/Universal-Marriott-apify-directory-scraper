// Main configuration export
export { DOMAIN_PATTERNS, detectBrandFromUrl, validateUrlForBrand } from './domains.js';
export { RATE_PROFILES, DEFAULT_CRAWLER_CONFIG, getCrawlerConfig, PUPPETEER_LAUNCH_OPTIONS } from './crawler.js';
export { BRAND_DIRECTORY_URLS, getBrandDirectoryUrl, getBrandKeyFromSelection } from './brand-urls.js';

// Import brand codes
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const brandCodes = JSON.parse(readFileSync(join(__dirname, 'brand_codes.json'), 'utf8'));
const subBrandCodes = JSON.parse(readFileSync(join(__dirname, 'sub_brand_codes.json'), 'utf8'));

export { brandCodes, subBrandCodes };

// Brand mapping function
export function getBrandInfo(brandCode) {
  return {
    name: brandCodes[brandCode] || 'Unknown Brand',
    code: brandCode
  };
}

// Sub-brand mapping function
export function getSubBrandInfo(subBrandCode) {
  return subBrandCodes.find(sub => sub.code === subBrandCode) || null;
} 