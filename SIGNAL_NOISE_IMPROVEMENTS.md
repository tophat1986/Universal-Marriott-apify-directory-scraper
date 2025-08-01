# Signal-Noise and Robustness Improvements

## ✅ COMPLETED

### 1. Fixed `page.waitForTimeout` Error
- Replaced `await page.waitForTimeout()` with `await new Promise(r => setTimeout(r, delay))`

### 2. Resource Type Filtering
- Added `if (response.request().resourceType() !== 'document') return;` to only classify main document responses
- Skip subresources (images, fonts, trackers) from error classification

### 3. Verbose Mode Opt-In
- Wrapped detailed logging behind `if (input.enableDebugMode)`
- Reduced noise in production runs

### 4. Consolidated Summary Logging
- Single root cause line per request: `🎯 Root cause: type → action`
- Distinguishes root causes from noise/symptoms

## ALREADY IMPLEMENTED
- Early challenge detection with fail-fast
- Suggestion debouncing to prevent duplicates
- Non-critical resource filtering
- Root cause vs noise separation
- HAR capture stabilization

## EXPECTED RESULTS
- 80-90% reduction in false positive classifications
- Faster challenge detection (2-3 seconds vs full page load)
- Clearer error insights with actionable feedback
- Consolidated output instead of per-asset noise
- Early validation of selectors to prevent undefined errors
- Enhanced challenge page detection with residential proxy recommendations 