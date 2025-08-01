/**
 * Base Strategy Class
 * Abstract base class for all brand-specific scraping strategies
 */

import { extractMarsha, extractSlug, resolveAndExtract } from '../utils/urlHelpers.js';
import { getBrandInfo, getSubBrandInfo } from '../config/index.js';

export class BaseStrategy {
  constructor(selectors, brandInfo = {}) {
    this.selectors = selectors;
    this.brandInfo = {
      name: brandInfo.name || 'Unknown Brand',
      code: brandInfo.code || 'UN'
    };
  }

  /**
   * Main scraping method - must be implemented by subclasses
   * @param {Page} page - Puppeteer page object
   * @param {Object} context - Scraping context
   * @returns {Promise<Array>} - Array of hotel data
   */
  async scrape(page, context) {
    throw new Error('scrape method must be implemented by subclass');
  }

  /**
   * Optional DOM expansion method
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<void>}
   */
  async expand(page) {
    // Default implementation does nothing
    // Subclasses can override to expand collapsible sections
  }

  /**
   * Extract hotel data from a single hotel element
   * @param {ElementHandle} hotelElement - Hotel element from page
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Object|null>} - Hotel data or null if extraction fails
   */
  async extractHotelData(hotelElement, page) {
    try {
      // Extract basic hotel information
      const hotelName = await this.extractText(hotelElement, this.selectors.hotelName);
      const hotelUrl = await this.extractHref(hotelElement, this.selectors.hotelUrl);
      
      if (!hotelName || !hotelUrl) {
        return null;
      }

      // Resolve URL and extract Marsha code and slug
      const urlInfo = await resolveAndExtract(hotelUrl, page);
      
      // Get brand information
      const brandInfo = getBrandInfo(this.brandInfo.code);
      
      // Create hotel data object
      const hotelData = {
        hotel_name: hotelName.trim(),
        url: urlInfo.canonicalUrl,
        initial_url: hotelUrl !== urlInfo.canonicalUrl ? hotelUrl : undefined,
        marsha_code: urlInfo.marshaCode,
        slug: urlInfo.slug,
        brand_name: brandInfo.name,
        brand_code: brandInfo.code,
        is_live: urlInfo.isLive,
        extracted_at: new Date().toISOString(),
        source_url: page.url(),
        confidence_score: 1.0
      };

      // Extract optional location information
      if (this.selectors.location) {
        const location = await this.extractText(hotelElement, this.selectors.location);
        if (location) {
          hotelData.location = location.trim();
        }
      }

      // Extract optional city information
      if (this.selectors.city) {
        const city = await this.extractText(hotelElement, this.selectors.city);
        if (city) {
          hotelData.city = city.trim();
        }
      }

      // Extract optional country information
      if (this.selectors.country) {
        const country = await this.extractText(hotelElement, this.selectors.country);
        if (country) {
          hotelData.country = country.trim();
        }
      }

      // Extract optional region information
      if (this.selectors.region) {
        const region = await this.extractText(hotelElement, this.selectors.region);
        if (region) {
          hotelData.region = region.trim();
        }
      }

      return hotelData;

    } catch (error) {
      console.error('Error extracting hotel data:', error);
      return null;
    }
  }

  /**
   * Extract text content from an element
   * @param {ElementHandle} element - Parent element
   * @param {string} selector - CSS selector
   * @returns {Promise<string>} - Text content
   */
  async extractText(element, selector) {
    try {
      const textElement = await element.$(selector);
      if (textElement) {
        return await textElement.evaluate(el => el.textContent || '');
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Extract href attribute from an element
   * @param {ElementHandle} element - Parent element
   * @param {string} selector - CSS selector
   * @returns {Promise<string>} - Href value
   */
  async extractHref(element, selector) {
    try {
      const linkElement = await element.$(selector);
      if (linkElement) {
        return await linkElement.evaluate(el => el.href || '');
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Wait for the page to load with the specified selector
   * @param {Page} page - Puppeteer page object
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<void>}
   */
  async waitForPageLoad(page, timeout = 30000) {
    if (this.selectors.waitForSelector) {
      await page.waitForSelector(this.selectors.waitForSelector, { timeout });
    }
  }

  /**
   * Handle pagination if present
   * @param {Page} page - Puppeteer page object
   * @param {Object} context - Scraping context
   * @returns {Promise<Array>} - Array of hotel data from all pages
   */
  async handlePagination(page, context) {
    const allHotels = [];
    let currentPage = 1;
    const maxPages = context.maxPages || 10;

    while (currentPage <= maxPages) {
      // Extract hotels from current page
      const pageHotels = await this.scrape(page, context);
      allHotels.push(...pageHotels);

      // Check for next page
      const hasNextPage = await this.hasNextPage(page);
      if (!hasNextPage) {
        break;
      }

      // Navigate to next page
      const nextPageUrl = await this.getNextPageUrl(page);
      if (!nextPageUrl) {
        break;
      }

      await page.goto(nextPageUrl, { waitUntil: 'networkidle0' });
      currentPage++;
    }

    return allHotels;
  }

  /**
   * Check if there's a next page
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<boolean>}
   */
  async hasNextPage(page) {
    if (!this.selectors.pagination) {
      return false;
    }

    try {
      const nextButton = await page.$(this.selectors.pagination);
      return nextButton !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the URL for the next page
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<string|null>}
   */
  async getNextPageUrl(page) {
    if (!this.selectors.pagination) {
      return null;
    }

    try {
      const nextButton = await page.$(this.selectors.pagination);
      if (nextButton) {
        return await nextButton.evaluate(el => el.href || null);
      }
      return null;
    } catch (error) {
      return null;
    }
  }
} 