/**
 * Unit tests for urlHelpers.js
 * Tests extractMarsha and extractSlug functions with embedded test cases from PRD
 */

import { extractMarsha, extractSlug } from './urlHelpers.js';

// Test cases embedded in urlHelpers.test.js as specified in PRD
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
];

// Dead hotel detection test cases
const deadHotelTestCases = [
  {
    input: 'https://www.marriott.com/DEADHOTEL',
    expectedMarsha: 'DEADHOTEL',
    expectedSlug: '',
    expectedIsLive: false,
    expectedStatus: 404
  }
];

// Additional edge cases
const edgeCases = [
  {
    input: 'https://www.marriott.com/hotels/travel/ABCDEF-test-hotel/',
    expectedMarsha: 'ABCDEF',
    expectedSlug: 'test-hotel'
  },
  {
    input: 'https://www.marriott.com/hotels/ABC-test/',
    expectedMarsha: 'ABC',
    expectedSlug: 'test'
  },
  {
    input: 'https://www.marriott.com/ABC',
    expectedMarsha: 'ABC',
    expectedSlug: ''
  },
  {
    input: '',
    expectedMarsha: '',
    expectedSlug: ''
  },
  {
    input: null,
    expectedMarsha: '',
    expectedSlug: ''
  },
  {
    input: 'https://www.marriott.com/hotels/travel/',
    expectedMarsha: '',
    expectedSlug: ''
  }
];

function runTests() {
  console.log('🧪 Running urlHelpers unit tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test extractMarsha function
  console.log('📋 Testing extractMarsha function:');
  [...testCases, ...deadHotelTestCases, ...edgeCases].forEach((testCase, index) => {
    const result = extractMarsha(testCase.input);
    const success = result === testCase.expectedMarsha;
    
    if (success) {
      console.log(`  ✅ Test ${index + 1}: PASSED`);
      passed++;
    } else {
      console.log(`  ❌ Test ${index + 1}: FAILED`);
      console.log(`     Input: ${testCase.input}`);
      console.log(`     Expected: "${testCase.expectedMarsha}"`);
      console.log(`     Got: "${result}"`);
      failed++;
    }
  });
  
  console.log('\n📋 Testing extractSlug function:');
  [...testCases, ...deadHotelTestCases, ...edgeCases].forEach((testCase, index) => {
    const result = extractSlug(testCase.input);
    const success = result === testCase.expectedSlug;
    
    if (success) {
      console.log(`  ✅ Test ${index + 1}: PASSED`);
      passed++;
    } else {
      console.log(`  ❌ Test ${index + 1}: FAILED`);
      console.log(`     Input: ${testCase.input}`);
      console.log(`     Expected: "${testCase.expectedSlug}"`);
      console.log(`     Got: "${result}"`);
      failed++;
    }
  });
  
  console.log('\n📊 Test Results:');
  console.log(`  Total tests: ${passed + failed}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

// Always run tests when this file is executed
runTests();

export { runTests }; 