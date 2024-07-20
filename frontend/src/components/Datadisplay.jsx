import React, { useState } from "react";
import axios from "axios";
import "./display.css";
import logo from "../assets/CL-logo.png";

const SearchForm = () => {
  const [textBoxQuery, setTextBoxQuery] = useState("");
  const [keyword1, setKeyword1] = useState("");
  const [keyword2, setKeyword2] = useState("");
  const [excludeWord, setExcludeWord] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(
        "https://web-scraper-qes3.onrender.com/search",
        {
          params: {
            textBoxQuery,
            keyword1,
            keyword2,
            excludeWord,
          },
        }
      );
      setResults(response.data);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  };

  return (
    <div>
      <div className="header">
        <img src={logo} alt="Logo" />
      </div>
      <div className="container">
        <form onSubmit={handleSearch}>
          <label>
            Enter Your Query:
            <input
              type="text"
              value={textBoxQuery}
              onChange={(e) => setTextBoxQuery(e.target.value)}
            />
          </label>
          <label>
            Keyword 1:
            <input
              type="text"
              value={keyword1}
              onChange={(e) => setKeyword1(e.target.value)}
            />
          </label>
          <label>
            Keyword 2:
            <input
              type="text"
              value={keyword2}
              onChange={(e) => setKeyword2(e.target.value)}
            />
          </label>
          <label>
            Exclude Word:
            <input
              type="text"
              value={excludeWord}
              onChange={(e) => setExcludeWord(e.target.value)}
            />
          </label>
          <button type="submit">Search</button>
        </form>
        <div className="results">
          <h2>Search Results:</h2>
          {results.map((result, index) => (
            <div key={index} className="result-item">
              <a href={result.link} target="_blank" rel="noopener noreferrer">
                <h3>{result.title}</h3>
              </a>
              {result.hasSubmissionLinks ? (
                <p>Contains submission links or buttons.</p>
              ) : (
                <p>Does not contain submission links or buttons.</p>
              )}
              {result.expiryDates.length > 0 ? (
                <div>
                  <p>Expiry Dates:</p>
                  <ul>
                    {result.expiryDates.map((date, i) => (
                      <li key={i}>{date}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>No expiry dates found.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
