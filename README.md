# Universal Marriott Directory Scraper

A universal, strategy-based scraper for all Marriott brand directories. This Apify Actor supports 30+ Marriott brands with a single codebase, extracting hotel names, URLs, locations, brands, and Marsha codes.

## Features

- **Universal Compatibility**: Supports all 30+ Marriott brands with a single codebase
- **Strategy-Based Architecture**: Brand-specific extraction strategies with shared utilities
- **Configuration-Driven**: Add new brands in <30 minutes through configuration only
- **Error Handling**: Comprehensive error handling with dead hotel detection
- **Data Validation**: Automatic data cleaning and validation
- **Apify Integration**: Full compatibility with Apify platform and best practices

## Supported Brands

The scraper supports all major Marriott brands including:

- **Ritz-Carlton** (`ritzcarlton`)
- **St. Regis** (`stregis`)
- **Marriott Hotels** (`marriottMain`)
- **Sheraton** (`sheraton`)
- **Westin** (`westin`)
- **W Hotels** (`w`)
- **The Luxury Collection** (`luxurycollection`)
- **Edition** (`edition`)
- **Autograph Collection** (`autograph`)
- **Tribute Portfolio** (`tributeportfolio`)
- **Design Hotels** (`design`)
- **Bvlgari Hotels & Resorts** (`bulgari`)
- **Gaylord Hotels** (`gaylord`)
- **Renaissance Hotels** (`renaissance`)
- **Le Méridien** (`lemeridien`)
- **Courtyard by Marriott** (`courtyard`)
- **SpringHill Suites** (`springhill`)
- **Fairfield by Marriott** (`fairfield`)
- **Residence Inn by Marriott** (`residenceinn`)
- **TownePlace Suites** (`towneplace`)
- **AC Hotels by Marriott** (`achotels`)
- **Aloft** (`aloft`)
- **Moxy Hotels** (`moxy`)
- **Protea Hotels** (`protea`)
- **City Express by Marriott** (`cityexpress`)
- **Four Points by Sheraton** (`fourpoints`)
- **Element** (`element`)
- **Delta Hotels** (`delta`)
- **Sonder by Marriott Bonvoy** (`sonder`)
- **Apartments by Marriott Bonvoy** (`apartments`)
- **Marriott Conference Centers** (`conferencecenters`)

## Brand Management

### Adding/Updating Brands

To add new brands or update existing brand URLs:

1. **Edit `src/config/brand-urls.js`** - Add or modify brand entries:
   ```javascript
   export const BRAND_DIRECTORY_URLS = {
     ritzcarlton: "https://www.ritzcarlton.com/en/hotels-and-resorts/",
     stregis: "https://st-regis.marriott.com/hotel-directory/",
     // Add new brands here...
   };
   ```

2. **Update the input schema** - Run the sync script:
   ```bash
   npm run update-schema
   ```

This ensures the input schema dropdown stays in sync with your brand URLs. The script automatically:
- Extracts all brands from `brand-urls.js`
- Generates proper display names
- Updates the input schema with current URLs
- Maintains all other configuration options

### Workflow

```bash
# 1. Edit brand URLs
vim src/config/brand-urls.js

# 2. Sync the input schema (automatic with pre-commit)
npm run update-schema

# 3. Test your changes
npm run dev:ritzcarlton
```

### Automatic Sync (Recommended)

For automatic synchronization, you can:

1. **Use the pre-commit script** (recommended):
   ```bash
   npm run pre-commit
   ```
   This automatically detects if `brand-urls.js` was modified and syncs the schema.

2. **Set up git hooks** (optional):
   ```bash
   # Add to .git/hooks/pre-commit (make it executable)
   npm run pre-commit
   ```

3. **Manual sync** (when needed):
   ```bash
   npm run update-schema
   ```

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `brandSelection` | string | ✅ | - | Select brand from dropdown (auto-syncs with brand-urls.js) |
| `proxyType` | string | ❌ | `datacenter` | Proxy type: `datacenter`, `residential`, `none` |
| `targetUrl` | string | ❌ | auto-detected | Manual URL override (optional) |
| `rateProfile` | string | ❌ | `normal` | Crawl aggressiveness: `slow`, `normal`, `fast` |
| `maxPages` | integer | ❌ | 10 | Maximum number of pages to scrape |
| `maxConcurrency` | integer | ❌ | 10 | Maximum concurrent requests |
| `maxRequestRetries` | integer | ❌ | 2 | Maximum retry attempts for failed requests |
| `navigationTimeoutSecs` | integer | ❌ | 60 | Navigation timeout in seconds |
| `requestDelayMs` | integer | ❌ | 1000 | Delay between requests in milliseconds |
| `respectRobotsTxt` | boolean | ❌ | true | Whether to respect robots.txt |
| `enableDebugMode` | boolean | ❌ | false | Enable detailed logging and HAR recording |

### Rate Profiles

- **Slow**: 2s delay, 1 concurrent request
- **Normal**: 1s delay, 10 concurrent requests  
- **Fast**: 0.5s delay, 20 concurrent requests

## Output Format

The scraper outputs hotel data in the following format:

```json
{
  "hotel_name": "string",
  "url": "string",
  "initial_url": "string",
  "marsha_code": "string",
  "slug": "string",
  "brand_name": "string",
  "brand_code": "string",
  "sub_brand_code": "string",
  "is_live": "boolean",
  "location": "string",
  "city": "string",
  "country": "string",
  "region": "string",
  "extracted_at": "ISO8601",
  "source_url": "string",
  "confidence_score": "number"
}
```

### Metadata

The scraper also provides metadata about the scraping session:

```json
{
  "type": "metadata",
  "total_hotels": "integer",
  "source_url": "string",
  "scraped_at": "string",
  "execution_time_ms": "integer",
  "brand_key": "string",
  "errors": {
    "error_type": "count"
  }
}
```

## Usage Examples

### Basic Usage

```javascript
// Scrape Marriott main directory
{
  "targetUrl": "https://marriott-hotels.marriott.com/locations/"
}

// Scrape Ritz-Carlton with specific brand
{
  "targetUrl": "https://www.ritzcarlton.com/en/hotels/",
  "brandKey": "ritzcarlton"
}

// Fast scraping with custom settings
{
  "targetUrl": "https://st-regis.marriott.com/hotels/",
  "rateProfile": "fast",
  "maxPages": 5
}
```

### Development Testing

Use the provided development scripts to test individual brands:

```bash
# Test Ritz-Carlton
npm run dev:ritzcarlton

# Test St. Regis
npm run dev:stregis

# Test Marriott main directory
npm run dev:marriottMain

# Test generic strategy
npm run dev:generic
```

## Architecture

The scraper uses a strategy-based architecture with the following components:

### Core Components

- **Configuration Management** (`src/config/`): Brand codes, domain patterns, crawler settings
- **Strategy System** (`src/strategies/`): Brand-specific extraction strategies
- **Shared Utilities** (`src/utils/`): URL parsing, data cleaning, error handling
- **Compliance Layer** (`src/compliance/`): Rate limiting, robots.txt checking

### Strategy Pattern

Each brand has its own strategy class that extends the base strategy:

```javascript
class RitzCarltonStrategy extends BaseStrategy {
  async scrape(page, context) {
    // Brand-specific extraction logic
  }
}
```

### Selector Configuration

Brand-specific selectors are stored in JSON files:

```json
{
  "name": "Ritz-Carlton Strategy",
  "waitForSelector": ".hotels-list",
  "selectors": {
    "hotelLinks": "a[href*='/hotels/']",
    "hotelName": ".hotel-name",
    "hotelUrl": "a[href*='/hotels/']"
  }
}
```

## Error Handling

The scraper includes comprehensive error handling:

- **Dead Hotel Detection**: Identifies hotels that have left the Marriott portfolio
- **Validation Errors**: Data validation with detailed error reporting
- **Network Errors**: Automatic retry with exponential backoff
- **Extraction Errors**: Graceful handling of individual hotel failures

All errors are captured in the dataset with the following format:

```json
{
  "type": "error",
  "error_type": "string",
  "message": "string",
  "url": "string",
  "marsha_code": "string",
  "status": "integer",
  "timestamp": "ISO8601"
}
```

## Performance

- **Target**: <5 minutes per brand, <30 minutes total for all brands
- **Concurrency**: Configurable (default: 10 concurrent requests)
- **Memory**: <500MB peak usage
- **Success Rate**: >95% for supported brands

## Development

### Running Tests

```bash
# Run unit tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

### Adding New Brands

1. Add domain pattern to `src/config/domains.js`
2. Create selector file in `src/config/selectors/`
3. Create strategy class in `src/strategies/`
4. Update factory mapping in `src/strategies/factory.js`

### Project Structure

```
├── .actor/
│   ├── actor.json                    # Apify Actor metadata
│   └── input_schema.json             # Apify input schema
├── src/
│   ├── strategies/                   # Brand-specific strategies
│   ├── utils/                        # Shared utilities
│   ├── config/                       # Configuration files
│   ├── compliance/                   # Compliance layer
│   ├── main.js                       # Apify Actor entry point
│   └── routes.js                     # Legacy router (deprecated)
├── package.json                      # Node.js dependencies
├── Dockerfile                        # Apify Actor container
└── README.md                         # Documentation
```

## License

ISC License

## Support

For issues and questions, please refer to the Apify platform documentation or create an issue in the project repository.
