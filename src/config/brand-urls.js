// Brand directory URL mappings
export const BRAND_DIRECTORY_URLS = {
  ritzcarlton: "https://www.ritzcarlton.com/en/hotels-and-resorts/",
  stregis: "https://st-regis.marriott.com/hotel-directory/",
  marriottMain: "https://marriott-hotels.marriott.com/locations/",
  sheraton: "https://www.sheraton.com/hotels/",
  westin: "https://www.westin.com/hotels/",
  w: "https://www.whotels.com/hotels/",
  luxurycollection: "https://www.luxurycollection.com/hotels/",
  edition: "https://www.editionhotels.com/hotels/",
  autograph: "https://www.autographhotels.com/hotels/",
  tributeportfolio: "https://www.tributeportfolio.com/hotels/",
  design: "https://www.designhotels.com/hotels/",
  bulgari: "https://www.bulgarihotels.com/hotels/",
  gaylord: "https://www.gaylordhotels.com/hotels/",
  renaissance: "https://www.renaissancehotels.com/hotels/",
  lemeridien: "https://www.lemeridien.com/hotels/",
  courtyard: "https://www.courtyard.marriott.com/hotels/",
  springhill: "https://www.springhillsuites.marriott.com/hotels/",
  fairfield: "https://www.fairfield.marriott.com/hotels/",
  residenceinn: "https://www.residenceinn.marriott.com/hotels/",
  towneplace: "https://www.towneplacesuites.marriott.com/hotels/",
  achotels: "https://www.achotels.marriott.com/hotels/",
  aloft: "https://www.aloft.marriott.com/hotels/",
  moxy: "https://www.moxyhotels.com/hotels/",
  protea: "https://www.proteahotels.com/hotels/",
  cityexpress: "https://www.cityexpress.marriott.com/hotels/",
  fourpoints: "https://www.fourpoints.com/hotels/",
  element: "https://www.elementhotels.com/hotels/",
  delta: "https://www.deltahotels.com/hotels/",
  sonder: "https://www.sonder.com/hotels/",
  apartments: "https://www.apartments.marriott.com/hotels/",
  conferencecenters: "https://www.marriott.com/conference-centers/"
};

/**
 * Get the directory URL for a given brand selection
 * @param {string} brandSelection - The brand selection key
 * @returns {string} The directory URL for the brand
 */
export function getBrandDirectoryUrl(brandSelection) {
  const url = BRAND_DIRECTORY_URLS[brandSelection];
  if (!url) {
    throw new Error(`Unknown brand selection: ${brandSelection}`);
  }
  return url;
}

/**
 * Get the brand key from brand selection (for backward compatibility)
 * @param {string} brandSelection - The brand selection key
 * @returns {string} The brand key
 */
export function getBrandKeyFromSelection(brandSelection) {
  // Most brand selections map directly to brand keys
  return brandSelection;
} 