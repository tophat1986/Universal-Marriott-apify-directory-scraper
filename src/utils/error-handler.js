/**
 * Error Handler Utility
 * Manages errors and failed requests for the scraper
 */

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  NAVIGATION: 'navigation_error',
  EXTRACTION: 'extraction_error',
  TIMEOUT: 'timeout_error',
  NETWORK: 'network_error',
  VALIDATION: 'validation_error',
  DEAD_HOTEL: 'dead_hotel'
};

/**
 * Create error object for dataset
 * @param {string} type - Error type
 * @param {string} message - Error message
 * @param {string} url - URL that caused the error
 * @param {string} marshaCode - Marsha code if available
 * @param {number} status - HTTP status code if available
 * @returns {Object} - Error object for dataset
 */
export function createErrorObject(type, message, url, marshaCode = '', status = null) {
  return {
    type,
    message,
    url,
    marsha_code: marshaCode,
    status,
    timestamp: new Date().toISOString()
  };
}

/**
 * Handle dead hotel detection
 * @param {string} url - Hotel URL
 * @param {string} marshaCode - Marsha code
 * @param {number} status - HTTP status code
 * @returns {Object} - Error object for dead hotel
 */
export function handleDeadHotel(url, marshaCode, status) {
  return createErrorObject(
    ERROR_TYPES.DEAD_HOTEL,
    `Hotel appears to be dead or removed from portfolio (Status: ${status})`,
    url,
    marshaCode,
    status
  );
}

/**
 * Handle navigation errors
 * @param {string} url - URL that failed
 * @param {Error} error - Original error
 * @returns {Object} - Error object
 */
export function handleNavigationError(url, error) {
  return createErrorObject(
    ERROR_TYPES.NAVIGATION,
    `Navigation failed: ${error.message}`,
    url
  );
}

/**
 * Handle extraction errors
 * @param {string} url - URL being processed
 * @param {Error} error - Original error
 * @returns {Object} - Error object
 */
export function handleExtractionError(url, error) {
  return createErrorObject(
    ERROR_TYPES.EXTRACTION,
    `Data extraction failed: ${error.message}`,
    url
  );
}

/**
 * Handle timeout errors
 * @param {string} url - URL that timed out
 * @param {number} timeout - Timeout duration
 * @returns {Object} - Error object
 */
export function handleTimeoutError(url, timeout) {
  return createErrorObject(
    ERROR_TYPES.TIMEOUT,
    `Request timed out after ${timeout}ms`,
    url
  );
}

/**
 * Handle network errors
 * @param {string} url - URL that failed
 * @param {Error} error - Original error
 * @returns {Object} - Error object
 */
export function handleNetworkError(url, error) {
  return createErrorObject(
    ERROR_TYPES.NETWORK,
    `Network error: ${error.message}`,
    url
  );
}

/**
 * Handle validation errors
 * @param {string} url - URL that failed validation
 * @param {string} reason - Validation failure reason
 * @returns {Object} - Error object
 */
export function handleValidationError(url, reason) {
  return createErrorObject(
    ERROR_TYPES.VALIDATION,
    `Validation failed: ${reason}`,
    url
  );
}

/**
 * Log error to console with appropriate level
 * @param {Object} errorObj - Error object
 * @param {string} level - Log level (info, warn, error)
 */
export function logError(errorObj, level = 'error') {
  const logMessage = `[${errorObj.type.toUpperCase()}] ${errorObj.message} - URL: ${errorObj.url}`;
  
  switch (level) {
    case 'info':
      console.info(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'error':
    default:
      console.error(logMessage);
      break;
  }
}

/**
 * Aggregate errors by type for reporting
 * @param {Array} errors - Array of error objects
 * @returns {Object} - Aggregated error counts by type
 */
export function aggregateErrors(errors) {
  const aggregated = {};
  
  errors.forEach(error => {
    const type = error.type || 'unknown';
    aggregated[type] = (aggregated[type] || 0) + 1;
  });
  
  return aggregated;
} 