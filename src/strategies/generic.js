/**
 * Generic Strategy
 * Fallback strategy for unknown Marriott brands
 */

import { BaseStrategy } from './base-strategy.js';

export class GenericStrategy extends BaseStrategy {
  /**
   * Main scraping method for generic Marriott brands
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
          console.error('Error extracting generic hotel data:', error);
        }
      }

    } catch (error) {
      console.error('Error in generic strategy:', error);
    }

    return hotels;
  }
} 