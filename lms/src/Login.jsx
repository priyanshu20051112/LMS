import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <img className="logo-image" src="/assets/apsit.png" alt="Library Logo" />
      <h1>PCT's A. P. Shah Institute of Technology - Library</h1>
    </nav>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const [moodleId, setMoodleId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moodle_id: moodleId,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store user info and token in localStorage
        localStorage.setItem(
          "user",
          JSON.stringify({
            moodle_id: moodleId,
            role: data.role,
            token: data.token,
          }),
        );

        // Navigate based on role
        if (data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/home");
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Unable to connect to server. Please try again.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />
      <div className="login-wrapper">
        <div className="login-container">
          <form onSubmit={handleLogin}>
            <h3>
              <i className="fa-solid fa-user"></i> Login
            </h3>

            {error && (
              <div
                style={{
                  color: "red",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <div className="input-group">
              <label>
                <i className="fa-solid fa-user-graduate"></i> Moodle ID
              </label>
              <input
                type="text"
                placeholder="Enter Moodle ID"
                value={moodleId}
                onChange={(e) => setMoodleId(e.target.value)}
                required
              /><br></br><br></br>
            </div>

            <div className="input-group">
              <label>
                <i className="fa-solid fa-lock"></i> Password
              </label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              /><br></br><br></br>
            </div>

            <button className="login-button" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
