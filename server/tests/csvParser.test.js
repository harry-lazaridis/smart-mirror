import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCSV } from '../src/utils/csvParser.js';

// Setup __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFilePath = path.join(__dirname, 'dummy_test.csv');

async function testParser() {
    console.log('Creating a dummy CSV file...');
    const csvContent = 
`id,name,role,is_active
1,Alice,admin,true
2,Bob,editor,false
3,Charlie,user,true`;
    
    // Write test file
    fs.writeFileSync(testFilePath, csvContent);
    
    try {
        console.log('Testing CSV parser...');
        const data = await parseCSV(testFilePath);
        console.log(`\nSuccessfully parsed ${data.length} rows!`);
        console.log('\nHere are the rows as standard JSON:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Clean up the dummy test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
            console.log('\nCleanup complete.');
        }
    }
}

testParser();