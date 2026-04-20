import ical from 'node-ical';

/**
 * Parses an iCal URL or local file path into a standardized JSON array of events.
 * 
 * @param {string} source - The URL or local file path to the iCal data.
 * @param {boolean} isUrl - True if the source is a URL, false if it's a local file.
 * @returns {Promise<Array>} - A promise that resolves to an array of parsed event objects.
 */
async function parseICal(source, isUrl = true) {
    try {
        let events;
        // Fetch and parse the iCal data
        if (isUrl) {
            events = await ical.async.fromURL(source);
        } else {
            events = await ical.async.parseFile(source);
        }

        const parsedEvents = [];

        // Loop through all parsed entities
        for (const event of Object.values(events)) {
            // Only aggregate calendar events ('VEVENT')
            if (event.type === 'VEVENT') {
                parsedEvents.push({
                    id: event.uid,
                    title: event.summary,
                    description: event.description,
                    start: event.start,
                    end: event.end,
                    location: event.location
                });
            }
        }

        // Sort events chronologically by start date
        parsedEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

        return parsedEvents;
    } catch (error) {
        console.error('Error parsing iCal:', error);
        throw error;
    }
}

export { parseICal };