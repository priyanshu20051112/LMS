import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Login.jsx";
import Home from "./Home.jsx";
import Profile from "./Profile.jsx";
import Admin from "./Admin.jsx";
import UserHistory from "./UserHistory.jsx";
import AdminHistory from "./AdminHistory.jsx";
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/history" element={<UserHistory />} />
        <Route path="/admin-history" element={<AdminHistory />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
