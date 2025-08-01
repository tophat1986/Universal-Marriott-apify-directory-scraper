/**
 * Strategy Factory
 * Creates brand-specific strategies based on brand key
 */

import { BaseStrategy } from './base-strategy.js';
import { MarriottMainStrategy } from './marriottMain.js';
import { RitzCarltonStrategy } from './ritzCarlton.js';
import { StRegisStrategy } from './stRegis.js';
import { GenericStrategy } from './generic.js';

// Strategy mapping
const STRATEGY_MAP = {
  marriottMain: MarriottMainStrategy,
  ritzcarlton: RitzCarltonStrategy,
  stregis: StRegisStrategy,
  generic: GenericStrategy
};

/**
 * Create a strategy instance for the given brand
 * @param {string} brandKey - Brand identifier
 * @param {Object} options - Additional options
 * @returns {BaseStrategy} - Strategy instance
 */
export async function createStrategy(brandKey, options = {}) {
  try {
    // Load selectors for the brand
    const selectors = await loadSelectors(brandKey);
    
    // Get strategy class
    const StrategyClass = STRATEGY_MAP[brandKey] || GenericStrategy;
    
    // Create strategy instance
    const strategy = new StrategyClass(selectors, options.brandInfo);
    
    return strategy;
  } catch (error) {
    console.error(`Error creating strategy for brand ${brandKey}:`, error);
    
    // Fallback to generic strategy
    const genericSelectors = await loadSelectors('generic');
    return new GenericStrategy(genericSelectors, options.brandInfo);
  }
}

/**
 * Load selectors for a specific brand
 * @param {string} brandKey - Brand identifier
 * @returns {Promise<Object>} - Selectors configuration
 */
async function loadSelectors(brandKey) {
  try {
    // Dynamic import of selectors file using fs
    const { readFileSync } = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const configDir = join(__dirname, '..', 'config', 'selectors');
    
    const selectorsPath = join(configDir, `${brandKey}.json`);
    const selectorsData = readFileSync(selectorsPath, 'utf8');
    return JSON.parse(selectorsData);
  } catch (error) {
    console.warn(`Could not load selectors for brand ${brandKey}, using generic:`, error.message);
    
    // Fallback to generic selectors
    try {
      const { readFileSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const configDir = join(__dirname, '..', 'config', 'selectors');
      
      const genericPath = join(configDir, 'generic.json');
      const genericData = readFileSync(genericPath, 'utf8');
      return JSON.parse(genericData);
    } catch (fallbackError) {
      console.error('Could not load generic selectors:', fallbackError.message);
      throw new Error(`No selectors available for brand ${brandKey}`);
    }
  }
}

/**
 * Get available brand keys
 * @returns {Array<string>} - Array of available brand keys
 */
export function getAvailableBrands() {
  return Object.keys(STRATEGY_MAP);
}

/**
 * Check if a brand is supported
 * @param {string} brandKey - Brand identifier
 * @returns {boolean} - True if brand is supported
 */
export function isBrandSupported(brandKey) {
  return brandKey in STRATEGY_MAP;
} 