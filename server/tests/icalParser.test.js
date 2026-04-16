import { parseICal } from '../src/utils/icalParser.js';

// Imports a public iCal (holidays) URL and tests the parser by logging the results to the console.
// Run with `node server/tests/icalParser.test.js`
async function testParser() {
    console.log('Testing iCal parser with a public US Holidays calendar URL...');
    const testUrl = 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics';
    
    try {
        const events = await parseICal(testUrl, true);
        console.log(`\nSuccessfully parsed ${events.length} events!`);
        console.log('\nHere are the first 3 events as standard JSON:');
        console.log(JSON.stringify(events.slice(0, 3), null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testParser();