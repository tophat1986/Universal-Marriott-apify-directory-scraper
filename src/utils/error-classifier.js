/**
 * Error Classification Utility
 * Normalizes raw signals into a fixed set of error types for downstream alerting/metrics
 */

export const ERROR_TYPES = {
  BLOCKED: 'blocked',
  RATE_LIMITED: 'rate_limited', 
  SLOW_LOAD: 'slow_load',
  NETWORK_ERROR: 'network_error',
  CHALLENGE_PAGE: 'challenge_page',
  UNKNOWN_TIMEOUT: 'unknown_timeout',
  VALIDATION_ERROR: 'validation_error',
  EXTRACTION_ERROR: 'extraction_error'
};

export const CHALLENGE_INDICATORS = {
  CLOUDFLARE: ['Checking your browser', 'Cloudflare', 'cf-ray'],
  AKAMAI: ['Akamai', 'challenge', 'akamai-gtm'],
  CAPTCHA: ['captcha', 'CAPTCHA', 'recaptcha', 'hcaptcha'],
  BOT_DETECTION: ['bot', 'automation', 'suspicious', 'security check']
};

export const BLOCKING_STATUS_CODES = {
  403: 'forbidden',
  429: 'rate_limited', 
  503: 'service_unavailable',
  451: 'unavailable_for_legal_reasons'
};

/**
 * Classify error based on multiple signals
 */
export function classifyError({
  statusCode,
  responseBody,
  consoleErrors,
  networkErrors,
  pageErrors,
  navigationTimeout,
  errorMessage,
  url
}) {
  const signals = {
    statusCode,
    hasChallengePage: false,
    hasBlockingStatus: false,
    hasNetworkFailures: false,
    hasConsoleErrors: false,
    hasPageErrors: false,
    isTimeout: false
  };

  // Check status codes
  if (statusCode && BLOCKING_STATUS_CODES[statusCode]) {
    signals.hasBlockingStatus = true;
  }

  // Check for challenge pages
  if (responseBody) {
    const bodyLower = responseBody.toLowerCase();
    for (const [challengeType, indicators] of Object.entries(CHALLENGE_INDICATORS)) {
      if (indicators.some(indicator => bodyLower.includes(indicator.toLowerCase()))) {
        signals.hasChallengePage = true;
        break;
      }
    }
  }

  // Check network failures
  if (networkErrors && networkErrors.length > 0) {
    signals.hasNetworkFailures = true;
  }

  // Check console/page errors
  if (consoleErrors && consoleErrors.length > 0) {
    signals.hasConsoleErrors = true;
  }
  if (pageErrors && pageErrors.length > 0) {
    signals.hasPageErrors = true;
  }

  // Check for timeout
  if (navigationTimeout || (errorMessage && errorMessage.includes('timeout'))) {
    signals.isTimeout = true;
  }

  // Classification logic
  if (signals.hasChallengePage) {
    return {
      type: ERROR_TYPES.CHALLENGE_PAGE,
      confidence: 'high',
      signals,
      suggestedAction: 'use_residential_proxy'
    };
  }

  if (statusCode === 429) {
    return {
      type: ERROR_TYPES.RATE_LIMITED,
      confidence: 'high',
      signals,
      suggestedAction: 'exponential_backoff',
      backoffHint: calculateBackoffHint()
    };
  }

  if (statusCode === 403 || statusCode === 451) {
    return {
      type: ERROR_TYPES.BLOCKED,
      confidence: 'high',
      signals,
      suggestedAction: 'rotate_proxy'
    };
  }

  if (signals.hasNetworkFailures) {
    return {
      type: ERROR_TYPES.NETWORK_ERROR,
      confidence: 'medium',
      signals,
      suggestedAction: 'retry_with_delay'
    };
  }

  if (signals.isTimeout && !signals.hasChallengePage) {
    return {
      type: ERROR_TYPES.SLOW_LOAD,
      confidence: 'medium',
      signals,
      suggestedAction: 'increase_timeout'
    };
  }

  if (signals.isTimeout) {
    return {
      type: ERROR_TYPES.UNKNOWN_TIMEOUT,
      confidence: 'low',
      signals,
      suggestedAction: 'enable_debug_mode'
    };
  }

  return {
    type: ERROR_TYPES.UNKNOWN_TIMEOUT,
    confidence: 'low',
    signals,
    suggestedAction: 'enable_debug_mode'
  };
}

/**
 * Calculate backoff hint for rate limiting
 */
function calculateBackoffHint() {
  const baseDelay = 5000; // 5 seconds
  const maxDelay = 300000; // 5 minutes
  const jitter = Math.random() * 0.3 + 0.85; // 85-115% of base delay
  
  return {
    baseDelay,
    maxDelay,
    jitter,
    suggestedDelay: Math.min(baseDelay * jitter, maxDelay)
  };
}

/**
 * Sanitize sensitive data from headers and response
 */
export function sanitizeData(data, options = {}) {
  const {
    removeHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'],
    maxHtmlLength = 1000,
    maxHarSize = 50000
  } = options;

  if (!data) return data;

  const sanitized = { ...data };

  // Sanitize headers
  if (sanitized.headers) {
    const cleanHeaders = {};
    for (const [key, value] of Object.entries(sanitized.headers)) {
      if (!removeHeaders.includes(key.toLowerCase())) {
        cleanHeaders[key] = value;
      } else {
        cleanHeaders[key] = '[REDACTED]';
      }
    }
    sanitized.headers = cleanHeaders;
  }

  // Truncate HTML
  if (sanitized.html && typeof sanitized.html === 'string') {
    sanitized.html = sanitized.html.slice(0, maxHtmlLength);
    if (sanitized.html.length >= maxHtmlLength) {
      sanitized.html += '... [TRUNCATED]';
    }
  }

  // Limit HAR size
  if (sanitized.har && typeof sanitized.har === 'object') {
    sanitized.har = truncateHar(sanitized.har, maxHarSize);
  }

  return sanitized;
}

/**
 * Truncate HAR to reasonable size
 */
function truncateHar(har, maxSize) {
  if (!har.entries || !Array.isArray(har.entries)) {
    return har;
  }

  // Keep only the last 10 requests and filter out large binary resources
  const filteredEntries = har.entries
    .slice(-10)
    .filter(entry => {
      const size = entry.response?.bodySize || 0;
      const contentType = entry.response?.content?.mimeType || '';
      return size < 10000 && !contentType.includes('image') && !contentType.includes('video');
    });

  return {
    ...har,
    entries: filteredEntries
  };
}

/**
 * Generate monotonic timestamps for correlation
 */
export function createTimeline() {
  const startTime = Date.now();
  
  return {
    start: startTime,
    mark: (stage) => ({
      stage,
      timestamp: Date.now(),
      elapsed: Date.now() - startTime
    }),
    getElapsed: () => Date.now() - startTime
  };
}

/**
 * Generate stealth variations
 */
export function generateStealthConfig() {
  const viewportVariations = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  return {
    viewport: viewportVariations[Math.floor(Math.random() * viewportVariations.length)],
    userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
    timingJitter: Math.random() * 2000 + 1000 // 1-3 seconds
  };
} 