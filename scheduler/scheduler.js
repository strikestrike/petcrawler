const cron = require('node-cron');
const scraper = require('../scraper/scraper');

// Schedule the scraper to run every day at midnight
cron.schedule('0 0 * * *', () => {
    console.log('Starting the web scraping process...');
    scraper.startScraping();
});

// Function to start the scheduler
function startScheduler() {
    // Start the cron job
    console.log('Scheduler is running...');
}

module.exports = { startScheduler };