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

// Non-critical resource types that shouldn't trigger network_error classification
export const NON_CRITICAL_RESOURCES = {
  IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'],
  FONTS: ['.woff', '.woff2', '.ttf', '.eot'],
  ANALYTICS: ['analytics', 'tagmanager', 'gtm', 'googletagmanager'],
  TRACKING: ['tracking', 'pixel', 'beacon'],
  CONSENT: ['consent', 'privacy', 'gdpr'],
  ADS: ['ads', 'advertising', 'doubleclick'],
  SOCIAL: ['facebook', 'twitter', 'linkedin', 'instagram'],
  CDN: ['cdn', 'static', 'assets']
};

// Debounce tracking for repeated suggestions
const suggestionDebounce = new Map();

/**
 * Check if a URL represents a non-critical resource
 */
function isNonCriticalResource(url, contentType = '') {
  const urlLower = url.toLowerCase();
  const contentTypeLower = contentType.toLowerCase();
  
  // Check file extensions
  for (const [category, patterns] of Object.entries(NON_CRITICAL_RESOURCES)) {
    if (patterns.some(pattern => urlLower.includes(pattern))) {
      return true;
    }
  }
  
  // Check content-type headers
  if (contentTypeLower.includes('image/') || 
      contentTypeLower.includes('font/') || 
      contentTypeLower.includes('text/css')) {
    return true;
  }
  
  return false;
}

/**
 * Debounce repeated suggestions to reduce log noise
 */
function shouldLogSuggestion(suggestion, requestId, cooldownMs = 5000) {
  const key = `${requestId}:${suggestion}`;
  const now = Date.now();
  const lastLog = suggestionDebounce.get(key);
  
  if (!lastLog || (now - lastLog) > cooldownMs) {
    suggestionDebounce.set(key, now);
    return true;
  }
  
  return false;
}

/**
 * Lightweight challenge detection for early fail-fast
 * Can be called after initial navigation to detect anti-bot challenges
 */
export async function detectChallengeEarly(page) {
  try {
    // Quick check for common challenge indicators in the current page
    const challengeChecks = [
      // Check page title
      () => page.title().then(title => {
        const titleLower = title.toLowerCase();
        return titleLower.includes('checking your browser') || 
               titleLower.includes('security check') ||
               titleLower.includes('cloudflare');
      }),
      
      // Check for challenge-related elements
      () => page.evaluate(() => {
        const bodyText = document.body?.textContent?.toLowerCase() || '';
        const hasChallenge = bodyText.includes('checking your browser') ||
                           bodyText.includes('cloudflare') ||
                           bodyText.includes('security check') ||
                           bodyText.includes('captcha') ||
                           bodyText.includes('suspicious');
        
        // Check for challenge-related elements
        const challengeElements = document.querySelectorAll(
          '[id*="challenge"], [class*="challenge"], [id*="captcha"], [class*="captcha"]'
        );
        
        return hasChallenge || challengeElements.length > 0;
      }),
      
      // Check for redirects to challenge pages
      () => page.url().then(url => {
        const urlLower = url.toLowerCase();
        return urlLower.includes('challenge') || 
               urlLower.includes('captcha') ||
               urlLower.includes('security');
      })
    ];
    
    // Run all checks in parallel
    const results = await Promise.all(challengeChecks.map(check => check().catch(() => false)));
    
    // If any check returns true, we have a challenge
    const hasChallenge = results.some(result => result === true);
    
    return {
      hasChallenge,
      confidence: hasChallenge ? 'high' : 'low',
      type: hasChallenge ? 'early_detection' : 'none'
    };
    
  } catch (error) {
    // If detection fails, assume no challenge (conservative approach)
    return {
      hasChallenge: false,
      confidence: 'low',
      type: 'detection_failed',
      error: error.message
    };
  }
}

/**
 * Classify error based on multiple signals with noise reduction
 */
export function classifyError({
  statusCode,
  responseBody,
  consoleErrors,
  networkErrors,
  pageErrors,
  navigationTimeout,
  errorMessage,
  url,
  contentType = '',
  requestId = null
}) {
  const signals = {
    statusCode,
    hasChallengePage: false,
    hasBlockingStatus: false,
    hasNetworkFailures: false,
    hasConsoleErrors: false,
    hasPageErrors: false,
    isTimeout: false,
    isNonCriticalResource: false
  };

  // Check if this is a non-critical resource
  signals.isNonCriticalResource = isNonCriticalResource(url, contentType);

  // Check status codes
  if (statusCode && BLOCKING_STATUS_CODES[statusCode]) {
    signals.hasBlockingStatus = true;
  }

  // Check for challenge pages (highest priority)
  if (responseBody) {
    const bodyLower = responseBody.toLowerCase();
    for (const [challengeType, indicators] of Object.entries(CHALLENGE_INDICATORS)) {
      if (indicators.some(indicator => bodyLower.includes(indicator.toLowerCase()))) {
        signals.hasChallengePage = true;
        break;
      }
    }
  }

  // Check network failures (filtered for critical resources)
  if (networkErrors && networkErrors.length > 0) {
    // Only count network failures for critical resources
    const criticalNetworkErrors = networkErrors.filter(error => 
      !isNonCriticalResource(error.url || url)
    );
    signals.hasNetworkFailures = criticalNetworkErrors.length > 0;
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

  // Classification logic with priority ordering
  if (signals.hasChallengePage) {
    const suggestion = 'use_residential_proxy';
    const shouldLog = requestId ? shouldLogSuggestion(suggestion, requestId) : true;
    
    return {
      type: ERROR_TYPES.CHALLENGE_PAGE,
      confidence: 'high',
      signals,
      suggestedAction: suggestion,
      shouldLog,
      isRootCause: true
    };
  }

  if (statusCode === 429) {
    const suggestion = 'exponential_backoff';
    const shouldLog = requestId ? shouldLogSuggestion(suggestion, requestId) : true;
    
    return {
      type: ERROR_TYPES.RATE_LIMITED,
      confidence: 'high',
      signals,
      suggestedAction: suggestion,
      backoffHint: calculateBackoffHint(),
      shouldLog,
      isRootCause: true
    };
  }

  if (statusCode === 403 || statusCode === 451) {
    const suggestion = 'rotate_proxy';
    const shouldLog = requestId ? shouldLogSuggestion(suggestion, requestId) : true;
    
    return {
      type: ERROR_TYPES.BLOCKED,
      confidence: 'high',
      signals,
      suggestedAction: suggestion,
      shouldLog,
      isRootCause: true
    };
  }

  // Only classify network errors for critical resources
  if (signals.hasNetworkFailures && !signals.isNonCriticalResource) {
    const suggestion = 'retry_with_delay';
    const shouldLog = requestId ? shouldLogSuggestion(suggestion, requestId, 10000) : true;
    
    return {
      type: ERROR_TYPES.NETWORK_ERROR,
      confidence: 'medium',
      signals,
      suggestedAction: suggestion,
      shouldLog,
      isRootCause: false
    };
  }

  if (signals.isTimeout && !signals.hasChallengePage) {
    const suggestion = 'increase_timeout';
    const shouldLog = requestId ? shouldLogSuggestion(suggestion, requestId) : true;
    
    return {
      type: ERROR_TYPES.SLOW_LOAD,
      confidence: 'medium',
      signals,
      suggestedAction: suggestion,
      shouldLog,
      isRootCause: false
    };
  }

  if (signals.isTimeout) {
    const suggestion = 'enable_debug_mode';
    const shouldLog = requestId ? shouldLogSuggestion(suggestion, requestId) : true;
    
    return {
      type: ERROR_TYPES.UNKNOWN_TIMEOUT,
      confidence: 'low',
      signals,
      suggestedAction: suggestion,
      shouldLog,
      isRootCause: false
    };
  }

  return {
    type: ERROR_TYPES.UNKNOWN_TIMEOUT,
    confidence: 'low',
    signals,
    suggestedAction: 'enable_debug_mode',
    shouldLog: false,
    isRootCause: false
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