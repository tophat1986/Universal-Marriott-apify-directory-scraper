/**
 * St. Regis Strategy
 * Handles scraping of St. Regis hotel directories
 */

import { BaseStrategy } from './base-strategy.js';

export class StRegisStrategy extends BaseStrategy {
  /**
   * Main scraping method for St. Regis
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
          console.error('Error extracting St. Regis hotel data:', error);
        }
      }

    } catch (error) {
      console.error('Error in St. Regis strategy:', error);
    }

    return hotels;
  }
} 