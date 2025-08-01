# Product Requirements Document (PRD)
## Universal Marriott Directory Scraper

### 1. Executive Summary

**Product Name:** Universal Marriott Directory Scraper  
**Version:** 2.0  
**Date:** January 2025  
**Owner:** Development Team

**PRD Self-Reference:** This document serves as the single source of truth for implementation. Any feature, requirement, or architectural decision not explicitly defined in this PRD is OUT OF SCOPE. Implementation must strictly adhere to this PRD's specifications.  

**Problem Statement:**  
Current scraper is hardcoded for specific Marriott brand websites, requiring separate scrapers for each of Marriott's 30+ brands. This creates maintenance overhead, code duplication, and scalability issues.

**Current State:**  
We have a working **Apify Actor template** (`js-crawlee-puppeteer-chrome`) that successfully extracts hotel data from the main Marriott directory. This template uses PuppeteerCrawler, follows Apify best practices, and has been proven in production. However, it's limited to a single brand/directory structure.

**Solution Overview:**  
This project adapts our proven **Apify Actor template** into a universal Marriott directory scraper that can handle multiple Marriott brand websites through a strategy-based architecture. We're building on proven Apify infrastructure rather than starting from scratch.

### 2. Product Goals & Success Metrics

#### Primary Goals:
- **Universal Compatibility:** Support all 30+ Marriott brands with a single codebase
- **Maintainability:** Reduce code duplication by 80% through shared utilities
- **Reliability:** Achieve 95% success rate across all supported brands
- **Extensibility:** Add new brands in <30 minutes through configuration only
- **Performance:** Handle 1000+ hotels per run with <5 minute execution time
- **Apify Integration:** Maintain full compatibility with Apify platform and best practices

#### Success Metrics:
- **Coverage:** Successfully scrape 95% of all Marriott brand websites
- **Data Quality:** Extract complete hotel information (name, URL, location, brand, Marsha code) for 90%+ hotels
- **Maintenance:** Reduce brand-specific code changes by 80%
- **Performance:** Average execution time <5 minutes per brand
- **Error Rate:** <5% failed extractions per run

### 3. Technical Architecture

#### 3.1 Apify Actor Layers Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Apify Layer   │───▶│  Strategy Layer  │───▶│  Output Layer   │
│                 │    │                  │    │                 │
│ • PuppeteerCrawler│  │ • Brand Detection│    │ • Dataset Storage│
│ • Proxy Config  │    │ • Strategy Select│    │ • Error Reports │
│ • Input Schema  │    │ • Extraction Exec│    │ • Success Logs  │
│ • Actor Context │    │ • DOM Processing │    │ • Apify Results │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Compliance     │    │  Shared Utils    │    │  Monitoring     │
│  Layer          │    │  Layer           │    │  Layer          │
│                 │    │                  │    │                 │
│ • Robots.txt    │    │ • Marsha Parser  │    │ • Performance   │
│ • Rate Limiting │    │ • Brand Mapper   │    │ • Error Tracking│
│ • Legal Checks  │    │ • URL Validator  │    │ • Success Rates │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Foundation:** Built on proven Apify PuppeteerCrawler template with existing infrastructure

#### 3.2 Core Components

**Final Directory Structure:**
```
├── .actor/
│   ├── actor.json                    # Apify Actor metadata
│   └── input_schema.json             # Apify input schema
├── src/
│   ├── strategies/
│   │   ├── base-strategy.ts
│   │   ├── marriottMain.ts
│   │   ├── ritzCarlton.ts
│   │   ├── stRegis.ts
│   │   ├── generic.ts
│   │   └── factory.ts
│   ├── utils/
│   │   ├── urlHelpers.ts
│   │   ├── expandDom.ts
│   │   ├── brand-mapper.ts
│   │   ├── url-validator.ts
│   │   ├── error-handler.ts
│   │   └── data-cleaner.ts
│   ├── config/
│   │   ├── index.ts
│   │   ├── domains.ts
│   │   ├── strategies.ts
│   │   ├── crawler.ts
│   │   ├── compliance.ts
│   │   ├── brand_codes.json
│   │   ├── sub_brand_codes.json
│   │   └── selectors/
│   │       ├── ritzcarlton.json
│   │       ├── stregis.json
│   │       ├── marriottMain.json
│   │       └── generic.json
│   ├── compliance/
│   │   ├── robots-checker.ts
│   │   ├── rate-limiter.ts
│   │   ├── legal-checker.ts
│   │   └── proxy-manager.ts
│   ├── main.ts                       # Apify Actor entry point
│   └── routes.ts                     # Crawlee router
├── package.json                      # Node.js dependencies
├── Dockerfile                        # Apify Actor container
├── eslint.config.mjs                 # Code quality
├── README.md                         # Documentation
└── PRD.md                           # Product Requirements Document (this file)
```

#### 3.3 Core Components

**A. Configuration Management (`src/config/`)**
```
config/
├── index.js              # Main config export
├── domains.js            # Accepted domain patterns
├── strategies.js         # Brand-specific strategies
├── crawler.js            # Crawler settings
├── compliance.js         # Rate limiting & legal settings
├── brand_codes.json      # GDS codes & brand mappings
└── sub_brand_codes.json  # Sub-brand mappings
```

**B. Strategy System (`src/strategies/`)**
```
strategies/
├── base-strategy.ts      # Abstract base class (≤150 LOC)
├── marriottMain.ts       # Main directory strategy
├── ritzCarlton.ts        # Ritz-Carlton specific
├── stRegis.ts           # St. Regis specific
├── generic.ts            # Fallback strategy
└── factory.ts            # Strategy factory
```

**Selector Configuration:**
```
config/selectors/
├── ritzcarlton.json      # Ritz-Carlton selectors
├── stregis.json          # St. Regis selectors
├── marriottMain.json     # Main directory selectors
└── generic.json          # Generic fallback selectors
```

**Factory Pattern:**
```typescript
// factory.ts
import selectors from `../config/selectors/${brandKey}.json`;
// pass selectors into new Strategy(selectors)
```

**Strategy Interface:**
```typescript
interface IScrapeStrategy {
  scrape(page: Page, context: ScrapeContext): Promise<ScrapeResult[]>
  expand?(page: Page): Promise<void>  // Optional DOM expansion
}

interface ScrapeResult {
  hotel_name: string
  url: string
  initial_url?: string
  marsha_code: string
  slug: string
  brand_name: string
  brand_code: string
  sub_brand_code?: string
  // ... other fields
}
```

**C. Shared Utilities (`src/utils/`)**
```
utils/
├── urlHelpers.ts         # URL parsing, Marsha & slug extraction
├── expandDom.ts          # DOM expansion utilities
├── brand-mapper.js       # Brand detection logic
├── url-validator.js      # URL validation & normalization
├── error-handler.js      # Error handling & reporting
└── data-cleaner.js       # Data cleaning & validation
```

**URL Utilities Specification:**
```typescript
// src/utils/urlHelpers.ts
export function extractMarsha(url: string): string
export function extractSlug(url: string): string
export async function resolveAndExtract(url: string, page: Page): Promise<{
  canonicalUrl: string,
  redirectChain: string[],
  marshaCode: string,
  slug: string,
  isLive: boolean
}>

// Test cases embedded in urlHelpers.test.ts
const testCases = [
  {
    input: 'https://www.marriott.com/hotels/travel/addlc-sheraton-addis-a-luxury-collection-hotel-addis-ababa/overview/',
    expectedMarsha: 'ADDLC',
    expectedSlug: 'sheraton-addis-a-luxury-collection-hotel-addis-ababa'
  },
  {
    input: 'https://www.ritzcarlton.com/en/hotels/tusrz-the-ritz-carlton-dove-mountain/overview/',
    expectedMarsha: 'TUSRZ',
    expectedSlug: 'the-ritz-carlton-dove-mountain'
  },
  {
    input: 'https://st-regis.marriott.com/hotels/travel/caixr-the-st-regis-cairo/overview/',
    expectedMarsha: 'CAIXR',
    expectedSlug: 'the-st-regis-cairo'
  },
  {
    input: 'https://www.marriott.com/ADDLC',
    expectedMarsha: 'ADDLC',
    expectedSlug: ''
  }
]

// Dead hotel detection test cases
const deadHotelTestCases = [
  {
    input: 'https://www.marriott.com/DEADHOTEL',
    expectedMarsha: 'DEADHOTEL',
    expectedSlug: '',
    expectedIsLive: false,
    expectedStatus: 404
  }
]
```

**D. Compliance Layer (`src/compliance/`)**
```
compliance/
├── robots-checker.js     # Robots.txt validation
├── rate-limiter.js       # Request rate limiting
├── legal-checker.js      # Legal compliance checks
└── proxy-manager.js      # Proxy rotation & management
```

### 4. Detailed Requirements

#### 4.1 Functional Requirements

**FR-001: URL Validation & Brand Detection**
- **Priority:** High
- **Description:** Validate incoming URLs against accepted domains and detect brand automatically
- **Acceptance Criteria:**
  - Support regex-based domain matching (not just `includes()`)
  - Handle subdomains and international domains (`.co.uk`, `.ca`, etc.)
  - Return appropriate error for unsupported domains
  - Auto-detect brand from URL pattern

**FR-002: Strategy-Based Extraction**
- **Priority:** High
- **Description:** Use brand-specific extraction strategies with shared utilities
- **Acceptance Criteria:**
  - Each brand has its own strategy class extending base strategy
  - Strategies are loaded dynamically based on URL
  - Shared utilities (Marsha parser, brand mapper) are reused
  - Fallback to generic strategy for unknown brands

**FR-003: Pagination Support**
- **Priority:** Medium
- **Description:** Handle paginated hotel directories
- **Acceptance Criteria:**
  - Detect pagination elements automatically
  - Follow pagination links up to configurable limit
  - Merge results from all pages
  - Handle infinite scroll if present

**FR-004: Comprehensive Data Extraction**
- **Priority:** High
- **Description:** Extract complete hotel information
- **Acceptance Criteria:**
  - Hotel name, URL, location, city, country, region
  - Brand name and GDS code
  - Marsha code (with improved regex patterns)
  - Any additional brand-specific data

**FR-005: Error Handling & Resilience**
- **Priority:** High
- **Description:** Graceful error handling with partial results preservation
- **Acceptance Criteria:**
  - Continue processing on individual hotel failures
  - Log detailed error information
  - Preserve successfully extracted data
  - Retry failed requests with exponential backoff
  - Use Crawlee's failedRequestHandler to push { url, reason } into dataset under 'errors' key
  - No external error stores - all errors captured in same dataset

**FR-006: Dead Hotel Detection**
- **Priority:** High
- **Description:** Identify when a Marsha short URL (e.g. /ADDLC) resolves to a 404 or similar non-success page, which usually indicates a hotel has left the Marriott portfolio
- **Acceptance Criteria:**
  - If the resolved response status ≥ 400 (404, 410, etc.), mark the result with `is_live: false`
  - Still extract the Marsha code from the URL for traceability
  - Push an error object into dataset under 'errors' with { marsha_code, url, status, message }
  - Successful hotels must always include `is_live: true` in the dataset

#### 4.2 Non-Functional Requirements

**NFR-001: Performance**
- **Target:** <5 minutes per brand, <30 minutes total for all brands
- **Concurrency:** Configurable (default: 10 concurrent requests)
- **Memory:** <500MB peak usage
- **CPU:** <80% utilization
- **Retries:** maxRequestRetries=2
- **Navigation Timeout:** navigationTimeoutSecs=60

**NFR-002: Scalability**
- **Target:** Support 1000+ hotels per run
- **Streaming:** Push results as they're found (not batch at end)
- **Memory Management:** Process hotels in chunks to avoid memory issues

**NFR-003: Reliability**
- **Success Rate:** >95% for supported brands
- **Error Recovery:** Automatic retry with exponential backoff
- **Data Integrity:** Validate extracted data before storage

**NFR-004: Maintainability**
- **Code Duplication:** <20% (down from current ~80%)
- **Configuration-Driven:** New brands added via config only
- **Selector Maintenance:** One-liner edits in JSON files, no re-compile needed

**NFR-005: Compliance**
- **Robots.txt:** Respect all robots.txt directives
- **Rate Limiting:** Configurable delays between requests
- **Legal:** Check terms of service compliance

### 5. Technical Specifications

#### 5.1 Data Models

**Hotel Data Model:**
```javascript
{
  hotel_name: string,           // Required
  url: string,                  // Required (canonical URL after redirects)
  initial_url: string,          // Optional (original URL before redirects)
  marsha_code: string,          // Required (3-6 chars, extracted from canonical URL)
  slug: string,                 // Required (segment between first hyphen after /hotels/<marsha>- and next /)
  brand_name: string,           // Required
  brand_code: string,           // Required (2 chars)
  sub_brand_code: string,       // Optional (sub-brand identifier)
  is_live: boolean,             // Required (true for successful hotels, false for dead hotels)
  location: string,             // Optional
  city: string,                 // Optional
  country: string,              // Optional
  region: string,               // Optional
  extracted_at: ISO8601,        // Required
  source_url: string,           // Required
  confidence_score: number      // Optional (0-1)
}
```

**Slug Extraction Rule:**
```
slug = segment between the first hyphen after /hotels/<marsha>- and the next /
Example: addlc-sheraton-addis-a-luxury-collection-hotel-addis-ababa/overview
→ marsha_code = "ADDLC"
→ slug = "sheraton-addis-a-luxury-collection-hotel-addis-ababa"
```

**Test Cases for Slug Extraction:**
| Input URL | Expected marsha_code | Expected slug |
|-----------|---------------------|---------------|
| `https://www.marriott.com/hotels/travel/addlc-sheraton-addis-a-luxury-collection-hotel-addis-ababa/overview/` | `ADDLC` | `sheraton-addis-a-luxury-collection-hotel-addis-ababa` |
| `https://www.ritzcarlton.com/en/hotels/tusrz-the-ritz-carlton-dove-mountain/overview/` | `TUSRZ` | `the-ritz-carlton-dove-mountain` |
| `https://st-regis.marriott.com/hotels/travel/caixr-the-st-regis-cairo/overview/` | `CAIXR` | `the-st-regis-cairo` |
| `https://www.marriott.com/ADDLC` | `ADDLC` | `""` (short code, no slug) |

**Strategy Configuration Model:**
```javascript
{
  name: string,                 // Strategy identifier
  waitForSelector: string,      // CSS selector to wait for
  selectors: {
    hotelLinks: string,         // CSS selector for hotel links
    hotelName: string,          // How to extract hotel name
    hotelUrl: string,           // How to extract URL
    pagination?: string,        // Optional pagination selector
    location?: string,          // Optional location selector
    // ... brand-specific selectors
  },
  brandInfo: {
    name: string,               // Default brand name
    code: string                // Default brand code
  },
  expandSelectors?: string[],   // Optional expandable sections
  maxPages?: number,            // Optional pagination limit
  customExtractors?: object     // Optional custom extraction logic
}
```

#### 5.2 API Specifications

**Input Schema:**
```json
{
  "targetUrl": {
    "type": "string",
    "required": true,
    "description": "URL of the Marriott brand directory to scrape"
  },
  "brandKey": {
    "type": "string",
    "required": false,
    "enum": ["ritzcarlton", "stregis", "marriottMain", "sheraton", "westin", "w", "luxurycollection", "edition", "autograph", "tributeportfolio", "design", "bulgari", "gaylord", "renaissance", "lemeridien", "courtyard", "springhill", "fairfield", "residenceinn", "towneplace", "achotels", "aloft", "moxy", "protea", "cityexpress", "fourpoints", "element", "delta", "sonder", "apartments", "conferencecenters"],
    "description": "Optional: Pre-select brand strategy. If provided, validates targetUrl matches brand domain."
  },
  "rateProfile": {
    "type": "string",
    "required": false,
    "enum": ["slow", "normal", "fast"],
    "default": "normal",
    "description": "Crawl aggressiveness profile: slow (2s delay, 1 concurrent), normal (1s delay, 10 concurrent), fast (0.5s delay, 20 concurrent)"
  },
  "maxPages": {
    "type": "integer",
    "default": 10,
    "description": "Maximum number of pages to scrape"
  },
  "maxConcurrency": {
    "type": "integer",
    "default": 10,
    "description": "Maximum concurrent requests (overridden by rateProfile if specified)"
  },
  "maxRequestRetries": {
    "type": "integer",
    "default": 2,
    "description": "Maximum retry attempts for failed requests"
  },
  "navigationTimeoutSecs": {
    "type": "integer",
    "default": 60,
    "description": "Navigation timeout in seconds"
  },
  "requestDelayMs": {
    "type": "integer",
    "default": 1000,
    "description": "Delay between requests in milliseconds (overridden by rateProfile if specified)"
  },
  "respectRobotsTxt": {
    "type": "boolean",
    "default": true,
    "description": "Whether to respect robots.txt"
  }
}
```

**Note:** All input parameters are exposed via the Apify actor console & API.

**Output Schema:**
```json
{
  "hotels": [
    {
      "hotel_name": "string",
      "url": "string",
      "marsha_code": "string",
      "brand_name": "string",
      "brand_code": "string",
      "is_live": "boolean",
      "location": "string",
      "city": "string",
      "country": "string",
      "region": "string",
      "extracted_at": "string",
      "source_url": "string",
      "confidence_score": "number"
    }
  ],
  "metadata": {
    "total_hotels": "integer",
    "source_url": "string",
    "scraped_at": "string",
    "execution_time_ms": "integer",
    "errors": [
      {
        "type": "string",
        "message": "string",
        "count": "integer",
        "marsha_code": "string",
        "url": "string",
        "status": "integer"
      }
    ]
  }
}
```

### 6. Implementation Plan

#### Phase 1: Foundation (Week 1-2)
- [ ] Update `.actor/actor.json` with new actor title, branding, and tags
- [ ] Update `.actor/input_schema.json` with universal input parameters
- [ ] Adapt existing Apify PuppeteerCrawler template structure
- [ ] Implement configuration management system
- [ ] Create base strategy class and factory
- [ ] Implement shared utilities (Marsha parser, brand mapper, URL validator)
- [ ] Set up testing framework with fixtures

#### Phase 2: Core Strategies (Week 3-4)
- [ ] Implement Ritz-Carlton strategy
- [ ] Implement St. Regis strategy
- [ ] Implement Marriott main directory strategy
- [ ] Implement generic fallback strategy
- [ ] Add comprehensive error handling

#### Phase 3: Compliance & Performance (Week 5-6)
- [ ] Implement robots.txt checking
- [ ] Add rate limiting and request delays
- [ ] Implement proxy management
- [ ] Add pagination support
- [ ] Optimize performance and memory usage

#### Phase 4: Testing & Quality (Week 7-8)
- [ ] Write unit tests for urlHelpers.ts (embedded test cases for extractMarsha, extractSlug)
- [ ] Create dev script: `npm run dev:<brand>` for single URL testing
- [ ] Documentation and deployment

### 7. Risk Assessment

#### High Risk:
- **Website Structure Changes:** Marriott websites may change HTML structure
  - *Mitigation:* Comprehensive test suite with static fixtures
- **Rate Limiting:** Websites may implement aggressive rate limiting
  - *Mitigation:* Configurable delays and proxy rotation

#### Medium Risk:
- **Legal Compliance:** Terms of service changes
  - *Mitigation:* Regular legal review and compliance monitoring
- **Performance Issues:** Large directories may cause timeouts
  - *Mitigation:* Streaming results and memory management

#### Low Risk:
- **Dependency Updates:** Third-party library changes
  - *Mitigation:* Pinned versions and comprehensive testing

### 8. Success Criteria

#### Technical Success:
- [ ] All 30+ Marriott brands supported
- [ ] >95% success rate across all brands
- [ ] <5 minute execution time per brand
- [ ] <20% code duplication
- [ ] Full Apify platform compatibility maintained

#### Business Success:
- [ ] Reduced maintenance overhead by 80%
- [ ] New brands can be added in <30 minutes
- [ ] Reliable data extraction for business operations
- [ ] Compliance with legal requirements

### 9. Future Enhancements

#### Version 2.1:
- Real-time monitoring dashboard
- Automated strategy updates based on website changes
- Machine learning for brand detection
- Multi-language support

#### Version 2.2:
- API endpoints for real-time queries
- Integration with external hotel databases
- Advanced analytics and reporting
- Mobile app support

### 10. Open Questions & Decisions Required

#### Q1: Sub-brand Code Structure
**Question:** Sub-brand codes - flat list or brand-scoped?
**Options:**
- **Flat list:** All sub-brands in single JSON with brand reference
- **Brand-scoped:** Nested structure by brand
**Recommendation:** Flat list with brand reference for simplicity

**Proposed sub_brand_codes.json structure:**
```json
[
  {
    "code": "LC",
    "name": "Luxury Collection",
    "brand_code": "LC",
    "description": "Luxury Collection sub-brand"
  },
  {
    "code": "JW",
    "name": "JW Marriott",
    "brand_code": "MC",
    "description": "JW Marriott sub-brand of Marriott Hotels"
  }
]
```

**Note:** sub_brand_code is optional per strategy - generic strategy won't be forced to look it up when none exist.

#### Q2: Pagination Requirements
**Question:** Do any of the 30 sites paginate the directory?
**Options:**
- **Implement now:** Add pagination support to all strategies
- **Defer:** Implement only if discovered during testing
**Recommendation:** Defer - implement pagination only if discovered during initial testing

#### Q3: Slug Extraction Edge Cases
**Question:** How to handle edge cases in slug extraction?
**Examples:**
- URLs without slugs (short codes)
- Malformed URLs
- International domains with different patterns
**Decision:** Implement robust error handling with fallback to empty string

### 11. Blocking Items Before Coding

**Critical decisions required:**
1. ✅ **Lock exact slug extraction rule** - COMPLETED
2. ✅ **Flat sub_brand_codes.json structure** - CONFIRMED
3. ✅ **Pagination deferred until encountered** - CONFIRMED

**All blocking items cleared - ready to adapt existing Apify Actor template and implement first strategy.**

**Compatibility Note:** This implementation maintains full compatibility with the existing Apify ecosystem:
- Uses existing `js-crawlee-puppeteer-chrome` template structure
- Preserves all Apify Actor metadata and configuration
- Maintains Docker container compatibility
- Follows Apify input schema standards
- Compatible with Apify console UI and API

### 13. PRD Self-Reference & Scope Control

#### 13.1 Implementation Boundaries
**CRITICAL:** This PRD defines the ONLY acceptable implementation scope. Any deviation requires explicit PRD amendment.

**IN SCOPE (Defined in this PRD):**
- ✅ Strategy-based architecture with shared utilities
- ✅ Configuration-driven design with JSON selectors
- ✅ Apify Actor compatibility and structure
- ✅ Marsha code and slug extraction utilities
- ✅ Error handling via Crawlee's failedRequestHandler
- ✅ Dead hotel detection with `is_live` field (FR-006)
- ✅ Unit tests for urlHelpers.ts only
- ✅ Development script: `npm run dev:<brand>`
- ✅ Directory structure as specified in Section 3.2
- ✅ Input schema as defined in Section 5.2
- ✅ Data model as specified in Section 5.1

**OUT OF SCOPE (Not in this PRD):**
- ❌ Real-time monitoring dashboards
- ❌ Machine learning or AI components
- ❌ API endpoints beyond Apify Actor
- ❌ Mobile applications
- ❌ External database integrations
- ❌ Advanced analytics beyond basic metrics
- ❌ Multi-language support
- ❌ Automated strategy updates
- ❌ Comprehensive test suites beyond urlHelpers.ts
- ❌ Performance monitoring beyond basic logging

#### 13.2 PRD Compliance Checklist
Before implementing any feature, verify:
- [ ] Feature is explicitly mentioned in this PRD
- [ ] Feature aligns with defined architecture (Section 3)
- [ ] Feature uses specified technologies (Apify, Crawlee, Puppeteer)
- [ ] Feature follows defined data models (Section 5.1)
- [ ] Feature maintains Apify Actor compatibility
- [ ] Feature doesn't introduce new dependencies beyond package.json
- [ ] Feature fits within defined directory structure (Section 3.2)

#### 13.3 Change Control Process
**To add new features or requirements:**
1. **Amend this PRD first** - Add explicit specification
2. **Update relevant sections** - Architecture, data models, etc.
3. **Maintain scope boundaries** - Ensure no scope creep
4. **Preserve Apify compatibility** - All changes must work with existing template

**PRD Amendment Required For:**
- New file types or directories not in Section 3.2
- New input parameters not in Section 5.2
- New data fields not in Section 5.1
- New technologies beyond Apify/Crawlee/Puppeteer
- New testing frameworks beyond basic unit tests
- New deployment methods beyond Apify platform

#### 13.4 Implementation Guardrails
**AI Implementation Rules:**
1. **Reference this PRD constantly** - Every code decision must trace back to a PRD section
2. **No "nice-to-have" features** - Only implement what's explicitly specified
3. **Maintain existing structure** - Don't refactor working Apify template unnecessarily
4. **Follow exact specifications** - Use exact file names, function signatures, and data structures
5. **Preserve compatibility** - All changes must work with existing Apify ecosystem
6. **Document deviations** - If PRD is unclear, document the interpretation used

**Success Criteria:** Implementation matches this PRD exactly, with no scope creep or feature additions beyond what's explicitly defined.

### 14. Appendix

#### A. Brand Coverage Matrix
| Brand | Domain | Status | Strategy | Test Coverage |
|-------|--------|--------|----------|---------------|
| Ritz-Carlton | ritzcarlton.com | Planned | Custom | TBD |
| St. Regis | st-regis.marriott.com | Planned | Custom | TBD |
| Marriott Hotels | marriott.com | Planned | Custom | TBD |
| Sheraton | sheraton.com | Planned | Generic | TBD |
| Westin | westin.com | Planned | Generic | TBD |
| ... | ... | ... | ... | ... |

#### B. Performance Benchmarks
| Metric | Target | Current | Improvement |
|--------|--------|---------|-------------|
| Execution Time | <5 min/brand | N/A | N/A |
| Success Rate | >95% | N/A | N/A |
| Memory Usage | <500MB | N/A | N/A |
| Code Duplication | <20% | ~80% | 75% reduction |

#### C. Testing Strategy
- **Unit Tests:** urlHelpers.ts with embedded test cases for extractMarsha, extractSlug
- **Development Testing:** `npm run dev:<brand>` script for single URL testing
- **Apify Integration:** Maintain compatibility with Apify Actor development workflow 