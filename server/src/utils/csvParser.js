import fs from 'fs';
import csv from 'csv-parser';

/**
 * Parses a local CSV file into a standardized JSON array.
 * 
 * @param {string} filePath - The local file path to the CSV data.
 * @returns {Promise<Array>} - A promise that resolves to an array of parsed JSON objects.
 */
async function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        
        // Verify the file exists before attempting to read it
        if (!fs.existsSync(filePath)) {
            return reject(new Error(`File not found at path: ${filePath}`));
        }

        // Stream the file and pipe it through csv-parser
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

export { parseCSV };