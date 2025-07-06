import React, { useState } from "react";
import axios from "axios";
import "./App.css";

import backgroundImage from "./assets/background.jpg";
import logo from "./assets/logo.png";

function App() {
  const [url, setUrl] = useState("");
  const [formats, setFormats] = useState([]);
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const extractVideoID = (youtubeUrl) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be|be\.com)\/(?:watch\?v=)?([^&\n?#]+)/;
    const match = youtubeUrl.match(regex);
    return match ? match[1] : null;
  };

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        "https://video-downloader-backend-rniz.onrender.com/api/fetch-info",
        { url }
      );

      setTitle(res.data.title);

      const filtered = res.data.formats.filter(
        (f) =>
          f.ext === "mp4" &&
          f.format_id &&
          f.format_note &&
          f.filesize &&
          f.format_note !== "DASH audio"
      );

      setFormats(filtered);

      const videoId = extractVideoID(url);
      setThumbnail(
        videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : ""
      );
    } catch (err) {
      alert("❌ Failed to fetch video info.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format_id) => {
    window.open(
      `https://video-downloader-backend-rniz.onrender.com/api/download?url=${encodeURIComponent(
        url
      )}&format_id=${format_id}`
    );
  };

  const handleDownloadAudio = () => {
    window.open(
      `https://video-downloader-backend-rniz.onrender.com/api/download-audio?url=${encodeURIComponent(
        url
      )}`
    );
  };

  return (
    <div
      className={`app ${darkMode ? "dark" : ""}`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="container">
        <header>
          <img src={logo} alt="App Logo" className="logo" />
          <h1>YouTube Downloader</h1>
          <button className="toggle" onClick={toggleDarkMode}>
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </header>

        <div className="input-section">
          <input
            type="text"
            placeholder="Paste YouTube video link"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="btn-group">
            <button onClick={fetchInfo} disabled={loading}>
              🔍 {loading ? "Fetching..." : "Fetch Info"}
            </button>
            <button onClick={handleDownloadAudio}>🎧 MP3 Only</button>
          </div>
        </div>

        {loading && (
          <div className="spinner">
            <div className="loader"></div>
            <p>Loading video info...</p>
          </div>
        )}

        {thumbnail && (
          <div className="video-info">
            <img src={thumbnail} alt="Video Thumbnail" />
            <h2>{title}</h2>
            <ul>
              {formats.map((f) => (
                <li key={f.format_id}>
                  <span>
                    {f.format_note} • {f.ext} •{" "}
                    {f.filesize
                      ? (f.filesize / 1000000).toFixed(2) + " MB"
                      : "?"}
                  </span>
                  <button onClick={() => handleDownload(f.format_id)}>
                    ⬇ Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
