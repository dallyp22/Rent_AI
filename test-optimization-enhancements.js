// Comprehensive test script for optimization page enhancements

import { formatCurrency, formatCurrencyChange, formatLargeCurrency } from './client/src/utils/formatters.ts';

const testOptimizationEnhancements = async () => {
  const BASE_URL = 'http://localhost:5000';
  
  console.log('🚀 Testing Optimization Page Enhancements');
  console.log('==========================================\n');

  // Phase 1: Currency Formatting Tests
  console.log('📊 PHASE 1: Currency Formatting Tests');
  console.log('=====================================');
  
  try {
    // Test all currency formatting functions with various edge cases
    const testCases = [
      { name: 'Standard amount', value: 1234.56, expected: '$1,234.56' },
      { name: 'Large amount', value: 1234567.89, expected: '$1,234,567.89' },
      { name: 'Small decimal', value: 0.01, expected: '$0.01' },
      { name: 'Zero value', value: 0, expected: '$0.00' },
      { name: 'Negative amount', value: -150.75, expected: '-$150.75' },
      { name: 'Floating precision issue', value: 990.15000000000001, expected: '$990.15' },
      { name: 'Null value', value: null, expected: '$0.00' },
      { name: 'Undefined value', value: undefined, expected: '$0.00' },
      { name: 'String number', value: '1500.25', expected: '$1,500.25' },
      { name: 'Invalid string', value: 'abc', expected: '$0.00' },
      { name: 'Empty string', value: '', expected: '$0.00' },
      { name: 'Very large number', value: 999999999.99, expected: '$999,999,999.99' }
    ];
    
    console.log('Testing formatCurrency function:');
    let passed = 0;
    let failed = 0;
    
    testCases.forEach(test => {
      try {
        const result = formatCurrency(test.value);
        if (result === test.expected) {
          console.log(`✅ ${test.name}: ${result}`);
          passed++;
        } else {
          console.log(`❌ ${test.name}: Expected ${test.expected}, got ${result}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
        failed++;
      }
    });
    
    // Test formatCurrencyChange function
    console.log('\nTesting formatCurrencyChange function:');
    const changeTests = [
      { name: 'Positive change', value: 25.50, expected: '+$25.50' },
      { name: 'Negative change', value: -15.25, expected: '-$15.25' },
      { name: 'Zero change', value: 0, expected: '$0.00' },
      { name: 'Large positive', value: 1250.75, expected: '+$1,250.75' },
      { name: 'Small negative', value: -0.01, expected: '-$0.01' }
    ];
    
    changeTests.forEach(test => {
      try {
        const result = formatCurrencyChange(test.value);
        if (result === test.expected) {
          console.log(`✅ ${test.name}: ${result}`);
          passed++;
        } else {
          console.log(`❌ ${test.name}: Expected ${test.expected}, got ${result}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
        failed++;
      }
    });
    
    // Test formatLargeCurrency function
    console.log('\nTesting formatLargeCurrency function:');
    const largeTests = [
      { name: 'Million', value: 1234567.89, expected: '$1,234,567.89' },
      { name: 'Billion', value: 1234567890.12, expected: '$1,234,567,890.12' },
      { name: 'Trillion', value: 1234567890123.45, expected: '$1,234,567,890,123.45' }
    ];
    
    largeTests.forEach(test => {
      try {
        const result = formatLargeCurrency(test.value);
        if (result === test.expected) {
          console.log(`✅ ${test.name}: ${result}`);
          passed++;
        } else {
          console.log(`❌ ${test.name}: Expected ${test.expected}, got ${result}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Error - ${error.message}`);
        failed++;
      }
    });
    
    console.log(`\n📊 Currency Formatting Test Results: ${passed} passed, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Currency formatting tests failed:', error.message);
  }

  // Phase 2: Create Test Property for Backend Testing
  console.log('\n🏢 PHASE 2: Creating Test Property for Optimization Testing');
  console.log('=======================================================');
  
  try {
    // Create a test property with optimization-friendly data
    const testProperty = {
      propertyName: 'Optimization Test Property',
      address: '123 Enhancement Ave, Test City, TC 12345',
      city: 'Test City',
      state: 'TC',
      totalUnits: 25,
      unitTypes: ['Studio', '1BR', '2BR'],
      currentOccupancy: 90,
      averageRent: 1500,
      marketArea: 'test-optimization'
    };
    
    console.log('Creating test property for optimization...');
    const createResponse = await fetch(`${BASE_URL}/api/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testProperty)
    });
    
    if (createResponse.ok) {
      const { property } = await createResponse.json();
      console.log(`✅ Created test property: ${property.propertyName} (ID: ${property.id})`);
      
      // Create test units for the property
      console.log('Creating test units...');
      const unitsResponse = await fetch(`${BASE_URL}/api/properties/${property.id}/units`, {
        method: 'POST'
      });
      
      if (unitsResponse.ok) {
        const units = await unitsResponse.json();
        console.log(`✅ Created ${units.length} test units`);
        
        // Test optimization generation
        console.log('\n🎯 Testing Optimization Generation...');
        const optimizationTests = [
          { goal: 'maximize-revenue', targetOccupancy: 85, riskTolerance: 3 },
          { goal: 'maximize-occupancy', targetOccupancy: 98, riskTolerance: 1 },
          { goal: 'balanced', targetOccupancy: 92, riskTolerance: 2 },
          { goal: 'custom', targetOccupancy: 95, riskTolerance: 2 }
        ];
        
        for (const test of optimizationTests) {
          console.log(`Testing ${test.goal} optimization...`);
          const optResponse = await fetch(`${BASE_URL}/api/properties/${property.id}/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test)
          });
          
          if (optResponse.ok) {
            const optimization = await optResponse.json();
            console.log(`✅ ${test.goal}: Generated recommendations for ${optimization.units?.length || 0} units`);
            
            // Verify currency formatting in response
            if (optimization.units && optimization.units.length > 0) {
              const sampleUnit = optimization.units[0];
              const currentRent = parseFloat(sampleUnit.currentRent);
              const recommendedRent = parseFloat(sampleUnit.recommendedRent || sampleUnit.currentRent);
              
              console.log(`   Sample unit: Current ${formatCurrency(currentRent)} → Recommended ${formatCurrency(recommendedRent)}`);
            }
          } else {
            console.log(`❌ ${test.goal}: Failed to generate optimization`);
          }
        }
        
      } else {
        console.log('❌ Failed to create test units');
      }
      
    } else {
      const error = await createResponse.text();
      console.log(`❌ Failed to create test property: ${error}`);
    }
    
  } catch (error) {
    console.error('❌ Backend testing failed:', error.message);
  }

  // Phase 3: Frontend Testing Instructions
  console.log('\n🎨 PHASE 3: Frontend Testing Instructions');
  console.log('=======================================');
  
  console.log(`
📋 Manual Frontend Testing Checklist:

🎛️  OPTIMIZATION CONTROLS TESTING:
1. Navigate to the optimization page for the test property
2. Test preset automation:
   - Select "Maximize Revenue" → Verify occupancy auto-sets to 85%, risk to High
   - Select "Maximize Occupancy" → Verify occupancy auto-sets to 98%, risk to Low  
   - Select "Balanced" → Verify occupancy auto-sets to 92%, risk to Medium
   - Select "Custom" → Verify sliders become enabled
3. Test slider animations:
   - Watch for smooth 500ms transitions when presets change
   - Verify sliders are disabled for presets, enabled for custom
4. Test parameter flow:
   - Change values and generate recommendations
   - Verify parameters are preserved in workflow state

📊 TABLE INTERACTIONS TESTING:
1. Generate optimization recommendations
2. Test quick-adjust buttons:
   - Click -$10, -$5, +$5, +$10 buttons
   - Verify immediate price updates
   - Check real-time impact calculations
3. Test manual price editing:
   - Type new values in price inputs
   - Verify proper currency formatting (2 decimals)
   - Test debouncing with rapid changes
4. Check visual indicators:
   - Verify green arrows for increases, red for decreases
   - Check color-coded annual impact displays
   - Test hover effects on buttons and rows

💻 CONSOLE & PERFORMANCE TESTING:
1. Open browser developer tools
2. Check for:
   - No React key warnings
   - No console errors or LSP diagnostics
   - Smooth animations (no jank)
   - Responsive interactions
3. Test workflow persistence:
   - Refresh page and verify state is maintained
   - Navigate away and back, check parameter persistence

🔄 INTEGRATION TESTING:
1. Complete full workflow: Property Input → Optimization
2. Test all features working together:
   - Currency formatting throughout
   - Controls + table interactions
   - Export functionality
   - Save/load workflow state
3. Verify existing functionality intact:
   - All buttons work
   - No broken features
   - Professional appearance

✅ SUCCESS CRITERIA:
- All currency displays show exactly 2 decimal places
- No floating-point precision issues visible
- Smooth preset animations (500ms)
- Responsive quick-adjust buttons  
- Real-time calculation updates
- No console warnings or errors
- Professional user experience
`);

  console.log('\n🎉 Optimization Enhancement Testing Guide Complete!');
  console.log('Use the checklist above to verify all features work correctly.');
  
};

// Run the test if this script is executed directly
if (import.meta.main) {
  await testOptimizationEnhancements();
}

export { testOptimizationEnhancements };