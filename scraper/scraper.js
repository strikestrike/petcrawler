const puppeteer = require('puppeteer');
const config = require('./config');
const db = require('../db/database');

async function startScraping() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    try {
        for (const url of config.searchUrls) {
            await page.goto(url);

            // Wait for the pagination control to load
            await page.waitForSelector('#page-select .animalSearchSelect-customSelect-btn .m-txt_ellipsisOverflow');
            // Wait for the 'Infinity' part to change to an integer
            await page.waitForFunction('document.querySelector("#page-select .animalSearchSelect-customSelect-btn .m-txt_ellipsisOverflow").textContent.match(/PAGE (\\d+)\\/(\\d+)/)');

            // Extract the total number of pages
            const totalPagesText = await page.$eval('#page-select .animalSearchSelect-customSelect-btn .m-txt_ellipsisOverflow', (element) => {
                return element.innerHTML.trim();
            });

            // Parse the total number of pages from the text
            console.log(totalPagesText);
            const totalPagesMatch = totalPagesText.match(/PAGE (\d+)\/(\d+)/);
            const startPage = parseInt(totalPagesMatch[1]);
            const totalPages = parseInt(totalPagesMatch[2]);

            for (let currentPage = startPage; currentPage <= totalPages; currentPage++) {
                // await page.screenshot({path: './screenshot_' + currentPage + '.png'});
		        console.log('CurrentPage: ', currentPage);
                // Extract the details for each pet listing on the current page
                const cardLinks = await page.$$('.animalSearchBody .grid-col a.petCard-link');
                console.log('cards count: ', cardLinks.length);
                for (const card of cardLinks) {
                    const animalLink = await card.evaluate((element) => element.getAttribute('href'));
                    console.log('Animal Link:', animalLink);

                    // Pass the animal detail page URL to the scraping function
                    await scrapePetDetails(animalLink);
                }

                // Navigate to the next page if it's not the last page
                if (currentPage < totalPages) {
                    await page.click('.animalSearchFooter .m-fieldBtn_iconRt');
                    await page.waitForNavigation();
                }
            }
        }
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

async function scrapePetDetails(url) {
    if (!url) {
        return;
    }

    const parts = url.split("/");
    const petType = parts[3]; // "dog" or "cat"
    if (petType != "dog" && petType != "cat") {
        console.log("The URL does not clearly specify if it's about a dog or a cat.");
        return;
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    try {
        await page.goto(url);

        // Wait for the pet listings to load
        await page.waitForSelector('.site-main');

        // Extract the image link
        let photolinks = '';
        const petCarousels = await page.$$('.petCarousel-body img');
        for (const carousel of petCarousels) {
            const imgSrc = await carousel.evaluate((element) => element.getAttribute('src'));
            if (imgSrc) {
                // Join the URLs with commas to create the combined string
                photolinks = photolinks + (photolinks != '' ? ',' : '') + imgSrc;
            }
        }

        // Extract the details
        const detailCard = await page.$('.card_divide');

        const name = await detailCard.$('#Detail_Main [data-test="Pet_Name"]');
        const location = await detailCard.$('#Detail_Main [data-test="Pet_Location"]');
        const breeds = await detailCard.$('[data-test="Pet_Breeds"]');
        const age = await detailCard.$('[data-test="Pet_Age"]');
        const sex = await detailCard.$('[data-test="Pet_Sex"]');
        const grownSize = await detailCard.$('[data-test="Pet_Full_Grown_Size"]');
        const color = await detailCard.$('[data-test="Pet_Primary_Color"]');
        const story = await detailCard.$('[data-test="Pet_Story_Section"] div.u-vr4x');

        const animalId = await page.$('.petCarousel');
        const email = await page.$('.card_org [href^="mailto:"]');
        const phone = await page.$('.card_org [href^="tel:"] [itemprop="telephone"]');
        const owner = await page.$('.card_org .txt_h2 span[itemprop="name"]');

        const animalIdText = animalId ? await animalId.evaluate((el) => el.getAttribute('animal-id')) : '';
        const emailText = email ? await email.evaluate((el) => el.textContent) : '';
        const phoneText = phone ? await phone.evaluate((el) => el.textContent) : '';
        const ownerText = owner ? await owner.evaluate((el) => el.textContent) : '';

        // Extract the text content
        const nameText = name ? await name.evaluate((el) => el.textContent) : '';
        const locationText = location ? await location.evaluate((el) => el.textContent) : '';
        const breedsText = breeds ? await breeds.evaluate((el) => el.textContent) : '';
        const ageText = age ? await age.evaluate((el) => el.textContent) : '';
        const sexText = sex ? await sex.evaluate((el) => el.textContent) : '';
        const grownSizeText = grownSize ? await grownSize.evaluate((el) => el.textContent) : '';
        const colorText = color ? await color.evaluate((el) => el.textContent) : '';
        const storyText = story ? await story.evaluate((el) => el.textContent) : '';
       

        // Save the data to the database or process it as needed
        const data = {
            name: nameText ? nameText.trim() : null,
            type: petType ? petType.trim() : null,
            owner: ownerText ? ownerText.trim() : null,
            location: locationText ? locationText.trim() : null,
            breeds: breedsText ? breedsText.trim() : null,
            age: ageText ? ageText.trim() : null,
            sex: sexText ? sexText.trim().toLowerCase() : null,
            size: nameText ? grownSizeText.trim() : null,
            color: colorText ? colorText.trim() : null,
            story: storyText ? storyText.trim() : null,
            animalId: animalIdText ? animalIdText.trim() : null,
            email: emailText ? emailText.trim() : null,
            phone: phoneText ? phoneText.trim() : null,
            photolinks: photolinks,
            url: url,
        };

        await saveToDatabase(data);
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await browser.close();
    }
}

async function saveToDatabase(data) {
    let conn = null;
    try {
        conn = await db.getConnection();

        await conn.execute('INSERT INTO pets (type, owner, name, location, breeds, age, sex, size, color, story, animal_id, email, phone, photos, url, created_at) \
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?, NOW())', [
            data.type,
            data.owner,
            data.name,
            data.location,
            data.breeds,
            data.age,
            data.sex,
            data.size,
            data.color,
            data.story,
            data.animalId,
            data.email,
            data.phone,
            data.photolinks,
            data.url
        ]);
        console.log('Data saved to the database.');
    } catch (error) {
        console.error('Error saving data to the database:', error);
    } finally {
        if (conn) {
            db.release(conn);
        }
    }
}


module.exports = { startScraping };