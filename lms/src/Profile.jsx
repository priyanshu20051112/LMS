import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./Profile.css";

const Profile = () => {
  const [username, setUsername] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      setUsername(userData.moodle_id);
      setName(userData.name || "");
      setDepartment(userData.department || "");
    }
  }, []);

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
    setShowUserDropdown(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleEditClick = () => {
    setEditName(name);
    setEditDepartment(department);
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    setName(editName);
    setDepartment(editDepartment);

    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      userData.name = editName;
      userData.department = editDepartment;
      localStorage.setItem("user", JSON.stringify(userData));
    }
    setShowEditModal(false);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
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
                <div
                  className="user-dropdown-option"
                  onClick={() => handleMenuOptionClick("profile")}
                >
                  <i className="fa-solid fa-user"></i> Profile
                </div>
              </div>
            )}
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </button>
        </div>
      </nav>
      {/* Nav ends here*/}

      {/* Profile card below navbar */}
      <div className="profile-content">
        <div className="profile-card">
          <img
            src="/assets/profile-icon.png"
            alt="Profile"
            className="profile-avatar"
          />
          <div className="profile-details">
            <div>
              <b>Name:</b> {name}
            </div>
            <div>
              <b>Email:</b> {username ? `${username}@apsit.edu.in` : ""}
            </div>
            <div>
              <b>Department:</b> {department}
            </div>

            {/*Profile edit karneko*/}
            <div>
              <span className="profile-edit-link" onClick={handleEditClick}>
                Edit
              </span>
            </div>
          </div>
        </div>

        {/* History Card */}
        <div className="profile-card profile-history-card">
          <h2 className="profile-history-heading">History</h2>
          {/* Add history content here if needed */}
        </div>
        {showEditModal && (
          <div className="profile-edit-overlay">
            <div className="profile-edit-modal">
              <h3>Edit Profile</h3>
              <div className="profile-edit-form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="profile-edit-form-group">
                <label>Department:</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                />
              </div>
              <div className="profile-edit-modal-actions">
                <button onClick={handleEditSave} className="profile-edit-save">
                  Save
                </button>
                <button
                  onClick={handleEditCancel}
                  className="profile-edit-cancel"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
