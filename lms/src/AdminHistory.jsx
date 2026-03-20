import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const Navbar = () => {
  return (
    <nav className="navbar-style">
      <div className="navbar-content">
        <img src="/assets/apsit.png" alt="College Logo" className="navbar-logo" />
        <div className="navbar-text">
          <h1>Parshvanath Charitable Trust's A. P. Shah Institute of Technology</h1>
          <h5>(Religious Jain Minority Institute, Affiliated to University of Mumbai, Approved by AICTE Delhi & DTE)</h5>
        </div>
      </div>
    </nav>
  );
};

const AdminHistory = () => {
  const navigate = useNavigate();
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
        token = JSON.parse(raw)?.token;
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
        const response = await fetch("http://127.0.0.1:5000/admin/history", {
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
          setError(data.message || "Failed to load admin history");
        }
      } catch {
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [navigate]);

  return (
    <div className="admin-page-wrapper">
      <Navbar />
      <div className="admin-header">
        <h2><i className="fa-solid fa-clock-rotate-left"></i> Admin History</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="logout-btn" onClick={() => navigate("/admin")}>
            <i className="fa-solid fa-arrow-left"></i> Back to Admin
          </button>
        </div>
      </div>
      <div className="admin-main-content">
        {loading && <p>Loading history...</p>}
        {error && <p style={{ color: "#c0392b" }}>{error}</p>}

        {!loading && !error && (
          <>
            <h3>All Request History</h3>
            {requestHistory.length === 0 ? (
              <p>No request history found.</p>
            ) : (
              <div className="table-wrapper" style={{ marginBottom: "24px", backgroundColor: "white", padding: "10px", borderRadius: "10px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Moodle ID</th>
                      <th>Student</th>
                      <th>Book</th>
                      <th>Status</th>
                      <th>Requested On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requestHistory.map((item) => (
                      <tr key={item.request_id}>
                        <td>{item.request_id}</td>
                        <td>{item.moodle_id}</td>
                        <td>{item.fullname || "-"}</td>
                        <td>{item.book_name}</td>
                        <td style={{ textTransform: "capitalize" }}>{item.status}</td>
                        <td>{item.request_date ? new Date(item.request_date).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3>All Transaction History</h3>
            {transactionHistory.length === 0 ? (
              <p>No transaction history found.</p>
            ) : (
              <div className="table-wrapper" style={{ backgroundColor: "white", padding: "10px", borderRadius: "10px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Moodle ID</th>
                      <th>Student</th>
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
                        <td>{item.moodle_id}</td>
                        <td>{item.fullname || "-"}</td>
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

export default AdminHistory;
