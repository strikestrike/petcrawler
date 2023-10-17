const puppeteer = require('puppeteer');
const config = require('./config');
const db = require('../db/database');

async function startScraping() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(config.searchUrl);

        // Wait for the pagination control to load
        await page.waitForSelector('.animalSearchSelect-customSelect-btn .m-txt_ellipsisOverflow');

        // Extract the total number of pages
        const totalPagesText = await page.$eval('.animalSearchSelect-customSelect-btn .m-txt_ellipsisOverflow select', (element) => {
            return element.textContent.trim();
        });

        // Parse the total number of pages from the text
        const totalPagesMatch = totalPagesText.match(/PAGE (\d+)\/(\d+)/);
        const currentPage = parseInt(totalPagesMatch[1]);
        const totalPages = parseInt(totalPagesMatch[2]);

        for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
            // Extract the details for each pet listing on the current page
            const petListings = await page.$$('.card_divide');

            for (const listing of petListings) {
                const animalLink = await listing.evaluate((element) => element.getAttribute('href'));
                console.log('Animal Link:', animalLink);

                // Pass the animal detail page URL to the scraping function
                await scrapePetDetails(animalLink);
            }

            // Navigate to the next page if it's not the last page
            if (currentPage < totalPages) {
                await page.select('pfdc-generic-select select', `${currentPage + 1}`);
                await page.waitForNavigation();
            }
        }
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

async function scrapePetDetails(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url);

        // Wait for the pet listings to load
        await page.waitForSelector('.card_divide');

        // Extract the details for each pet listing
        const petListings = await page.$$('.card_divide');

        for (const listing of petListings) {
            const name = await listing.$('.Pet_Name');
            const location = await listing.$('.Pet_Location');
            const breed = await listing.$('.Pet_Breeds');
            const age = await listing.$('[data-test="Pet_Age"]');
            const sex = await listing.$('[data-test="Pet_Sex"]');
            const description = await listing.$('[data-test="Pet_Story_Section"] .u-vr4x');

            const animalId = await listing.$('[role="main"] pfdc-pet-carousel').getAttribute('animal-id');
            const email = await listing.$('[href^="mailto:"]').evaluate((el) => el.innerText);

            // Extract the text content
            const nameText = await (await name.getProperty('textContent')).jsonValue();
            const locationText = await (await location.getProperty('textContent')).jsonValue();
            const breedText = await (await breed.getProperty('textContent')).jsonValue();
            const ageText = await (await age.getProperty('textContent')).jsonValue();
            const sexText = await (await sex.getProperty('textContent')).jsonValue();
            const descriptionText = await (await description.getProperty('textContent')).jsonValue();
            const emailText = email.trim();

            // Save the data to the database or process it as needed
            const data = {
                name: nameText.trim(),
                location: locationText.trim(),
                breed: breedText.trim(),
                age: ageText.trim(),
                sex: sexText.trim(),
                description: descriptionText.trim(),
                animalId,
                email: emailText,
            };

            console.log('Scraped Data:', data);

            await saveToDatabase(data);
        }
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

async function saveToDatabase(data) {
    try {
        await db.query('INSERT INTO pets (name, location, breed, age, sex, description, animal_id, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
            data.name,
            data.location,
            data.breed,
            data.age,
            data.sex,
            data.description,
            data.animalId,
            data.email,
        ]);
        console.log('Data saved to the database.');
    } catch (error) {
        console.error('Error saving data to the database:', error);
    }
}


module.exports = { startScraping };