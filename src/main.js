// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
// Web scraping and browser automation library (Read more at https://crawlee.dev)
import { PuppeteerCrawler } from 'crawlee';

// Import our universal scraper components
import { detectBrandFromUrl, validateUrlForBrand, getCrawlerConfig, PUPPETEER_LAUNCH_OPTIONS } from './config/index.js';
import { getBrandDirectoryUrl, getBrandKeyFromSelection } from './config/brand-urls.js';
import { createStrategy } from './strategies/factory.js';
import { cleanAndValidateHotelData, removeDuplicateHotels, sortHotelsByMarsha } from './utils/data-cleaner.js';
import { handleDeadHotel, handleExtractionError, aggregateErrors } from './utils/error-handler.js';
import { classifyError, sanitizeData, createTimeline, generateStealthConfig, ERROR_TYPES } from './utils/error-classifier.js';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

// Get input parameters
const input = await Actor.getInput();

// Validate required input
if (!input.brandSelection) {
  throw new Error('brandSelection is required in input');
}

// Determine the target URL
let targetUrl;
let brandKey;

if (input.targetUrl) {
  // If manual URL is provided, use it and detect brand
  targetUrl = input.targetUrl;
  brandKey = input.brandKey ? 
    validateUrlForBrand(input.targetUrl, input.brandKey) : 
    detectBrandFromUrl(input.targetUrl);
    
  if (!brandKey) {
    throw new Error(`Unsupported domain: ${input.targetUrl}. Please provide a valid Marriott brand URL.`);
  }
} else {
  // Use the brand selection to get the directory URL
  targetUrl = getBrandDirectoryUrl(input.brandSelection);
  brandKey = getBrandKeyFromSelection(input.brandSelection);
}

console.log(`🎯 Using brand: ${brandKey} for URL: ${targetUrl}`);

// Get crawler configuration
const crawlerConfig = getCrawlerConfig(input);

// Create proxy configuration based on user selection
let proxyConfiguration;
let usingProxy = false; // Track actual proxy state
let proxyType = 'none'; // Track actual proxy type

try {
    if (input.proxyType === 'residential') {
        console.log('🌐 Using residential proxies for better anti-bot evasion');
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: ['RESIDENTIAL']
        });
        proxyType = 'residential';
    } else if (input.proxyType === 'datacenter') {
        console.log('🌐 Using datacenter proxies (default)');
        proxyConfiguration = await Actor.createProxyConfiguration({
            groups: ['DATACENTER']
        });
        proxyType = 'datacenter';
    } else {
        console.log('🌐 No proxies selected, proceeding without proxies');
        proxyConfiguration = null;
        proxyType = 'none';
    }
    
    // Validate proxy configuration
    if (proxyConfiguration && !proxyConfiguration.newUrlFunction) {
        console.warning('⚠️ Proxy configuration created but no proxy groups available');
        proxyConfiguration = null;
        proxyType = 'none';
    }
    
    // Set the actual proxy state
    usingProxy = proxyConfiguration !== null;
    
} catch (error) {
    console.warning('⚠️ Failed to create proxy configuration:', error.message);
    console.log('🌐 Proceeding without proxies');
    proxyConfiguration = null;
    proxyType = 'none';
    usingProxy = false;
}

// Create dataset for results
const dataset = await Actor.openDataset();

// Initialize results tracking
const results = {
  hotels: [],
  errors: [],
  metadata: {
    total_hotels: 0,
    source_url: targetUrl,
    scraped_at: new Date().toISOString(),
    execution_time_ms: 0,
    brand_key: brandKey,
    errors: []
  }
};

// Create strategy instance
const strategy = await createStrategy(brandKey, {
  brandInfo: {
    name: brandKey,
    code: brandKey.toUpperCase()
  }
});

console.log(`📋 Using strategy: ${strategy.constructor.name}`);

// Create crawler options with enhanced timeout handling
const crawlerOptions = {
  maxRequestsPerCrawl: 1, // We only need to visit one page
  maxConcurrency: crawlerConfig.maxConcurrency,
  maxRequestRetries: crawlerConfig.maxRequestRetries,
  navigationTimeoutSecs: crawlerConfig.navigationTimeoutSecs,
  // Separate timeout for request handler processing
  requestHandlerTimeoutSecs: crawlerConfig.navigationTimeoutSecs + 30, // Give extra time for processing
};

// Only add proxy configuration if it exists
if (proxyConfiguration) {
  crawlerOptions.proxyConfiguration = proxyConfiguration;
}

// Track execution start time
const startTime = Date.now();

// Create a PuppeteerCrawler
const crawler = new PuppeteerCrawler({
  ...crawlerOptions,
  requestHandler: async ({ page, log, request }) => {
    const timeline = createTimeline();
    const requestId = Math.random().toString(36).substring(7);
    const stealthConfig = generateStealthConfig();
    
    // Use actual proxy state instead of input
    const proxyInfo = usingProxy ? `${proxyType} proxy` : 'no proxy';
    log.info(`🚀 [${requestId}] Starting scrape of ${request.url} with ${proxyInfo}`);
    
    // Set up comprehensive error monitoring
    let navigationTimeout = false;
    let responseStatus = null;
    let responseHeaders = null;
    let responseBody = null;
    let consoleErrors = [];
    let networkErrors = [];
    let pageErrors = [];
    let harData = null;
    
    // 1. Capture HTTP status and early failures
    page.on('response', (response) => {
      responseStatus = response.status();
      responseHeaders = sanitizeData({ headers: response.headers() }).headers;
      
      const stage = timeline.mark('response_received');
      log.info(`📡 [${requestId}] Response: ${response.status()} ${response.url()} (${stage.elapsed}ms)`);
      
      // Capture response body for classification with enhanced error handling
      response.text().then(text => {
        try {
          responseBody = text;
          const classification = classifyError({
            statusCode: response.status(),
            responseBody: text,
            consoleErrors,
            networkErrors,
            pageErrors,
            navigationTimeout,
            errorMessage: null,
            url: request.url
          });
          
          if (classification.type !== ERROR_TYPES.UNKNOWN_TIMEOUT) {
            log.warning(`🔍 [${requestId}] Error classification: ${classification.type} (${classification.confidence} confidence)`);
            if (classification.suggestedAction) {
              log.info(`💡 [${requestId}] Suggested action: ${classification.suggestedAction}`);
            }
            if (classification.backoffHint) {
              log.info(`⏰ [${requestId}] Backoff hint: ${classification.backoffHint.suggestedDelay}ms`);
            }
          }
        } catch (classificationError) {
          // Don't let classification errors crash the request
          log.warning(`🔍 [${requestId}] Error classification failed: ${classificationError.message}`);
        }
      }).catch((responseError) => {
        log.warning(`📄 [${requestId}] Failed to capture response body for classification: ${responseError.message}`);
      });
    });
    
    // 2. Log network and page console events
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
          url: msg.location()?.url || 'unknown'
        });
        log.warning(`⚠️ [${requestId}] Console error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', (error) => {
      pageErrors.push({
        message: error.message,
        stack: error.stack
      });
      log.error(`💥 [${requestId}] Page error: ${error.message}`);
    });
    
    // 3. Capture network failures with better classification
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText || 'unknown';
      const url = request.url();
      
      // Classify network failures to reduce noise
      const isThirdPartyAbort = failure === 'net::ERR_ABORTED' && 
        (url.includes('analytics') || url.includes('tagmanager') || url.includes('consent') || url.includes('privacy'));
      
      networkErrors.push({
        url: url,
        failure: failure,
        method: request.method(),
        isThirdParty: isThirdPartyAbort
      });
      
      // Only log non-third-party aborts as errors
      if (!isThirdPartyAbort) {
        log.error(`🌐 [${requestId}] Request failed: ${url} - ${failure}`);
      } else {
        log.info(`🌐 [${requestId}] Third-party request aborted: ${url} (expected)`);
      }
    });
    
    try {
      // Health check: verify logger methods exist
      if (typeof log.warning !== 'function') {
        log.error(`🚨 [${requestId}] Logger health check failed: log.warning not available`);
        // Fallback to console.warning if needed
        log.warning = console.warning || console.warn || (() => {});
      }
      
      // Set stealth configuration
      await page.setViewport(stealthConfig.viewport);
      await page.setUserAgent(stealthConfig.userAgent);
      
      const stage = timeline.mark('browser_configured');
      log.info(`🌐 [${requestId}] Stealth config applied: ${stealthConfig.viewport.width}x${stealthConfig.viewport.height} (${stage.elapsed}ms)`);
      
      // 4. Enable network monitoring and HAR recording
      const client = await page.target().createCDPSession();
      await client.send('Network.enable');
      
      // Enable HAR recording if debug mode is on
      if (input.enableDebugMode) {
        log.info(`🔍 [${requestId}] Debug mode enabled - recording HAR`);
        try {
          await client.send('Page.enable');
        } catch (harError) {
          log.warning(`📊 [${requestId}] HAR recording failed: ${harError.message}`);
        }
      }
      
                // Navigate to the target URL with enhanced error handling
    try {
      const navStage = timeline.mark('navigation_started');
      log.info(`🧭 [${requestId}] Navigating to ${request.url} (${navStage.elapsed}ms)`);

      const response = await page.goto(request.url, {
        waitUntil: 'domcontentloaded',
        timeout: crawlerConfig.navigationTimeoutSecs * 1000,
      });

      // Fail-fast on terminal HTTP statuses from main document
      if (response) {
        const status = response.status();
        responseStatus = status;
        responseHeaders = sanitizeData({ headers: response.headers() }).headers;
        log.info(`📡 [${requestId}] Main response status: ${status} ${request.url}`);
        if ([403, 404, 429].includes(status)) {
          log.warning(`🚫 [${requestId}] Terminal HTTP status ${status} received; aborting early.`);
          if (status === 404) {
            request.noRetry = true; // don't retry not-found
          }
          // Optional: attach backoff hint/mark rate limit
          const msg = `HTTP ${status}`;
          throw new Error(msg);
        }
      }

      // Add timing jitter for stealth
      await page.waitForTimeout(stealthConfig.timingJitter);

      const successStage = timeline.mark('navigation_complete');
      log.info(`✅ [${requestId}] Navigation successful (${successStage.elapsed}ms total)`);
    } catch (navError) {
        navigationTimeout = true;
        const errorStage = timeline.mark('navigation_failed');
        log.error(`⏰ [${requestId}] Navigation failed: ${navError.message} (${errorStage.elapsed}ms)`);
        
        // Capture partial HTML for debugging
        try {
          const html = await page.content();
          const sanitizedHtml = sanitizeData({ html }).html;
          log.debug(`📄 [${requestId}] Partial HTML: ${sanitizedHtml}`);
          
          // Classify the error with full context
          const classification = classifyError({
            statusCode: responseStatus,
            responseBody: responseBody || html,
            consoleErrors,
            networkErrors,
            pageErrors,
            navigationTimeout: true,
            errorMessage: navError.message,
            url: request.url
          });
          
          log.error(`🔍 [${requestId}] Final classification: ${classification.type} (${classification.confidence} confidence)`);
          
          // Export limited HAR if debug mode is enabled
          if (input.enableDebugMode) {
            try {
              const har = await client.send('Network.getResponseBodyForInterception', {});
              harData = sanitizeData({ har }).har;
              log.info(`📊 [${requestId}] Limited HAR data captured (${JSON.stringify(harData).length} bytes)`);
            } catch (harError) {
              log.warning(`📊 [${requestId}] HAR capture failed: ${harError.message}`);
            }
          }
        } catch (htmlError) {
          log.error(`📄 [${requestId}] Failed to capture HTML: ${htmlError.message}`);
        }
        
        throw navError;
      }
      
      // Add delay between requests if specified
      if (crawlerConfig.requestDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, crawlerConfig.requestDelayMs));
      }
      
      // Create scraping context
      const context = {
        maxPages: crawlerConfig.maxPages,
        brandKey,
        sourceUrl: request.url
      };
      
      // Execute strategy to scrape hotels
      const scrapedHotels = await strategy.scrape(page, context);
      
      // Process and validate each hotel
      for (const hotel of scrapedHotels) {
        try {
          const { data: cleanedHotel, isValid, errors } = cleanAndValidateHotelData(hotel);
          
          if (isValid) {
            results.hotels.push(cleanedHotel);
            
            // Push to dataset immediately for streaming
            await dataset.pushData(cleanedHotel);
          } else {
            // Handle validation errors
            const errorObj = handleExtractionError(
              hotel.url || 'unknown',
              new Error(`Validation failed: ${errors.join(', ')}`)
            );
            results.errors.push(errorObj);
            await dataset.pushData({ type: 'error', ...errorObj });
          }
        } catch (error) {
          // Handle extraction errors
          const errorObj = handleExtractionError(
            hotel.url || 'unknown',
            error
          );
          results.errors.push(errorObj);
          await dataset.pushData({ type: 'error', ...errorObj });
        }
      }
      
      // Remove duplicates and sort
      results.hotels = removeDuplicateHotels(results.hotels);
      results.hotels = sortHotelsByMarsha(results.hotels);
      
      // Update metadata
      results.metadata.total_hotels = results.hotels.length;
      results.metadata.execution_time_ms = Date.now() - startTime;
      results.metadata.errors = aggregateErrors(results.errors);
      
      log.info(`✅ Scraped ${results.hotels.length} hotels in ${results.metadata.execution_time_ms}ms`);
      log.info(`❌ Encountered ${results.errors.length} errors`);
      
         } catch (error) {
       const finalStage = timeline.mark('scraping_failed');
       log.error(`❌ [${requestId}] Scraping failed: ${error.message} (${finalStage.elapsed}ms total)`);
       
       // Final error classification with graceful fallback
       let finalClassification;
       try {
         finalClassification = classifyError({
           statusCode: responseStatus,
           responseBody,
           consoleErrors,
           networkErrors,
           pageErrors,
           navigationTimeout,
           errorMessage: error.message,
           url: request.url
         });
       } catch (classificationError) {
         log.warning(`🔍 [${requestId}] Final classification failed: ${classificationError.message}`);
         // Fallback classification
         finalClassification = {
           type: 'UNKNOWN_ERROR',
           confidence: 'low',
           suggestedAction: 'retry_with_delay',
           backoffHint: { suggestedDelay: 5000 }
         };
       }
       
       // Enhanced error object with classification and timeline
       const enhancedError = {
         ...handleExtractionError(request.url, error),
         classification: finalClassification,
         timeline: {
           totalElapsed: timeline.getElapsed(),
           stages: [
             { stage: 'start', elapsed: 0 },
             { stage: 'browser_configured', elapsed: timeline.mark('browser_configured').elapsed },
             { stage: 'navigation_started', elapsed: timeline.mark('navigation_started').elapsed },
             { stage: 'navigation_complete', elapsed: timeline.mark('navigation_complete').elapsed },
             { stage: 'scraping_failed', elapsed: finalStage.elapsed }
           ]
         },
         debug: {
           requestId,
           navigationTimeout,
           responseStatus,
           responseHeaders: responseHeaders ? Object.keys(responseHeaders) : null,
           consoleErrors: consoleErrors.length,
           networkErrors: networkErrors.length,
           pageErrors: pageErrors.length,
           proxyType: proxyType,
           usingProxy,
           stealthConfig: {
             viewport: stealthConfig.viewport,
             userAgent: stealthConfig.userAgent.substring(0, 50) + '...'
           },
           harData: harData ? 'captured' : null,
           diagnosticsHealth: 'healthy',
           timestamp: new Date().toISOString()
         }
       };
       
       results.errors.push(enhancedError);
       await dataset.pushData({ type: 'error', ...enhancedError });
       
       // Log classification and suggested actions
       log.error(`🔍 [${requestId}] Final classification: ${finalClassification.type} (${finalClassification.confidence} confidence)`);
       if (finalClassification.suggestedAction) {
         log.info(`💡 [${requestId}] Suggested action: ${finalClassification.suggestedAction}`);
       }
       if (finalClassification.backoffHint) {
         log.info(`⏰ [${requestId}] Backoff hint: ${finalClassification.backoffHint.suggestedDelay}ms`);
       }
     }
  },
  failedRequestHandler: async ({ request, error, log }) => {
    log.error(`❌ Request failed: ${request.url} - ${error.message}`);

    // Fast-fail logic: prevent retry on 404
    if (error.message.includes('HTTP 404')) {
      request.noRetry = true;
    }

    // Enhanced error object for failed requests
    const enhancedError = {
      ...handleExtractionError(request.url, error),
      debug: {
        requestId: Math.random().toString(36).substring(7),
        errorType: 'request_failed',
        proxyType: proxyType,
        usingProxy,
        timestamp: new Date().toISOString(),
        errorDetails: {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
        }
      }
    };
    
    results.errors.push(enhancedError);
    await dataset.pushData({ type: 'error', ...enhancedError });
  },
  launchContext: {
    launchOptions: {
      ...PUPPETEER_LAUNCH_OPTIONS,
      // Additional options for better stealth and stability
      args: [
        ...(PUPPETEER_LAUNCH_OPTIONS.args || []),
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    },
  },
});

// Run the crawler with the target URL
await crawler.run([{ url: targetUrl }]);

// Push final results to dataset
await dataset.pushData({
  type: 'metadata',
  ...results.metadata
});

// Log final results
console.log('\n📊 Final Results:');
console.log(`  Total hotels: ${results.metadata.total_hotels}`);
console.log(`  Execution time: ${results.metadata.execution_time_ms}ms`);
console.log(`  Errors: ${results.errors.length}`);
console.log(`  Brand: ${brandKey}`);
console.log(`  Proxy type: ${proxyType} (${usingProxy ? 'active' : 'inactive'})`);

// Log error breakdown if there are errors
if (results.errors.length > 0) {
  console.log('\n🔍 Error Analysis:');
  
  // Group by classification type
  const classifications = results.errors.reduce((acc, error) => {
    const type = error.classification?.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(classifications).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  // Show confidence levels
  const confidenceLevels = results.errors.reduce((acc, error) => {
    const confidence = error.classification?.confidence || 'unknown';
    acc[confidence] = (acc[confidence] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📊 Confidence Levels:');
  Object.entries(confidenceLevels).forEach(([confidence, count]) => {
    console.log(`  ${confidence}: ${count}`);
  });
  
  // Show suggested actions
  const suggestedActions = results.errors.reduce((acc, error) => {
    const action = error.classification?.suggestedAction || 'none';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n💡 Suggested Actions:');
  Object.entries(suggestedActions).forEach(([action, count]) => {
    console.log(`  ${action}: ${count}`);
  });
  
  // Show proxy-related errors
  const proxyErrors = results.errors.filter(e => e.debug?.proxyType);
  if (proxyErrors.length > 0) {
    console.log(`\n🌐 Proxy-related errors: ${proxyErrors.length}`);
  }
  
  // Show diagnostics health summary
  const diagnosticsErrors = results.errors.filter(e => 
    e.debug?.errorType === 'classification_failed' || 
    e.debug?.errorType === 'response_body_capture_failed'
  );
  
  if (diagnosticsErrors.length > 0) {
    console.log(`\n🔍 Diagnostics subsystem issues: ${diagnosticsErrors.length}`);
    console.log('   - Some error classification or response capture failed');
    console.log('   - This may affect error analysis quality');
  } else {
    console.log('\n✅ Diagnostics subsystem: healthy');
  }
}

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();