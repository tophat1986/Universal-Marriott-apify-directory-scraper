/**
 * Marriott Main Directory Strategy
 * Handles scraping of the main Marriott directory page
 */

import { BaseStrategy } from './base-strategy.js';
import { sleep } from 'crawlee';

export class MarriottMainStrategy extends BaseStrategy {
  /**
   * Main scraping method for Marriott main directory
   * @param {Page} page - Puppeteer page object
   * @param {Object} context - Scraping context
   * @returns {Promise<Array>} - Array of hotel data
   */
  async scrape(page, context) {
    const hotels = [];
    
    try {
      // Wait for the main content to load
      await this.waitForPageLoad(page, 30000);
      await sleep(2000); // Give time for initial JS to execute

      // Expand all collapsible sections
      await this.expand(page);

      // Extract all hotel data from the page
      const hotelData = await page.evaluate((selectors) => {
        const results = [];
        
        // Find all hotel elements
        const hotelElements = document.querySelectorAll(selectors.hotelLinks);
        
        hotelElements.forEach((element) => {
          try {
            const hotelName = element.textContent?.trim() || '';
            const hotelUrl = element.href || '';
            
            if (hotelName && hotelUrl) {
              results.push({
                hotelName,
                hotelUrl,
                element: element.outerHTML
              });
            }
          } catch (error) {
            console.error('Error processing hotel element:', error);
          }
        });
        
        return results;
      }, this.selectors);

      // Process each hotel
      for (const hotel of hotelData) {
        try {
          // Create a temporary element to extract data
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = hotel.element;
          const hotelElement = tempDiv.firstElementChild;
          
          const hotelInfo = await this.extractHotelData(hotelElement, page);
          if (hotelInfo) {
            hotels.push(hotelInfo);
          }
        } catch (error) {
          console.error('Error extracting hotel data:', error);
        }
      }

    } catch (error) {
      console.error('Error in Marriott main strategy:', error);
    }

    return hotels;
  }

  /**
   * Expand all collapsible sections
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<void>}
   */
  async expand(page) {
    let sectionsExpanded = 0;
    
    // Try multiple selectors for expandable elements
    const expandSelectors = this.selectors.expandSelectors || [
      'button[aria-expanded="false"]',
      '.accordion-button.collapsed',
      '[data-bs-toggle="collapse"]:not(.show)',
      '.expandable-header:not(.expanded)',
      'h2.clickable',
      'h3.clickable'
    ];

    for (const selector of expandSelectors) {
      const buttons = await page.$$(selector);
      for (const button of buttons) {
        try {
          await button.click();
          sectionsExpanded++;
          await sleep(100); // Small delay between clicks
        } catch (e) {
          // Continue if element is not clickable
        }
      }
    }
    
    console.log(`Expanded ${sectionsExpanded} sections`);
    
    // Expand multiple times to ensure everything is loaded
    if (sectionsExpanded > 0) {
      await sleep(1000);
      await this.expand(page); // Recursive call to expand remaining sections
    }
  }
} 