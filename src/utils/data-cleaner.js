/**
 * Data Cleaner Utility
 * Cleans and validates extracted hotel data
 */

/**
 * Clean and normalize text
 * @param {string} text - Raw text to clean
 * @returns {string} - Cleaned text
 */
export function cleanText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\t+/g, ' ') // Replace tabs with spaces
    .trim();
}

/**
 * Clean and normalize URL
 * @param {string} url - Raw URL to clean
 * @returns {string} - Cleaned URL
 */
export function cleanUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  let cleaned = url.trim();
  
  // Ensure https
  if (cleaned.startsWith('http://')) {
    cleaned = cleaned.replace('http://', 'https://');
  }
  
  // Remove trailing slash
  cleaned = cleaned.replace(/\/$/, '');
  
  return cleaned;
}

/**
 * Clean Marsha code
 * @param {string} marshaCode - Raw Marsha code
 * @returns {string} - Cleaned Marsha code
 */
export function cleanMarshaCode(marshaCode) {
  if (!marshaCode || typeof marshaCode !== 'string') {
    return '';
  }
  
  // Extract only alphanumeric characters and convert to uppercase
  const cleaned = marshaCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // Validate length (3-6 characters)
  if (cleaned.length < 3 || cleaned.length > 6) {
    return '';
  }
  
  return cleaned;
}

/**
 * Clean slug
 * @param {string} slug - Raw slug
 * @returns {string} - Cleaned slug
 */
export function cleanSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return '';
  }
  
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Validate hotel data object
 * @param {Object} hotelData - Hotel data to validate
 * @returns {Object} - Validation result with isValid flag and errors array
 */
export function validateHotelData(hotelData) {
  const errors = [];
  
  // Required fields
  if (!hotelData.hotel_name || !cleanText(hotelData.hotel_name)) {
    errors.push('hotel_name is required and cannot be empty');
  }
  
  if (!hotelData.url || !cleanUrl(hotelData.url)) {
    errors.push('url is required and must be a valid URL');
  }
  
  if (!hotelData.marsha_code || !cleanMarshaCode(hotelData.marsha_code)) {
    errors.push('marsha_code is required and must be 3-6 characters');
  }
  
  if (!hotelData.brand_name || !cleanText(hotelData.brand_name)) {
    errors.push('brand_name is required and cannot be empty');
  }
  
  if (!hotelData.brand_code || !cleanText(hotelData.brand_code)) {
    errors.push('brand_code is required and cannot be empty');
  }
  
  if (typeof hotelData.is_live !== 'boolean') {
    errors.push('is_live must be a boolean value');
  }
  
  if (!hotelData.extracted_at || !isValidISODate(hotelData.extracted_at)) {
    errors.push('extracted_at must be a valid ISO date string');
  }
  
  if (!hotelData.source_url || !cleanUrl(hotelData.source_url)) {
    errors.push('source_url is required and must be a valid URL');
  }
  
  // Optional fields validation
  if (hotelData.confidence_score !== undefined) {
    if (typeof hotelData.confidence_score !== 'number' || 
        hotelData.confidence_score < 0 || 
        hotelData.confidence_score > 1) {
      errors.push('confidence_score must be a number between 0 and 1');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if string is valid ISO date
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid ISO date
 */
function isValidISODate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString.includes('T');
}

/**
 * Clean and validate hotel data
 * @param {Object} hotelData - Raw hotel data
 * @returns {Object} - Cleaned and validated hotel data
 */
export function cleanAndValidateHotelData(hotelData) {
  // Clean the data
  const cleaned = {
    hotel_name: cleanText(hotelData.hotel_name),
    url: cleanUrl(hotelData.url),
    initial_url: hotelData.initial_url ? cleanUrl(hotelData.initial_url) : undefined,
    marsha_code: cleanMarshaCode(hotelData.marsha_code),
    slug: cleanSlug(hotelData.slug),
    brand_name: cleanText(hotelData.brand_name),
    brand_code: cleanText(hotelData.brand_code),
    sub_brand_code: hotelData.sub_brand_code ? cleanText(hotelData.sub_brand_code) : undefined,
    is_live: Boolean(hotelData.is_live),
    location: hotelData.location ? cleanText(hotelData.location) : undefined,
    city: hotelData.city ? cleanText(hotelData.city) : undefined,
    country: hotelData.country ? cleanText(hotelData.country) : undefined,
    region: hotelData.region ? cleanText(hotelData.region) : undefined,
    extracted_at: hotelData.extracted_at || new Date().toISOString(),
    source_url: cleanUrl(hotelData.source_url),
    confidence_score: hotelData.confidence_score !== undefined ? 
      Math.max(0, Math.min(1, Number(hotelData.confidence_score))) : 1.0
  };
  
  // Validate the cleaned data
  const validation = validateHotelData(cleaned);
  
  return {
    data: cleaned,
    isValid: validation.isValid,
    errors: validation.errors
  };
}

/**
 * Remove duplicate hotels based on Marsha code
 * @param {Array} hotels - Array of hotel data
 * @returns {Array} - Array with duplicates removed
 */
export function removeDuplicateHotels(hotels) {
  const seen = new Set();
  const unique = [];
  
  for (const hotel of hotels) {
    const marshaCode = hotel.marsha_code?.toUpperCase();
    if (marshaCode && !seen.has(marshaCode)) {
      seen.add(marshaCode);
      unique.push(hotel);
    }
  }
  
  return unique;
}

/**
 * Sort hotels by Marsha code
 * @param {Array} hotels - Array of hotel data
 * @returns {Array} - Sorted array
 */
export function sortHotelsByMarsha(hotels) {
  return [...hotels].sort((a, b) => {
    const marshaA = a.marsha_code?.toUpperCase() || '';
    const marshaB = b.marsha_code?.toUpperCase() || '';
    return marshaA.localeCompare(marshaB);
  });
} 