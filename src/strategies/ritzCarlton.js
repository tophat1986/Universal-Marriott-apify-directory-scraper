/**
 * Ritz-Carlton Strategy
 * Handles scraping of Ritz-Carlton hotel directories
 */

import { BaseStrategy } from './base-strategy.js';

export class RitzCarltonStrategy extends BaseStrategy {
  /**
   * Main scraping method for Ritz-Carlton
   * @param {Page} page - Puppeteer page object
   * @param {Object} context - Scraping context
   * @returns {Promise<Array>} - Array of hotel data
   */
  async scrape(page, context) {
    const hotels = [];
    
    try {
      // Validate selectors before use
      if (!this.selectors || !this.selectors.selectors || !this.selectors.selectors.hotelLinks) {
        throw new Error(`Invalid selectors configuration: hotelLinks selector is missing. Got: ${JSON.stringify(this.selectors)}`);
      }

      // Wait for the page to load
      await this.waitForPageLoad(page, 30000);

      // Wait for JS-rendered content to appear
      try {
        await page.waitForSelector(this.selectors.selectors.hotelLinks, { timeout: 15000 });
        console.log('✅ Hotel links found - dynamic content loaded');
      } catch (timeoutError) {
        console.warn('Hotel links not found within timeout - page may be challenged or content not loaded');
        
        // Try to wait for the container to appear first
        try {
          await page.waitForSelector('.tabbed-hotel-map-component-regions--region-list-ul', { timeout: 5000 });
          console.log('✅ Hotel container found, waiting for links...');
          // Give extra time for links to populate
          await new Promise(r => setTimeout(r, 3000));
        } catch (containerError) {
          console.warn('Hotel container not found - page structure may have changed');
        }
      }

      // Extract hotel data using the base strategy
      const hotelElements = await page.$$(this.selectors.selectors.hotelLinks);
      
      console.log(`🔍 Found ${hotelElements.length} hotel elements`);
      
      // Debug: log what selectors we're using
      console.log(`🎯 Using selector: ${this.selectors.selectors.hotelLinks}`);
      
      // Debug: check if container exists
      const containerExists = await page.$('.tabbed-hotel-map-component-regions--region-list-ul');
      console.log(`📦 Hotel container exists: ${containerExists ? 'YES' : 'NO'}`);
      
      for (const hotelElement of hotelElements) {
        try {
          const hotelInfo = await this.extractHotelData(hotelElement, page);
          if (hotelInfo) {
            hotels.push(hotelInfo);
          }
        } catch (error) {
          console.error('Error extracting Ritz-Carlton hotel data:', error);
        }
      }

    } catch (error) {
      console.error('Error in Ritz-Carlton strategy:', error);
    }

    return hotels;
  }
} 