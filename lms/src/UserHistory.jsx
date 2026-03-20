import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./Home.css";

const UserHistory = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [requestHistory, setRequestHistory] = useState([]);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      const raw = localStorage.getItem("user");
      if (!raw) {
        navigate("/");
        return;
      }

      let token = null;
      try {
        const userData = JSON.parse(raw);
        token = userData?.token;
        setUsername(userData?.moodle_id || "");
      } catch {
        localStorage.removeItem("user");
        navigate("/");
        return;
      }

      if (!token) {
        navigate("/");
        return;
      }

      try {
        const response = await fetch("http://127.0.0.1:5000/history", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setRequestHistory(data.request_history || []);
          setTransactionHistory(data.transaction_history || []);
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("user");
          navigate("/");
        } else {
          setError(data.message || "Failed to load history");
        }
      } catch (err) {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest(".user-menu-wrapper")) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserDropdown]);

  const handleUserMenuClick = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const handleMenuOptionClick = (option) => {
    if (option === "profile") {
      navigate("/profile");
    }
    if (option === "history") {
      navigate("/history");
    }
    setShowUserDropdown(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div>
      <nav className="home-nav">
        <img
          className="logo-image"
          src="/assets/apsit.png"
          alt="Library Logo"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/home")}
        />
        <h1
          style={{ cursor: "pointer", display: "inline-block", marginLeft: 10 }}
          onClick={() => navigate("/home")}
        >
          PCT's A. P. Shah Institute of Technology
        </h1>
        <div className="user-section">
          <div className="user-menu-wrapper">
            <span className="user-greeting" onClick={handleUserMenuClick}>
              Hi, {username} <i className="fa-solid fa-chevron-down"></i>
            </span>
            {showUserDropdown && (
              <div className="user-dropdown">
                <div className="user-dropdown-option" onClick={() => handleMenuOptionClick("profile")}>
                  <i className="fa-solid fa-user"></i> Profile
                </div>
                <div className="user-dropdown-option" onClick={() => handleMenuOptionClick("history")}>
                  <i className="fa-solid fa-clock-rotate-left"></i> History
                </div>
              </div>
            )}
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </nav>

      <div className="page-header">
        <h2><i className="fa-solid fa-clock-rotate-left"></i> User History</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="header-btn" onClick={() => navigate("/home")}>
            <i className="fa-solid fa-arrow-left"></i> Back to Home
          </button>
        </div>
      </div>

      <div style={{ padding: "30px 40px" }}>
        {loading && <p>Loading history...</p>}
        {error && <p style={{ color: "#c0392b" }}>{error}</p>}

        {!loading && !error && (
          <>
            <h3>Request History</h3>
            {requestHistory.length === 0 ? (
              <p>No request history found.</p>
            ) : (
              <div className="table-wrapper" style={{ marginBottom: "24px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Book</th>
                      <th>Publisher</th>
                      <th>Status</th>
                      <th>Requested On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestHistory.map((item) => (
                      <tr key={item.request_id}>
                        <td>{item.request_id}</td>
                        <td>{item.book_name}</td>
                        <td>{item.publisher || "-"}</td>
                        <td style={{ textTransform: "capitalize" }}>{item.status}</td>
                        <td>{item.request_date ? new Date(item.request_date).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3>Issued/Returned History</h3>
            {transactionHistory.length === 0 ? (
              <p>No transaction history found.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Book</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Return Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionHistory.map((item) => (
                      <tr key={item.transaction_id}>
                        <td>{item.transaction_id}</td>
                        <td>{item.book_name}</td>
                        <td>{item.issue_date ? new Date(item.issue_date).toLocaleDateString() : "-"}</td>
                        <td>{item.due_date ? new Date(item.due_date).toLocaleDateString() : "-"}</td>
                        <td>{item.return_date ? new Date(item.return_date).toLocaleDateString() : "-"}</td>
                        <td style={{ textTransform: "capitalize" }}>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserHistory;
