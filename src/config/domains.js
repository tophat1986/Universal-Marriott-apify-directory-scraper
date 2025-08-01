// Domain patterns for brand detection
export const DOMAIN_PATTERNS = {
  ritzcarlton: /^https?:\/\/(www\.)?ritzcarlton\.com/i,
  stregis: /^https?:\/\/(www\.)?st-regis\.marriott\.com/i,
  marriottMain: /^https?:\/\/(www\.)?marriott(-hotels)?\.marriott\.com/i,
  sheraton: /^https?:\/\/(www\.)?sheraton\.com/i,
  westin: /^https?:\/\/(www\.)?westin\.com/i,
  w: /^https?:\/\/(www\.)?whotels\.com/i,
  luxurycollection: /^https?:\/\/(www\.)?luxurycollection\.com/i,
  edition: /^https?:\/\/(www\.)?editionhotels\.com/i,
  autograph: /^https?:\/\/(www\.)?autographhotels\.com/i,
  tributeportfolio: /^https?:\/\/(www\.)?tributeportfolio\.com/i,
  design: /^https?:\/\/(www\.)?designhotels\.com/i,
  bulgari: /^https?:\/\/(www\.)?bulgarihotels\.com/i,
  gaylord: /^https?:\/\/(www\.)?gaylordhotels\.com/i,
  renaissance: /^https?:\/\/(www\.)?renaissancehotels\.com/i,
  lemeridien: /^https?:\/\/(www\.)?lemeridien\.com/i,
  courtyard: /^https?:\/\/(www\.)?courtyard\.marriott\.com/i,
  springhill: /^https?:\/\/(www\.)?springhillsuites\.marriott\.com/i,
  fairfield: /^https?:\/\/(www\.)?fairfield\.marriott\.com/i,
  residenceinn: /^https?:\/\/(www\.)?residenceinn\.marriott\.com/i,
  towneplace: /^https?:\/\/(www\.)?towneplacesuites\.marriott\.com/i,
  achotels: /^https?:\/\/(www\.)?achotels\.marriott\.com/i,
  aloft: /^https?:\/\/(www\.)?aloft\.marriott\.com/i,
  moxy: /^https?:\/\/(www\.)?moxyhotels\.com/i,
  protea: /^https?:\/\/(www\.)?proteahotels\.com/i,
  cityexpress: /^https?:\/\/(www\.)?cityexpress\.marriott\.com/i,
  fourpoints: /^https?:\/\/(www\.)?fourpoints\.com/i,
  element: /^https?:\/\/(www\.)?elementhotels\.com/i,
  delta: /^https?:\/\/(www\.)?deltahotels\.com/i,
  sonder: /^https?:\/\/(www\.)?sonder\.com/i,
  apartments: /^https?:\/\/(www\.)?apartments\.marriott\.com/i,
  conferencecenters: /^https?:\/\/(www\.)?marriott\.com\/conference-centers/i
};

// Generic Marriott domain pattern for fallback
export const GENERIC_MARRIOTT_PATTERN = /^https?:\/\/(www\.)?.*\.marriott\.com/i;

// Function to detect brand from URL
export function detectBrandFromUrl(url) {
  for (const [brandKey, pattern] of Object.entries(DOMAIN_PATTERNS)) {
    if (pattern.test(url)) {
      return brandKey;
    }
  }
  
  // Fallback to generic if it matches any Marriott domain
  if (GENERIC_MARRIOTT_PATTERN.test(url)) {
    return 'generic';
  }
  
  return null;
}

// Function to validate URL against brand
export function validateUrlForBrand(url, brandKey) {
  if (!brandKey) {
    return detectBrandFromUrl(url);
  }
  
  const pattern = DOMAIN_PATTERNS[brandKey];
  if (!pattern) {
    throw new Error(`Unknown brand key: ${brandKey}`);
  }
  
  if (!pattern.test(url)) {
    throw new Error(`URL ${url} does not match brand ${brandKey}`);
  }
  
  return brandKey;
} 