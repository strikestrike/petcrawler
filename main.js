const scraper = require('./scraper/scraper');
const scheduler = require('./scheduler/scheduler');

// Start the scheduler to automate scraping
// scheduler.startScheduler();

// Optionally, you can run the scraper manually as well
scraper.startScraping();