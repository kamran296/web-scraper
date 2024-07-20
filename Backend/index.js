require("dotenv").config({ path: "./config.env" });
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const https = require("https");
const moment = require("moment");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const API_KEY = process.env.API_KEY;
const CX = process.env.CX;

const app = express();
const port = 3001;
app.use(cors());

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

const googleSearch = async (query, apiKey, cx, dateRestrict) => {
  const url = `https://www.googleapis.com/customsearch/v1?q=${query}&key=${apiKey}&cx=${cx}&dateRestrict=${dateRestrict}`;
  try {
    const response = await axios.get(url);
    if (!response.data) return null;
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
  const results = searchResults.items.map((item) => ({
    title: item.title,
    link: item.link,
  }));
  return results;
};

const buildQuery = (
  baseQuery,
  keyword1,
  keyword2,
  excludeWord,
  textBoxQuery = ""
) => {
  const query = `${textBoxQuery} ${keyword1} ${keyword2} -${excludeWord}`;
  return query.trim();
};

// Submission-related keywords
const submissionKeywords = [
  "apply now",
  "submit",
  "register now",
  "submit paper online",
  "submit your paper",
  "submit abstract",
  "online submission",
  "apply today",
  "register today",
  "sign up",
  "join now",
  "start application",
  "start now",
  "submit application",
  "submit form",
  "submit your abstract",
  "upload paper",
  "upload your paper",
  "submit proposal",
  "submit your proposal",
  "submit document",
  "submit manuscript",
  "submit your manuscript",
  "submit entry",
  "submit nomination",
  "apply for award",
  "submit your entry",
  "apply for position",
  "apply online",
  "send application",
  "fill application",
  "fill out form",
  "complete application",
  "complete form",
  "join competition",
  "enter competition",
  "submit research",
  "submit your research",
  "submit project",
  "submit your project",
  "participate now",
  "participate today",
  "register online",
  "apply online now",
  "apply for scholarship",
  "apply for grant",
  "submit grant application",
  "submit scholarship application",
  "register for event",
  "join event",
  "sign up for event",
  "send proposal",
  "propose your idea",
  "submit idea",
  "submit presentation",
  "submit talk",
  "apply for membership",
  "join our team",
  "apply for job",
  "job application",
  "register for webinar",
  "join webinar",
  "register for workshop",
  "join workshop",
  "send your work",
  "upload document",
  "upload your document",
  "send us your work",
  "send us your application",
  "apply for program",
  "submit abstract online",
  "register for conference",
  "join conference",
  "participate in conference",
  "register for session",
  "join session",
];

// Expiry-related keywords
const expiryKeywords = [
  "deadline",
  "expiry date",
  "expiration date",
  "closing date",
  "end date",
  "last date",
  "due date",
  "submission deadline",
  "application deadline",
  "registration deadline",
  "final date",
  "cut-off date",
  "submission end date",
  "application end date",
  "registration end date",
  "last day to apply",
  "last day to submit",
  "last day to register",
  "valid until",
  "offer ends",
  "ends on",
  "expires on",
  "valid through",
  "valid till",
  "offer valid until",
  "apply by",
  "submit by",
  "register by",
  "final submission date",
  "final application date",
  "final registration date",
  "expiration",
  "offer expires",
  "submit before",
  "apply before",
  "register before",
  "closing on",
  "ending on",
  "valid for",
  "offer valid for",
  "expires",
  "submit until",
  "apply until",
  "register until",
  "until date",
  "accepting until",
  "final deadline",
  "cut-off time",
  "deadline for submissions",
  "deadline for applications",
  "deadline for registration",
  "final day",
  "closing time",
  "submission closes",
  "application closes",
  "registration closes",
  "Submission Last Date",
];

async function fetchPageContent(url) {
  try {
    const response = await axiosInstance.get(url);
    // console.log(response, "response");
    if (!response.data) return null;
    return response.data;
  } catch (error) {
    console.error(`Error fetching the page content from ${url}:`, error);
    return null;
  }
}

function checkForSubmissionLinks(html) {
  const $ = cheerio.load(html);
  let found = false;

  $('a, button, input[type="submit"]').each((index, element) => {
    const text = $(element).text().toLowerCase();
    const value = $(element).val() ? $(element).val().toLowerCase() : "";

    submissionKeywords.forEach((keyword) => {
      if (text.includes(keyword) || value.includes(keyword)) {
        found = true;
      }
    });
  });

  return found;
}

function extractExpiryDates(html) {
  const $ = cheerio.load(html);
  let dates = [];

  $("body").each((index, element) => {
    const text = $(element).text().toLowerCase();

    expiryKeywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        const regexPatterns = [
          /\b\d{1,2}(?:th|st|nd|rd)?\s+\w+\s+\d{4}\b/g, // e.g., 24th March 2024
          /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // e.g., 24/04/2024
          /\b\w+\s+\d{1,2},?\s+\d{4}\b/g, // e.g., March 24 2024
          /\b\d{1,2}\.\d{1,2}\.\d{4}\b/g, // e.g., 31.07.2024
        ];

        regexPatterns.forEach((pattern) => {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach((match) => {
              dates.push(match);
            });
          }
        });
      }
    });
  });

  const standardDates = dates.map((date) =>
    moment(date, [
      "DD MMMM YYYY",
      "DD/MM/YYYY",
      "MMMM DD, YYYY",
      "DD.MM.YYYY",
    ]).format("YYYY-MM-DD")
  );

  return standardDates.filter((date) => date !== "Invalid date");
}

async function checkSubmissionLinksAndExpiryDatesFromUrl(url) {
  const htmlContent = await fetchPageContent(url);
  if (htmlContent) {
    const hasSubmissionLinks = checkForSubmissionLinks(htmlContent);
    const expiryDates = extractExpiryDates(htmlContent);
    return { hasSubmissionLinks, expiryDates };
  } else {
    return { hasSubmissionLinks: false, expiryDates: [] };
  }
}

// Initialize the Google Spreadsheet
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

// const authenticateGoogleSheet = async () => {
//   console.log(creds, "creds");
//   console.log(process.env.FILE);
//   await doc.useServiceAccountAuth(creds);
//   await doc.loadInfo();
// };
async function authenticateGoogleSheet() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });
  await doc.loadInfo();
  console.log(`Loaded doc: ${doc.title}`);
}
async function writeToGoogleSheet(data) {
  // Initialize the sheet
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);

  // Authenticate with the Google Spreadsheets API
  await doc.useServiceAccountAuth({
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  });

  // Load the spreadsheet info
  await doc.loadInfo();

  // Now you can access the sheet by index
  const sheet = doc.sheetsByIndex[0]; // Assuming you want the first sheet

  // Write data to the sheet
  const rows = data.map((item) => ({
    title: item.title,
    link: item.link,
    hasSubmissionLinks: item.hasSubmissionLinks,
    expiryDates: item.expiryDates.join(", "),
  }));
  await sheet.addRows(rows);
}

// const writeToGoogleSheet = async (data) => {
//   const sheet = doc.sheetsByIndex[0];
//   const rows = data.map((item) => ({
//     title: item.title,
//     link: item.link,
//     hasSubmissionLinks: item.hasSubmissionLinks,
//     expiryDates: item.expiryDates.join(", "),
//   }));
//   await sheet.addRows(rows);
// };

app.get("/search", async (req, res) => {
  const { textBoxQuery, keyword1, keyword2, excludeWord } = req.query;

  const baseQuery = "Indian cricket team";
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const dateRestrict = "d6";

  const query = buildQuery(
    baseQuery,
    keyword1,
    keyword2,
    excludeWord,
    textBoxQuery
  );
  const searchResults = await googleSearch(query, API_KEY, CX, dateRestrict);
  const usableResults = processSearchResults(searchResults);

  const detailedResults = await Promise.all(
    usableResults.map(async (result) => {
      const details = await checkSubmissionLinksAndExpiryDatesFromUrl(
        result.link
      );
      return {
        title: result.title,
        link: result.link,
        hasSubmissionLinks: details.hasSubmissionLinks,
        expiryDates: details.expiryDates,
      };
    })
  );

  await authenticateGoogleSheet();
  await writeToGoogleSheet(detailedResults);

  res.json(detailedResults);
});

app.listen(port, () => {
  console.log(`Server is running on Port:${port}`);
});
