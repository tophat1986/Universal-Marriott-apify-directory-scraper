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
      // Wait for the page to load
      await this.waitForPageLoad(page, 30000);

      // Extract hotel data using the base strategy
      const hotelElements = await page.$$(this.selectors.hotelLinks);
      
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