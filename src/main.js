// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify';
// Web scraping and browser automation library (Read more at https://crawlee.dev)
import { PuppeteerCrawler } from 'crawlee';

// Import our universal scraper components
import { detectBrandFromUrl, validateUrlForBrand, getCrawlerConfig, PUPPETEER_LAUNCH_OPTIONS } from './config/index.js';
import { createStrategy } from './strategies/factory.js';
import { cleanAndValidateHotelData, removeDuplicateHotels, sortHotelsByMarsha } from './utils/data-cleaner.js';
import { handleDeadHotel, handleExtractionError, aggregateErrors } from './utils/error-handler.js';

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init();

// Get input parameters
const input = await Actor.getInput();

// Validate required input
if (!input.targetUrl) {
  throw new Error('targetUrl is required in input');
}

// Detect or validate brand
const brandKey = input.brandKey ? 
  validateUrlForBrand(input.targetUrl, input.brandKey) : 
  detectBrandFromUrl(input.targetUrl);

if (!brandKey) {
  throw new Error(`Unsupported domain: ${input.targetUrl}. Please provide a valid Marriott brand URL.`);
}

console.log(`🎯 Detected brand: ${brandKey} for URL: ${input.targetUrl}`);

// Get crawler configuration
const crawlerConfig = getCrawlerConfig(input);

// Create proxy configuration
const proxyConfiguration = await Actor.createProxyConfiguration();

// Create dataset for results
const dataset = await Actor.openDataset();

// Initialize results tracking
const results = {
  hotels: [],
  errors: [],
  metadata: {
    total_hotels: 0,
    source_url: input.targetUrl,
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

// Create a PuppeteerCrawler
const crawler = new PuppeteerCrawler({
  proxyConfiguration,
  maxRequestsPerCrawl: 1, // We only need to visit one page
  maxConcurrency: crawlerConfig.maxConcurrency,
  maxRequestRetries: crawlerConfig.maxRequestRetries,
  navigationTimeoutSecs: crawlerConfig.navigationTimeoutSecs,
  requestHandler: async ({ page, log, request }) => {
    const startTime = Date.now();
    log.info(`🚀 Starting scrape of ${request.url}`);
    
    try {
      // Set viewport for better rendering
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to the target URL
      await page.goto(request.url, { 
        waitUntil: 'networkidle0',
        timeout: crawlerConfig.navigationTimeoutSecs * 1000
      });
      
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
      log.error(`❌ Scraping failed: ${error.message}`);
      
      const errorObj = handleExtractionError(request.url, error);
      results.errors.push(errorObj);
      await dataset.pushData({ type: 'error', ...errorObj });
    }
  },
  failedRequestHandler: async ({ request, error, log }) => {
    log.error(`❌ Request failed: ${request.url} - ${error.message}`);
    
    const errorObj = handleExtractionError(request.url, error);
    results.errors.push(errorObj);
    await dataset.pushData({ type: 'error', ...errorObj });
  },
  launchContext: {
    launchOptions: PUPPETEER_LAUNCH_OPTIONS,
  },
});

// Run the crawler with the target URL
await crawler.run([{ url: input.targetUrl }]);

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

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit();