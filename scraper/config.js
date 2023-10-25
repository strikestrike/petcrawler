module.exports = {
	searchUrls: [
		'https://www.petfinder.com/search/dogs-for-adoption/ca/newfoundland-and-labrador/?distance=Anywhere&page=468&sort%5B0%5D=available_longest',
		//'https://www.petfinder.com/search/cats-for-adoption/ca/newfoundland-and-labrador/?distance=Anywhere&sort%5B0%5D=available_longest',
	],
	dbConnection: {
		host: 'localhost',
		user: 'root',
		password: '',
		database: 'pet_db',
		port: 3306, // MySQL default port (change if necessary)
	},
};