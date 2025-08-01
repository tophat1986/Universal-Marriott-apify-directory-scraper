// Crawler configuration settings
export const RATE_PROFILES = {
  slow: {
    requestDelayMs: 2000,
    maxConcurrency: 1,
    description: 'Slow crawl with 2s delay, 1 concurrent request'
  },
  normal: {
    requestDelayMs: 1000,
    maxConcurrency: 10,
    description: 'Normal crawl with 1s delay, 10 concurrent requests'
  },
  fast: {
    requestDelayMs: 500,
    maxConcurrency: 20,
    description: 'Fast crawl with 0.5s delay, 20 concurrent requests'
  }
};

// Default crawler settings
export const DEFAULT_CRAWLER_CONFIG = {
  maxRequestRetries: 2,
  navigationTimeoutSecs: 60,
  maxPages: 10,
  respectRobotsTxt: true,
  rateProfile: 'normal'
};

// Function to get crawler configuration based on input
export function getCrawlerConfig(input) {
  const config = { ...DEFAULT_CRAWLER_CONFIG };
  
  // Apply rate profile if specified
  if (input.rateProfile && RATE_PROFILES[input.rateProfile]) {
    const profile = RATE_PROFILES[input.rateProfile];
    config.requestDelayMs = profile.requestDelayMs;
    config.maxConcurrency = profile.maxConcurrency;
  }
  
  // Override with explicit settings if provided
  if (input.maxRequestRetries !== undefined) {
    config.maxRequestRetries = input.maxRequestRetries;
  }
  
  if (input.navigationTimeoutSecs !== undefined) {
    config.navigationTimeoutSecs = input.navigationTimeoutSecs;
  }
  
  if (input.maxPages !== undefined) {
    config.maxPages = input.maxPages;
  }
  
  if (input.maxConcurrency !== undefined) {
    config.maxConcurrency = input.maxConcurrency;
  }
  
  if (input.requestDelayMs !== undefined) {
    config.requestDelayMs = input.requestDelayMs;
  }
  
  if (input.respectRobotsTxt !== undefined) {
    config.respectRobotsTxt = input.respectRobotsTxt;
  }
  
  return config;
}

// Puppeteer launch options for Docker compatibility
export const PUPPETEER_LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--disable-gpu', // Mitigates the "crashing GPU process" issue in Docker containers
    '--no-sandbox', // Mitigates the "sandboxed" process issue in Docker containers
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Overcome limited resource problems
  ],
}; 