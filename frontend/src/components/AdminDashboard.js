import React, { useState, useEffect } from "react";
import bridge from "../services/Bridge";
import "./AdminDashboard.css";

const ADMIN_PASSWORD = "MBTI";

const AdminDashboard = () => {
  // State variables
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Check if user is already authenticated
  useEffect(() => {
    const isAuthenticated =
      localStorage.getItem("adminAuthenticated") === "true";
    setAuthenticated(isAuthenticated);

    // Fetch data if user has already authenticated
    if (isAuthenticated) {
      fetchRatingStats();
    } else {
      setLoading(false);
    }
  }, []);

  // Function to fetch rating statistics from the server
  const fetchRatingStats = async () => {
    try {
      setLoading(true);
      // Call bridge service to get ratings data
      const data = await bridge.getRatings();
      setStats(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError("Failed to load ratings data");
      setLoading(false);
    }
  };

  // Function for admin login
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setLoginError(false);
      localStorage.setItem("adminAuthenticated", "true");
      fetchRatingStats();
    } else {
      setLoginError(true);
    }
  };

  // Function for admin logout
  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem("adminAuthenticated");
  };

  // Function to refresh data
  const handleRefresh = () => {
    fetchRatingStats();
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <h1>Admin Dashboard</h1>
          <p>Please enter the admin password to continue</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className={loginError ? "error" : ""}
              />
              {loginError && (
                <div className="error-message">Incorrect password</div>
              )}
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (loading)
    return <div className="loading">Loading rating statistics...</div>;
  // Show error if data fetching fails
  if (error) return <div className="error">{error}</div>;
  // Show message if no data is available
  if (!stats)
    return <div className="no-data">No ratings data available yet.</div>;

  // Main dashboard view when authenticated and data is loaded
  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Reincarnation Quiz Rating Dashboard</h1>
        <p className="dashboard-subtitle">
          View how souls rated their cosmic experience
        </p>
        <div className="header-buttons">
          <button className="refresh-button" onClick={handleRefresh}>
            Refresh
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Overall stats section */}
      <div className="stats-overview">
        {/* Total number of ratings */}
        <div className="stat-card total-ratings">
          <h2>Number of People Who Rated</h2>
          <div className="stat-value">{stats.count}</div>
        </div>

        {/* Average rating section */}
        <div className="stat-card average-rating">
          <h2>Average Rating</h2>
          <div className="stat-value">
            {stats.avg}
            <span className="out-of-five">/5</span>
          </div>
          {/* Visual star representation of average rating */}
          <div className="stars-display">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star ${
                  star <= Math.round(stats.avg) ? "filled" : ""
                }`}
              >
                ★
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Rating distribution section */}
      {stats.distribution && (
        <div className="rating-distribution">
          <h2>Rating Distribution</h2>
          <div className="distribution-bars">
            {/* Create bar graph for each rating from 5 to 1 */}
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.distribution[rating] || 0;
              const percentage =
                stats.count > 0 ? Math.round((count / stats.count) * 100) : 0;

              return (
                <div key={rating} className="rating-bar-container">
                  <div className="rating-label">{rating} ★</div>
                  <div className="bar-and-count">
                    <div className="rating-bar">
                      <div
                        className="rating-bar-fill"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="rating-count">
                      {count}{" "}
                      <span className="percentage">({percentage}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
