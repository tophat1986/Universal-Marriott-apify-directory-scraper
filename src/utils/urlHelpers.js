/**
 * URL utilities for Marriott hotel URL processing
 * Extracts Marsha codes, slugs, and handles URL resolution
 */

/**
 * Extract Marsha code from URL
 * @param {string} url - The hotel URL
 * @returns {string} - The Marsha code (3-6 characters)
 */
export function extractMarsha(url) {
  if (!url) return '';
  
  // Pattern 1: /hotels/travel/<marsha>-<slug>/ or /hotels/<marsha>-<slug>/
  const pattern1 = /\/hotels\/(?:travel\/)?([A-Z]{3,6})-/i;
  const match1 = url.match(pattern1);
  if (match1) {
    return match1[1].toUpperCase();
  }
  
  // Pattern 2: /<marsha> (short code format) - but not part of other paths
  // This should match URLs like https://www.marriott.com/DEADHOTEL
  // but not https://www.marriott.com/hotels/travel/
  const pattern2 = /^https?:\/\/[^\/]+\/([A-Z]{3,6})(?:\/|$)/i;
  const match2 = url.match(pattern2);
  if (match2) {
    // Additional check: make sure this isn't part of a path like /hotels/
    const pathAfterDomain = url.replace(/^https?:\/\/[^\/]+/, '');
    if (!pathAfterDomain.includes('/hotels/')) {
      return match2[1].toUpperCase();
    }
  }
  
  return '';
}

/**
 * Extract slug from URL
 * @param {string} url - The hotel URL
 * @returns {string} - The slug (segment between first hyphen after /hotels/<marsha>- and next /)
 */
export function extractSlug(url) {
  if (!url) return '';
  
  // Pattern: /hotels/travel/<marsha>-<slug>/ or /hotels/<marsha>-<slug>/
  const pattern = /\/hotels\/(?:travel\/)?[A-Z]{3,6}-([^\/]+)/i;
  const match = url.match(pattern);
  
  if (match) {
    return match[1];
  }
  
  return '';
}

/**
 * Resolve URL and extract information
 * @param {string} url - The initial URL
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Object>} - Object with canonicalUrl, redirectChain, marshaCode, slug, isLive
 */
export async function resolveAndExtract(url, page) {
  const result = {
    canonicalUrl: url,
    redirectChain: [],
    marshaCode: '',
    slug: '',
    isLive: true
  };
  
  try {
    // Navigate to the URL and capture redirects
    const response = await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Get the final URL after redirects
    result.canonicalUrl = page.url();
    
    // Check if the page is live (status < 400)
    if (response && response.status() >= 400) {
      result.isLive = false;
    }
    
    // Extract Marsha code and slug from the canonical URL
    result.marshaCode = extractMarsha(result.canonicalUrl);
    result.slug = extractSlug(result.canonicalUrl);
    
    // Get redirect chain if available
    if (response && response.request().redirectChain) {
      result.redirectChain = response.request().redirectChain().map(req => req.url());
    }
    
  } catch (error) {
    // If navigation fails, mark as not live but still extract from original URL
    result.isLive = false;
    result.marshaCode = extractMarsha(url);
    result.slug = extractSlug(url);
  }
  
  return result;
}

/**
 * Validate if a URL is a valid Marriott hotel URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid Marriott hotel URL
 */
export function isValidMarriottUrl(url) {
  if (!url) return false;
  
  // Check if it's a Marriott domain
  const marriottPattern = /^https?:\/\/(www\.)?.*\.marriott\.com/i;
  if (!marriottPattern.test(url)) return false;
  
  // Check if it has a Marsha code
  const marshaCode = extractMarsha(url);
  return marshaCode.length >= 3 && marshaCode.length <= 6;
}

/**
 * Normalize URL to canonical form
 * @param {string} url - The URL to normalize
 * @returns {string} - Normalized URL
 */
export function normalizeUrl(url) {
  if (!url) return '';
  
  // Remove trailing slash
  let normalized = url.replace(/\/$/, '');
  
  // Ensure https
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  
  return normalized;
} 