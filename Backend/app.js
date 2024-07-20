require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Define your API key and Custom Search Engine (CSE) ID
const API_KEY = process.env.API_KEY;
const CX = process.env.CX;


const app = express();
const port = 3001;

app.use(cors());

const googleSearch = async (query, apiKey, cx, dateRestrict) => {
    const url = `https://www.googleapis.com/customsearch/v1?q=${query}&key=${apiKey}&cx=${cx}&dateRestrict=${dateRestrict}`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        return null;
    }
};

const processSearchResults = (searchResults) => {
    if (!searchResults) {
        return [];
    }
    const results = searchResults.items.map(item => ({
        title: item.title,
        link: item.link,
    }));
    return results;
};

const buildQuery = (baseQuery, keyword1, keyword2, excludeWord, textBoxQuery = '') => {
    const query = `${textBoxQuery} ${keyword1} ${keyword2} -${excludeWord}`;
    return query.trim();
};

app.get('/search', async (req, res) => {
    const { textBoxQuery, keyword1, keyword2, excludeWord } = req.query;

    const baseQuery = 'Indian cricket team';
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateRestrict = 'd6';  // Using 'd6' for the last 6 months, adjust as needed

    const query = buildQuery(baseQuery, keyword1, keyword2, excludeWord, textBoxQuery);
    const searchResults = await googleSearch(query, API_KEY, CX, dateRestrict);
    const usableResults = processSearchResults(searchResults);

    res.json(usableResults);
});

app.listen(port, () => {
    console.log(`Server is running on Port:${port}`);
});
