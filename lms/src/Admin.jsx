import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Admin.css";
import LazyImage from "./components/LazyImage";

const Navbar = ({ onLogout }) => {
  return (
    <nav
      className="navbar-style"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <LazyImage
          src="/assets/apsit.png"
          alt="College Logo"
          className="navbar-logo"
          placeholder="/assets/demo.png"
        />
        <span
          style={{
            fontSize: "2.2rem",
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 1,
          }}
        >
          PCT's A. P. Shah Institute of Technology
        </span>
      </div>
      <button
        className="logout-btn"
        style={{
          background: "#e0b96a",
          color: "#2d3e2f",
          fontWeight: 600,
          fontSize: "1.1rem",
          padding: "10px 28px",
        }}
        onClick={onLogout}
      >
        <i className="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </nav>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const MAX_BOOKS_ALLOWED = 2;
  const MAX_DAYS_ALLOWED = 7;
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "allBooks",
  );
  const [requests, setRequests] = useState([]);
  const [searchMoodleId, setSearchMoodleId] = useState("");
  const [userBooks, setUserBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [bookSearch, setBookSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [analyticsBooks, setAnalyticsBooks] = useState([]);
  const [availableBooks, setAvailableBooks] = useState([]);
  const [directIssueForm, setDirectIssueForm] = useState({
    moodle_id: "",
    book_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [otpCache, setOtpCache] = useState({});
  const [newBook, setNewBook] = useState({
    book_name: "",
    publisher: "",
    description: "",
    cover_url: "",
    total_copies: 1,
  });
  const [modal, setModal] = useState({
    isOpen: false,
    type: "alert", // "alert" or "confirm"
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
  });
  const [otpModal, setOtpModal] = useState({
    isOpen: false,
    requestId: null,
    value: "",
    isSubmitting: false,
    error: "",
  });

  const showAlert = (title, message) => {
    setModal({
      isOpen: true,
      type: "alert",
      title,
      message,
      onConfirm: () => setModal((prev) => ({ ...prev, isOpen: false })),
      onCancel: null,
    });
  };

  const showConfirm = (title, message, onConfirmCallback) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm: () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
        if (onConfirmCallback) onConfirmCallback();
      },
      onCancel: () => setModal((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const getToken = () => {
    const user = localStorage.getItem("user");
    if (!user) {
      return null;
    }
    try {
      const userData = JSON.parse(user);
      return userData?.token || null;
    } catch (error) {
      localStorage.removeItem("user");
      return null;
    }
  };

  const handleAuthExpired = () => {
    localStorage.removeItem("user");
    showAlert("Session Expired", "Token expired. Please login again.");
    navigate("/");
  };

  const isUnauthorized = (response) => {
    if (response.status === 401 || response.status === 403) {
      handleAuthExpired();
      return true;
    }
    return false;
  };

  const fetchRequests = async () => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:5000/admin/requests", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to load requests");
        setRequests([]);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      setError("Failed to connect to server");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBooks = async (searchQuery = "") => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const url = searchQuery
        ? `http://127.0.0.1:5000/admin/all-books?search=${encodeURIComponent(searchQuery)}`
        : "http://127.0.0.1:5000/admin/all-books";

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `Total books from API: ${data.books.length}, Search query: "${searchQuery}"`,
        );
        // Show only first 50 books if no search query, otherwise show all search results
        const booksToShow =
          searchQuery && searchQuery.trim()
            ? data.books
            : data.books.slice(0, 50);
        console.log(`Displaying ${booksToShow.length} books`);
        setAllBooks(booksToShow);
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to load books");
      }
    } catch (error) {
      console.error("Error fetching all books:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleBookSearch = (e) => {
    e.preventDefault();
    fetchAllBooks(bookSearch);
  };

  const fetchAnalytics = async () => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:5000/admin/analytics", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsBooks(data.popular_books || []);
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to load analytics");
        setAnalyticsBooks([]);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError("Failed to connect to server");
      setAnalyticsBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const getDemandLevel = (totalIssued, totalCopies) => {
    if (!totalCopies) return "Low";
    const ratio = totalIssued / totalCopies;
    if (ratio > 1.5) return "High";
    if (ratio > 0.7) return "Medium";
    return "Low";
  };

  const getDemandColor = (demand) => {
    switch (demand) {
      case "High":
        return "#e53935"; // bright red for high demand
      case "Medium":
        return "#f39c12";
      case "Low":
        return "#27ae60";
      default:
        return "#333";
    }
  };

  const fetchIssuedBooks = async () => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:5000/admin/issued-books", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIssuedBooks(data.issued_books || []);
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to load issued books");
        setIssuedBooks([]);
      }
    } catch (err) {
      console.error("Error fetching issued books:", err);
      setError("Failed to connect to server");
      setIssuedBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:5000/admin/students", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to load students");
        setStudents([]);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to connect to server");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:5000/admin/books", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBook),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(`${data.message}. Book ID: ${data.book_id}`);
        setNewBook({
          book_name: "",
          publisher: "",
          description: "",
          cover_url: "",
          total_copies: 1,
        });
        fetchAllBooks();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setError(data.message || "Failed to add book");
      }
    } catch (err) {
      console.error("Error adding book:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBook = async (bookId, bookName) => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    showConfirm(
      "Delete Book",
      `Delete \"${bookName}\" permanently? This will remove its copies and history for this title.`,
      async () => {
        try {
          const response = await fetch(
            `http://127.0.0.1:5000/admin/books/${bookId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          const data = await response.json();
          if (response.ok) {
            setSuccessMsg(data.message || "Book deleted successfully");
            fetchAllBooks(bookSearch);
            setTimeout(() => setSuccessMsg(""), 3000);
          } else if (isUnauthorized(response)) {
            return;
          } else {
            showAlert("Delete Failed", data.message || "Failed to delete book");
          }
        } catch (error) {
          console.error("Error deleting book:", error);
          showAlert(
            "Connection Error",
            "Failed to delete book. Please try again.",
          );
        }
      },
    );
  };

  const fetchAvailableBooks = async (searchQuery = "") => {
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const url = searchQuery
        ? `http://127.0.0.1:5000/admin/available-books?search=${encodeURIComponent(searchQuery)}`
        : "http://127.0.0.1:5000/admin/available-books";

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableBooks(data.books || []);
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to load available books");
      }
    } catch (error) {
      console.error("Error fetching available books:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleDirectIssue = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      navigate("/");
      return;
    }

    if (!directIssueForm.moodle_id || !directIssueForm.book_id) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:5000/admin/direct-issue", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(directIssueForm),
      });

      const data = await response.json();
      if (response.ok) {
        setSuccessMsg(data.message);
        setDirectIssueForm({ moodle_id: "", book_id: "" });
        fetchAvailableBooks();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else if (isUnauthorized(response)) {
        return;
      } else {
        setError(data.message || "Failed to issue book");
      }
    } catch (error) {
      console.error("Error issuing book:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (requestId) => {
    const token = getToken();
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/admin/send-otp/${requestId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();
      if (response.ok) {
        if (data.dev_otp) {
          setOtpCache((prev) => ({ ...prev, [requestId]: data.dev_otp }));
        }

        // Open OTP modal for entering OTP
        setOtpModal({
          isOpen: true,
          requestId,
          value: data.dev_otp || "",
          isSubmitting: false,
          error: "",
        });

        // Show success message without interfering with modal
        const message =
          data.otp_delivery === "demo"
            ? `OTP sent successfully for presentation. Demo OTP: ${data.dev_otp}`
            : data.message || "OTP sent";

        setSuccessMsg(message);
        setTimeout(() => setSuccessMsg(""), 3000);
      } else if (isUnauthorized(response)) {
        return;
      } else {
        showAlert("Error", data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      showAlert(
        "Connection Error",
        "Failed to send OTP. Please check your connection and try again.",
      );
    }
  };

  const handleVerifyOtp = (requestId) => {
    setOtpModal({
      isOpen: true,
      requestId,
      value: otpCache[requestId] || "",
      isSubmitting: false,
      error: "",
    });
  };

  const handleCloseOtpModal = () => {
    setOtpModal({
      isOpen: false,
      requestId: null,
      value: "",
      isSubmitting: false,
      error: "",
    });
  };

  const handleSubmitOtpModal = async () => {
    const token = getToken();
    const requestId = otpModal.requestId;
    const enteredOtp = (otpModal.value || "").trim();

    if (!token) {
      navigate("/");
      return;
    }

    if (!enteredOtp) {
      setOtpModal((prev) => ({ ...prev, error: "Please enter OTP." }));
      return;
    }

    try {
      setOtpModal((prev) => ({ ...prev, isSubmitting: true, error: "" }));
      const response = await fetch(
        `http://127.0.0.1:5000/admin/verify-otp/${requestId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otp: enteredOtp }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        setOtpCache((prev) => {
          const updated = { ...prev };
          delete updated[requestId];
          return updated;
        });
        handleCloseOtpModal();
        setSuccessMsg(data.message || "OTP verified and book issued");
        fetchRequests();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else if (isUnauthorized(response)) {
        handleCloseOtpModal();
        return;
      } else {
        setOtpModal((prev) => ({
          ...prev,
          error: data.message || "Invalid OTP",
        }));
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setOtpModal((prev) => ({
        ...prev,
        error: "Failed to verify OTP. Please try again.",
      }));
    } finally {
      setOtpModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleAutoVerifyOtp = async (requestId) => {
    const demoOtp = otpCache[requestId];
    if (!demoOtp) {
      showAlert("OTP Missing", "Send OTP first before auto-verify.");
      return;
    }

    const token = getToken();
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/admin/verify-otp/${requestId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otp: demoOtp }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        setOtpCache((prev) => {
          const updated = { ...prev };
          delete updated[requestId];
          return updated;
        });
        setSuccessMsg(data.message || "OTP verified and book issued");
        fetchRequests();
        setTimeout(() => setSuccessMsg(""), 3000);
      } else if (isUnauthorized(response)) {
        return;
      } else {
        showAlert("Auto Verify Failed", data.message || "Could not verify OTP");
      }
    } catch (error) {
      console.error("Error auto verifying OTP:", error);
      showAlert(
        "Connection Error",
        "Failed to auto verify OTP. Please try again.",
      );
    }
  };

  const handleReject = async (requestId) => {
    const token = getToken();
    showConfirm(
      "Reject Book Request",
      "Are you sure you want to reject this book issue request? This action cannot be undone.",
      async () => {
        try {
          const response = await fetch(
            `http://127.0.0.1:5000/admin/reject/${requestId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          const data = await response.json();
          if (response.ok) {
            setSuccessMsg(data.message || "Request rejected successfully");
            fetchRequests();
            setTimeout(() => setSuccessMsg(""), 3000);
          } else if (isUnauthorized(response)) {
            return;
          } else {
            showAlert("Error", data.message || "Failed to reject request");
          }
        } catch (error) {
          console.error("Error rejecting request:", error);
          showAlert(
            "Connection Error",
            "Failed to reject request. Please check your connection and try again.",
          );
        }
      },
    );
  };

  const handleSearchUser = async (e) => {
    e.preventDefault();
    const token = getToken();

    if (!searchMoodleId) {
      showAlert(
        "Input Required",
        "Please enter a Moodle ID to search for student books.",
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/admin/user/${searchMoodleId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setUserBooks(data.books || []);
        if (data.books.length === 0) {
          setError("No books issued to this user");
        }
      } else if (isUnauthorized(response)) {
        return;
      } else {
        const data = await response.json();
        setError(data.message || "Failed to fetch user books");
        setUserBooks([]);
      }
    } catch (error) {
      console.error("Error fetching user books:", error);
      setError("Failed to connect to server");
      setUserBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReissue = async (transactionId) => {
    const token = getToken();
    showConfirm(
      "Reissue Book",
      "Extend the due date by 7 days? The new due date will be automatically calculated.",
      async () => {
        try {
          const response = await fetch(
            `http://127.0.0.1:5000/admin/reissue/${transactionId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          const data = await response.json();
          if (response.ok) {
            setSuccessMsg(data.message || "Book reissued successfully!");
            if (searchMoodleId) {
              handleSearchUser({ preventDefault: () => {} });
            }
            setTimeout(() => setSuccessMsg(""), 3000);
          } else if (isUnauthorized(response)) {
            return;
          } else {
            showAlert("Error", data.message || "Failed to reissue book");
          }
        } catch (error) {
          console.error("Error reissuing book:", error);
          showAlert(
            "Connection Error",
            "Failed to reissue book. Please check your connection and try again.",
          );
        }
      },
    );
  };

  const handleReturn = async (transactionId) => {
    const token = getToken();
    showConfirm(
      "Return Book",
      "Mark this book as returned? This will make the copy available for other students to borrow.",
      async () => {
        try {
          const response = await fetch(
            `http://127.0.0.1:5000/admin/return/${transactionId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          const data = await response.json();
          if (response.ok) {
            setSuccessMsg(data.message || "Book returned successfully!");
            if (searchMoodleId) {
              handleSearchUser({ preventDefault: () => {} });
            }
            setTimeout(() => setSuccessMsg(""), 3000);
          } else if (isUnauthorized(response)) {
            return;
          } else {
            showAlert("Error", data.message || "Failed to return book");
          }
        } catch (error) {
          console.error("Error returning book:", error);
          showAlert(
            "Connection Error",
            "Failed to return book. Please check your connection and try again.",
          );
        }
      },
    );
  };

  useEffect(() => {
    if (activeTab === "allBooks") {
      fetchAllBooks();
    } else if (activeTab === "requests") {
      fetchRequests();
    } else if (activeTab === "issuedBooks") {
      fetchIssuedBooks();
    } else if (activeTab === "students") {
      fetchStudents();
    } else if (activeTab === "analytics") {
      fetchAnalytics();
    } else if (activeTab === "availableBooks") {
      fetchAvailableBooks();
    }
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const filteredStudents = students.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(student.moodle_id).includes(query) ||
      (student.fullname || "").toLowerCase().includes(query) ||
      (student.department || "").toLowerCase().includes(query) ||
      (student.email || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="admin-page-wrapper">
      <Navbar onLogout={handleLogout} />

      {/* Custom Modal */}
      {modal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "30px",
              minWidth: "400px",
              maxWidth: "500px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              animation: "modalFadeIn 0.2s ease-out",
            }}
          >
            {/* Modal content here (title, message, buttons, etc.) */}
            {modal.title && <h3>{modal.title}</h3>}
            {modal.message && <p>{modal.message}</p>}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              {modal.type === "confirm" && (
                <button
                  onClick={modal.onCancel}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "6px",
                    background: "#f4f4f4",
                    border: "1px solid #ccc",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              )}
              <button
                onClick={modal.onConfirm}
                style={{
                  padding: "10px 24px",
                  borderRadius: "6px",
                  background: "#63A088",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Modal - only one instance allowed */}
      {otpModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              padding: "40px",
              minWidth: "380px",
              maxWidth: "460px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
            }}
          >
            {/* Header Section */}
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "#1a1a1a",
                  margin: "0 0 8px 0",
                }}
              >
                Verify OTP
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#666",
                  margin: "0",
                  fontWeight: "500",
                }}
              >
                Enter the OTP sent to verify this request
              </p>
            </div>

            {/* OTP Input - Individual Digit Boxes */}
            <div
              className="otp-input-container"
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={otpModal.value[index] || ""}
                  onChange={(e) => {
                    const newValue = otpModal.value.split("");
                    newValue[index] = e.target.value.replace(/\D/g, ""); // Only allow digits
                    setOtpModal((prev) => ({
                      ...prev,
                      value: newValue.join(""),
                      error: "",
                    }));
                    // Auto-focus to next box
                    if (e.target.value && index < 5) {
                      const nextInput = document.querySelector(
                        `.otp-box-${index + 1}`,
                      );
                      if (nextInput) nextInput.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle backspace to move to previous box
                    if (
                      e.key === "Backspace" &&
                      !otpModal.value[index] &&
                      index > 0
                    ) {
                      const prevInput = document.querySelector(
                        `.otp-box-${index - 1}`,
                      );
                      if (prevInput) prevInput.focus();
                    }
                  }}
                  className={`otp-box-${index}`}
                  placeholder=""
                  style={{
                    width: "48px",
                    height: "48px",
                    fontSize: "20px",
                    fontWeight: "600",
                    border: "2px solid #D4C5A0",
                    borderRadius: "10px",
                    textAlign: "center",
                    backgroundColor: "#FEF9F0",
                    transition: "all 0.2s ease",
                    cursor: "text",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#63A088";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(99, 160, 136, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#D4C5A0";
                    e.target.style.boxShadow = "none";
                  }}
                />
              ))}
            </div>

            {/* Error Message */}
            {otpModal.error && (
              <div
                style={{
                  color: "#e74c3c",
                  marginBottom: "16px",
                  fontSize: "13px",
                  fontWeight: "500",
                  textAlign: "center",
                }}
              >
                ❌ {otpModal.error}
              </div>
            )}

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                marginTop: "28px",
              }}
            >
              <button
                onClick={handleCloseOtpModal}
                disabled={otpModal.isSubmitting}
                style={{
                  padding: "12px 32px",
                  border: "2px solid #ddd",
                  borderRadius: "12px",
                  background: "#f8f8f8",
                  color: "#666",
                  cursor: otpModal.isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  transition: "all 0.3s ease",
                  opacity: otpModal.isSubmitting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOtpModal}
                disabled={otpModal.isSubmitting}
                style={{
                  padding: "12px 32px",
                  border: "none",
                  borderRadius: "12px",
                  background: "#63A088",
                  color: "#fff",
                  cursor: otpModal.isSubmitting ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  transition: "all 0.3s ease",
                  opacity: otpModal.isSubmitting ? 0.8 : 1,
                  boxShadow: "0 2px 8px rgba(99, 160, 136, 0.3)",
                }}
              >
                {otpModal.isSubmitting ? "Verifying..." : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Removed old Admin Dashboard header as per new navbar design */}

      {successMsg && (
        <div
          style={{
            backgroundColor: "#4caf50",
            color: "white",
            padding: "15px",
            textAlign: "center",
            marginBottom: "10px",
          }}
        >
          {successMsg}
        </div>
      )}

      <div className="admin-container">
        {/* Sidebar Navigation */}
        <div className="admin-sidebar">
          <div className="sidebar-menu">
            <button
              className={
                activeTab === "allBooks" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("allBooks")}
            >
              <i className="fa-solid fa-book"></i> All Books
            </button>
            <button
              className={
                activeTab === "userBooks" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("userBooks")}
            >
              <i className="fa-solid fa-search"></i> View User Books
            </button>
            <button
              className={
                activeTab === "requests" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("requests")}
            >
              <i className="fa-solid fa-hourglass-half"></i> Pending Requests
            </button>
            <button
              className={
                activeTab === "issuedBooks" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("issuedBooks")}
            >
              <i className="fa-solid fa-book-open-reader"></i> All Issued Books
            </button>
            <button
              className={
                activeTab === "students" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("students")}
            >
              <i className="fa-solid fa-users"></i> Students Data
            </button>
            <button
              className={
                activeTab === "addBook" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("addBook")}
            >
              <i className="fa-solid fa-square-plus"></i> Add Book
            </button>
            <button
              className={
                activeTab === "directIssue" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("directIssue")}
            >
              <i className="fa-solid fa-handshake"></i> Direct Issue
            </button>
            <button
              className={
                activeTab === "availableBooks" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("availableBooks")}
            >
              <i className="fa-solid fa-book-bookmark"></i> Available Books
            </button>
            <button
              className={
                activeTab === "analytics" ? "menu-item active" : "menu-item"
              }
              onClick={() => setActiveTab("analytics")}
            >
              <i className="fa-solid fa-chart-bar"></i> Analytics
            </button>
            <button
              className="menu-item"
              onClick={() => navigate("/admin-history")}
            >
              <i className="fa-solid fa-clock-rotate-left"></i> History
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="admin-main-content">
          {/* All Books Tab */}
          {activeTab === "allBooks" && (
            <div className="table-content">
              <div
                style={{
                  marginBottom: "25px",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontWeight: "700",
                    color: "#2c2c2c",
                    marginBottom: "12px",
                    fontSize: "17px",
                  }}
                >
                  <i
                    className="fa-solid fa-search"
                    style={{ marginRight: "10px", color: "#63A088" }}
                  ></i>
                  Search Books
                </label>
                <form onSubmit={handleBookSearch}>
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "44px",
                      marginBottom: 0,
                      border: "2px solid #63A088",
                      borderRadius: "18px",
                      background: "#FFFBF2",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Type book name,publisher or keywords.."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "14px 18px",
                        fontSize: "16px",
                        border: "none",
                        borderTopLeftRadius: "16px",
                        borderBottomLeftRadius: "16px",
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        background: "#FFFBF2",
                        color: "#bfa76a",
                        outline: "none",
                        fontFamily:
                          "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif",
                        boxShadow: "none",
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 28px",
                        fontSize: "17px",
                        fontWeight: 700,
                        backgroundColor: "#63A088",
                        color: "#fff",
                        border: "none",
                        borderTopRightRadius: "16px",
                        borderBottomRightRadius: "16px",
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        cursor: "pointer",
                        boxShadow: "none",
                        height: "44px",
                        minWidth: "120px",
                        justifyContent: "center",

                        fontFamily:
                          "Cambria, Cochin, Georgia, Times, 'Times New Roman', serif",
                      }}
                    >
                      <i
                        className="fa-solid fa-search"
                        style={{ marginRight: 8, fontSize: "20px" }}
                      ></i>{" "}
                      Search
                    </button>
                  </div>
                </form>
              </div>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                  }}
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.2em",
                    color: "#666",
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading
                  books...
                </div>
              ) : allBooks.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.1em",
                    color: "#888",
                  }}
                >
                  <i className="fa-solid fa-inbox"></i>
                  <p>
                    {bookSearch
                      ? "No books found matching your search"
                      : "No books in library"}
                  </p>
                </div>
              ) : (
                <div className="table-card">
                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#e8f5e9",
                      borderRadius: "5px",
                      marginBottom: "15px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "1.1em", color: "#2e7d32" }}>
                        <i className="fa-solid fa-book"></i> Showing:{" "}
                        {allBooks.length} books
                      </strong>
                      {bookSearch && (
                        <span style={{ marginLeft: "15px", color: "#666" }}>
                          Search: "{bookSearch}"
                        </span>
                      )}
                      {!bookSearch && (
                        <span style={{ marginLeft: "15px", color: "#666" }}>
                          (First 50 books - use search to find more)
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="table-wrapper"
                    style={{ maxHeight: "600px", overflowY: "auto" }}
                  >
                    <table
                      className="data-table"
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: "#63A088",
                          zIndex: 10,
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              width: "80px",
                              padding: "15px 10px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              textAlign: "center",
                              borderBottom: "3px solid #4e806c",
                            }}
                          >
                            Book ID
                          </th>
                          <th
                            style={{
                              width: "35%",
                              padding: "15px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                            }}
                          >
                            Book Name & Description
                          </th>
                          <th
                            style={{
                              width: "15%",
                              padding: "15px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                            }}
                          >
                            Publisher
                          </th>
                          <th
                            style={{
                              width: "10%",
                              textAlign: "center",
                              padding: "15px 10px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                            }}
                          >
                            Total Copies
                          </th>
                          <th
                            style={{
                              width: "10%",
                              textAlign: "center",
                              padding: "15px 10px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                            }}
                          >
                            Available
                          </th>
                          <th
                            style={{
                              width: "10%",
                              textAlign: "center",
                              padding: "15px 10px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                            }}
                          >
                            Issued
                          </th>
                          <th
                            style={{
                              width: "10%",
                              textAlign: "center",
                              padding: "12px 10px",
                            }}
                          >
                            Status
                          </th>
                          <th
                            style={{
                              width: "12%",
                              textAlign: "center",
                              padding: "12px 10px",
                            }}
                          >
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allBooks.map((book, index) => (
                          <tr
                            key={book.book_id}
                            style={{
                              backgroundColor:
                                index % 2 === 0 ? "#ffffff" : "#f9f9f9",
                              borderBottom: "1px solid #e0e0e0",
                            }}
                          >
                            <td
                              style={{
                                textAlign: "center",
                                padding: "12px 10px",
                                fontSize: "14px",
                                color: "#555",
                              }}
                            >
                              {book.book_id}
                            </td>
                            <td
                              style={{
                                padding: "12px 15px",
                                maxWidth: "400px",
                              }}
                            >
                              <strong
                                style={{
                                  color: "#2c2c2c",
                                  fontSize: "15px",
                                  display: "block",
                                  marginBottom: "4px",
                                }}
                              >
                                {book.book_name}
                              </strong>
                              {book.description && (
                                <div
                                  style={{
                                    fontSize: "13px",
                                    color: "#666",
                                    lineHeight: "1.4",
                                  }}
                                >
                                  {book.description.substring(0, 80)}
                                  {book.description.length > 80 ? "..." : ""}
                                </div>
                              )}
                            </td>
                            <td
                              style={{
                                fontSize: "14px",
                                color: "#555",
                                padding: "12px 15px",
                              }}
                            >
                              {book.publisher || "N/A"}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                fontWeight: "bold",
                                fontSize: "16px",
                                color: "#333",
                                padding: "12px 10px",
                              }}
                            >
                              {book.total_copies}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                color: "#2e7d32",
                                fontWeight: "bold",
                                fontSize: "16px",
                                padding: "12px 10px",
                              }}
                            >
                              {book.available_copies}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                color: "#f57c00",
                                fontWeight: "bold",
                                fontSize: "16px",
                                padding: "12px 10px",
                              }}
                            >
                              {book.issued_copies}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                padding: "12px 10px",
                              }}
                            >
                              {book.available_copies > 0 ? (
                                <span
                                  style={{
                                    backgroundColor: "#4caf50",
                                    color: "white",
                                    padding: "6px 14px",
                                    borderRadius: "15px",
                                    fontSize: "13px",
                                    fontWeight: "bold",
                                    display: "inline-block",
                                  }}
                                >
                                  Available
                                </span>
                              ) : (
                                <span
                                  style={{
                                    backgroundColor: "#f44336",
                                    color: "white",
                                    padding: "6px 14px",
                                    borderRadius: "15px",
                                    fontSize: "13px",
                                    fontWeight: "bold",
                                    display: "inline-block",
                                  }}
                                >
                                  All Issued
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                textAlign: "center",
                                padding: "12px 10px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteBook(book.book_id, book.book_name)
                                }
                                style={{
                                  backgroundColor: "#d32f2f",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "7px 12px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                }}
                                title="Delete this book"
                              >
                                <i className="fa-solid fa-trash"></i> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Requests Tab */}
          {activeTab === "requests" && (
            <div className="table-content">
              <h3 className="section-title">Pending Book Issue Requests</h3>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.2em",
                    color: "#666",
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading
                  requests...
                </div>
              ) : requests.length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    backgroundColor: "#e8f5e9",
                    borderRadius: "8px",
                    border: "1px solid #4caf50",
                  }}
                >
                  <i
                    className="fa-solid fa-check-circle"
                    style={{
                      fontSize: "3em",
                      color: "#4caf50",
                      marginBottom: "15px",
                    }}
                  ></i>
                  <h4 style={{ color: "#2e7d32", marginBottom: "10px" }}>
                    No Pending Requests
                  </h4>
                  <p style={{ color: "#555" }}>
                    All book requests have been processed. New requests from
                    students will appear here.
                  </p>
                </div>
              ) : (
                <div className="table-card">
                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#fff3cd",
                      borderRadius: "5px",
                      marginBottom: "15px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "1.1em", color: "#856404" }}>
                        <i className="fa-solid fa-clock"></i> {requests.length}{" "}
                        Pending Request{requests.length > 1 ? "s" : ""}
                      </strong>
                      <span style={{ marginLeft: "15px", color: "#666" }}>
                        Students waiting to collect books
                      </span>
                    </div>
                  </div>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Student ID</th>
                          <th>Book Name</th>
                          <th>Request Date</th>
                          <th style={{ textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req) => (
                          <tr key={req.request_id}>
                            <td style={{ textAlign: "center" }}>
                              {req.request_id}
                            </td>
                            <td>
                              <strong>{req.moodle_id}</strong>
                            </td>
                            <td>{req.book_name}</td>
                            <td>
                              {new Date(req.request_date).toLocaleString()}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {/* Removed empty blue button */}
                              <div className="action-btn-group">
                                <button
                                  className="action-btn send-otp-btn"
                                  onClick={() => handleSendOtp(req.request_id)}
                                  title="Send OTP to student email"
                                >
                                  <i className="fa-solid fa-paper-plane"></i>{" "}
                                  Send OTP
                                </button>
                                <button
                                  className="action-btn reject-btn"
                                  onClick={() => handleReject(req.request_id)}
                                  title="Reject request"
                                >
                                  <i className="fa-solid fa-times"></i> Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Issued Books Tab */}
          {activeTab === "issuedBooks" && (
            <div className="table-content">
              <h3 className="section-title">All Issued Books</h3>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.2em",
                    color: "#666",
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading issued
                  books...
                </div>
              ) : issuedBooks.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.1em",
                    color: "#888",
                  }}
                >
                  <i className="fa-solid fa-inbox"></i>
                  <p>No currently issued books.</p>
                </div>
              ) : (
                <div className="table-card">
                  <div
                    className="table-wrapper"
                    style={{ maxHeight: "600px", overflowY: "auto" }}
                  >
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Transaction ID</th>
                          <th>Moodle ID</th>
                          <th>Student Name</th>
                          <th>Book ID</th>
                          <th>Book Name</th>
                          <th>Issue Date</th>
                          <th>Due Date</th>
                          <th>Days Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuedBooks.map((book) => (
                          <tr key={book.transaction_id}>
                            <td>{book.transaction_id}</td>
                            <td>{book.moodle_id}</td>
                            <td>{book.fullname}</td>
                            <td>{book.book_id}</td>
                            <td>{book.book_name}</td>
                            <td>
                              {new Date(book.issue_date).toLocaleDateString()}
                            </td>
                            <td>
                              {new Date(book.due_date).toLocaleDateString()}
                            </td>
                            <td>
                              <span
                                style={{
                                  color:
                                    book.days_remaining < 0
                                      ? "red"
                                      : book.days_remaining < 3
                                        ? "orange"
                                        : "green",
                                  fontWeight: "bold",
                                }}
                              >
                                {book.days_remaining < 0
                                  ? `Overdue by ${Math.abs(book.days_remaining)} days`
                                  : `${book.days_remaining} days`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Students Data Tab */}
          {activeTab === "students" && (
            <div className="table-content">
              <h3 className="section-title">All Students Data</h3>

              <div style={{ marginBottom: "15px" }}>
                <input
                  type="text"
                  placeholder="Search by moodle id, name, department or email"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.2em",
                    color: "#666",
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading
                  students...
                </div>
              ) : (
                <div className="table-card">
                  <div
                    className="table-wrapper"
                    style={{ maxHeight: "600px", overflowY: "auto" }}
                  >
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Moodle ID</th>
                          <th>Full Name</th>
                          <th>Department</th>
                          <th>Email</th>
                          <th>Issued Books</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.moodle_id}>
                            <td>{student.moodle_id}</td>
                            <td>{student.fullname}</td>
                            <td>{student.department || "N/A"}</td>
                            <td>{student.email || "N/A"}</td>
                            <td>{student.issued_books}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Book Tab */}
          {activeTab === "addBook" && (
            <div className="form-content">
              <h3 className="section-title">Add New Book</h3>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-card">
                <form onSubmit={handleAddBook}>
                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-book"></i> Book Name
                    </label>
                    <input
                      type="text"
                      value={newBook.book_name}
                      onChange={(e) =>
                        setNewBook({ ...newBook, book_name: e.target.value })
                      }
                      placeholder="Enter book name"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-building"></i> Publisher
                    </label>
                    <input
                      type="text"
                      value={newBook.publisher}
                      onChange={(e) =>
                        setNewBook({ ...newBook, publisher: e.target.value })
                      }
                      placeholder="Enter publisher name"
                    />
                  </div>

                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-align-left"></i> Description
                    </label>
                    <textarea
                      rows="4"
                      value={newBook.description}
                      onChange={(e) =>
                        setNewBook({ ...newBook, description: e.target.value })
                      }
                      placeholder="Enter book description"
                    ></textarea>
                  </div>

                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-image"></i> Book Image URL
                    </label>
                    <input
                      type="url"
                      value={newBook.cover_url}
                      onChange={(e) =>
                        setNewBook({ ...newBook, cover_url: e.target.value })
                      }
                      placeholder="https://example.com/book-cover.jpg"
                    />
                  </div>

                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-layer-group"></i> Number of
                      Copies
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newBook.total_copies}
                      onChange={(e) =>
                        setNewBook({ ...newBook, total_copies: e.target.value })
                      }
                      required
                    />
                  </div>

                  <button
                    className="submit-btn"
                    type="submit"
                    disabled={loading}
                  >
                    <i className="fa-solid fa-square-plus"></i>{" "}
                    {loading ? "Adding..." : "Add Book"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="table-content">
              <h3 className="section-title">Popular Books Analytics</h3>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.2em",
                    color: "#666",
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading
                  analytics...
                </div>
              ) : analyticsBooks.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.1em",
                    color: "#888",
                  }}
                >
                  <i className="fa-solid fa-inbox"></i>
                  <p>No analytics data available</p>
                </div>
              ) : (
                <div className="table-card">
                  <div
                    style={{
                      backgroundColor: "#e8f5e9",
                      borderRadius: "5px",
                      marginBottom: "15px",
                      padding: "12px 15px",
                      fontSize: "0.95em",
                      color: "#2e7d32",
                      fontWeight: 500,
                    }}
                  >
                    <i className="fa-solid fa-chart-bar"></i> Showing top{" "}
                    {Math.min(20, analyticsBooks.length)} popular books
                    (High/Medium highlighted)
                  </div>
                  <div
                    className="table-wrapper"
                    style={{ maxHeight: "700px", overflowY: "auto" }}
                  >
                    <table
                      className="data-table"
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: "#63A088",
                          zIndex: 10,
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              padding: "15px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                              textAlign: "left",
                            }}
                          >
                            Book Name
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                              textAlign: "center",
                              width: "150px",
                            }}
                          >
                            Total Issued
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                              textAlign: "center",
                              width: "150px",
                            }}
                          >
                            Total Copies
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              color: "#fff",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderBottom: "3px solid #4e806c",
                              textAlign: "center",
                              width: "120px",
                            }}
                          >
                            Demand Level
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsBooks.slice(0, 20).map((book) => {
                          const demandLevel = getDemandLevel(
                            book.total_issued,
                            book.total_copies,
                          );
                          return (
                            <tr
                              key={book.book_id}
                              style={{
                                backgroundColor:
                                  analyticsBooks.indexOf(book) % 2 === 0
                                    ? "#f9f9f9"
                                    : "#fff",
                                borderBottom: "1px solid #f0f0f0",
                              }}
                            >
                              <td
                                style={{
                                  padding: "15px",
                                  color: "#333",
                                  fontSize: "15px",
                                }}
                              >
                                <i
                                  className="fa-solid fa-book"
                                  style={{
                                    marginRight: "10px",
                                    color: "#63A088",
                                  }}
                                ></i>
                                {book.book_name}
                              </td>
                              <td
                                style={{
                                  padding: "15px",
                                  color: "#333",
                                  fontSize: "15px",
                                  textAlign: "center",
                                  fontWeight: "600",
                                }}
                              >
                                {book.total_issued}
                              </td>
                              <td
                                style={{
                                  padding: "15px",
                                  color: "#333",
                                  fontSize: "15px",
                                  textAlign: "center",
                                  fontWeight: "600",
                                }}
                              >
                                {book.total_copies}
                              </td>
                              <td
                                style={{
                                  padding: "15px",
                                  fontSize: "14px",
                                  textAlign: "center",
                                  color: getDemandColor(demandLevel),
                                  fontWeight: "600",
                                }}
                              >
                                {demandLevel}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View User Books Tab */}
          {activeTab === "userBooks" && (
            <div className="form-content">
              <h3 className="section-title">View Student's Issued Books</h3>

              <div className="form-card">
                <form onSubmit={handleSearchUser}>
                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-user-graduate"></i> Student
                      Moodle ID
                    </label>
                    <input
                      type="number"
                      placeholder="Enter Moodle ID"
                      value={searchMoodleId}
                      onChange={(e) => setSearchMoodleId(e.target.value)}
                      required
                    />
                  </div>

                  <button className="submit-btn" type="submit">
                    <i className="fa-solid fa-search"></i> Search
                  </button>
                </form>
              </div>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginTop: "20px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              {loading && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "30px",
                    fontSize: "1.2em",
                    color: "#666",
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading...
                </div>
              )}

              {!loading && userBooks.length > 0 && (
                <div className="table-card" style={{ marginTop: "30px" }}>
                  <h4 style={{ marginBottom: "15px", color: "#63A088" }}>
                    <i className="fa-solid fa-book-open"></i> Books Issued to
                    Moodle ID: {searchMoodleId}
                  </h4>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Transaction ID</th>
                          <th>Book Name</th>
                          <th>Issue Date</th>
                          <th>Due Date</th>
                          <th>Days Remaining</th>
                          <th style={{ textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userBooks.map((book) => (
                          <tr key={book.transaction_id}>
                            <td>{book.transaction_id}</td>
                            <td>{book.book_name}</td>
                            <td>
                              {new Date(book.issue_date).toLocaleDateString()}
                            </td>
                            <td>
                              {new Date(book.due_date).toLocaleDateString()}
                            </td>
                            <td>
                              <span
                                style={{
                                  color:
                                    book.days_remaining < 0
                                      ? "red"
                                      : book.days_remaining < 3
                                        ? "orange"
                                        : "green",
                                  fontWeight: "bold",
                                }}
                              >
                                {book.days_remaining < 0
                                  ? `Overdue by ${Math.abs(book.days_remaining)} days`
                                  : `${book.days_remaining} days`}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <button
                                  className="action-btn"
                                  style={{
                                    backgroundColor: "transparent",
                                    color: "#63A088",
                                    padding: "8px 16px",
                                    border: "2px solid #63A088",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                  }}
                                  onClick={() =>
                                    handleReissue(book.transaction_id)
                                  }
                                  title="Extend due date by 7 days"
                                >
                                  <i className="fa-solid fa-clock"></i> Reissue
                                </button>
                                <button
                                  className="action-btn"
                                  style={{
                                    backgroundColor: "#63A088",
                                    color: "white",
                                    padding: "8px 16px",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                  }}
                                  onClick={() =>
                                    handleReturn(book.transaction_id)
                                  }
                                  title="Mark book as returned"
                                >
                                  <i className="fa-solid fa-check-circle"></i>{" "}
                                  Return
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Direct Issue Tab */}
          {activeTab === "directIssue" && (
            <div className="form-content">
              <h3 className="section-title">Direct Issue Book to Student</h3>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                    borderRadius: "5px",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-card">
                <form onSubmit={handleDirectIssue}>
                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-user-graduate"></i> Student
                      Moodle ID
                    </label>
                    <input
                      type="number"
                      placeholder="Enter student Moodle ID"
                      value={directIssueForm.moodle_id}
                      onChange={(e) =>
                        setDirectIssueForm({
                          ...directIssueForm,
                          moodle_id: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label>
                      <i className="fa-solid fa-book"></i> Book ID
                    </label>
                    <input
                      type="number"
                      placeholder="Enter book ID"
                      value={directIssueForm.book_id}
                      onChange={(e) =>
                        setDirectIssueForm({
                          ...directIssueForm,
                          book_id: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <button
                    className="submit-btn"
                    type="submit"
                    disabled={loading}
                    style={{
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    <i className="fa-solid fa-handshake"></i>{" "}
                    {loading ? "Processing..." : "Issue Book"}
                  </button>
                </form>
              </div>

              <div style={{ marginTop: "30px" }}>
                <h4 style={{ color: "#63A088", marginBottom: "15px" }}>
                  <i className="fa-solid fa-info-circle"></i> Instructions
                </h4>
                <div
                  style={{
                    backgroundColor: "#f0f7f5",
                    padding: "15px",
                    borderRadius: "8px",
                    border: "2px solid #c8e6c9",
                  }}
                >
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "20px",
                      lineHeight: "1.8",
                      color: "#555",
                    }}
                  >
                    <li>Enter the student's Moodle ID</li>
                    <li>Enter the Book ID from the "All Books" tab</li>
                    <li>The system will check availability and issue the book</li>
                    <li>Student can have maximum {MAX_BOOKS_ALLOWED} books</li>
                    <li>Books are issued for {MAX_DAYS_ALLOWED} days</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Available Books Tab */}
          {activeTab === "availableBooks" && (
            <div className="table-content">
              <h3 className="section-title">Available Books for Issue</h3>

              <div style={{ marginBottom: "25px" }}>
                <label
                  style={{
                    display: "block",
                    fontWeight: "700",
                    color: "#2c2c2c",
                    marginBottom: "12px",
                    fontSize: "17px",
                  }}
                >
                  <i
                    className="fa-solid fa-search"
                    style={{ marginRight: "10px", color: "#63A088" }}
                  ></i>
                  Search Available Books
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchAvailableBooks(bookSearch);
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: "44px",
                      marginBottom: 0,
                      border: "2px solid #63A088",
                      borderRadius: "18px",
                      background: "#FFFBF2",
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search book name, publisher..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "14px 18px",
                        fontSize: "16px",
                        border: "none",
                        borderTopLeftRadius: "16px",
                        borderBottomLeftRadius: "16px",
                        background: "#FFFBF2",
                        color: "#bfa76a",
                        outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "0 28px",
                        fontSize: "17px",
                        fontWeight: 700,
                        backgroundColor: "#63A088",
                        color: "#fff",
                        border: "none",
                        borderTopRightRadius: "16px",
                        borderBottomRightRadius: "16px",
                        cursor: "pointer",
                        minWidth: "120px",
                        justifyContent: "center",
                      }}
                    >
                      <i
                        className="fa-solid fa-search"
                        style={{ marginRight: 8, fontSize: "20px" }}
                      ></i>{" "}
                      Search
                    </button>
                  </div>
                </form>
              </div>

              {error && (
                <div
                  style={{
                    color: "red",
                    marginBottom: "15px",
                    padding: "10px",
                    backgroundColor: "#ffebee",
                  }}
                >
                  {error}
                </div>
              )}

              {loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.2em",
                    color: "#666",
                  }}
                >
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading
                  available books...
                </div>
              ) : availableBooks.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    fontSize: "1.1em",
                    color: "#888",
                  }}
                >
                  <i className="fa-solid fa-inbox"></i>
                  <p>
                    {bookSearch
                      ? "No available books found matching your search"
                      : "Click search to view available books"}
                  </p>
                </div>
              ) : (
                <div className="table-card">
                  <div
                    style={{
                      padding: "15px",
                      backgroundColor: "#e8f5e9",
                      borderRadius: "5px",
                      marginBottom: "15px",
                    }}
                  >
                    <strong style={{ fontSize: "1.1em", color: "#2e7d32" }}>
                      <i className="fa-solid fa-check-circle"></i> Available:{" "}
                      {availableBooks.length} books
                    </strong>
                  </div>
                  <div
                    className="table-wrapper"
                    style={{ maxHeight: "600px", overflowY: "auto" }}
                  >
                    <table
                      className="data-table"
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          backgroundColor: "#63A088",
                          zIndex: 10,
                        }}
                      >
                        <tr>
                          <th style={{ padding: "15px", color: "#fff" }}>
                            Book ID
                          </th>
                          <th style={{ padding: "15px", color: "#fff" }}>
                            Book Name
                          </th>
                          <th style={{ padding: "15px", color: "#fff" }}>
                            Publisher
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              color: "#fff",
                              textAlign: "center",
                            }}
                          >
                            Available
                          </th>
                          <th
                            style={{
                              padding: "15px",
                              color: "#fff",
                              textAlign: "center",
                            }}
                          >
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableBooks.map((book, index) => (
                          <tr
                            key={book.book_id}
                            style={{
                              backgroundColor:
                                index % 2 === 0 ? "#ffffff" : "#f9f9f9",
                              borderBottom: "1px solid #e0e0e0",
                            }}
                          >
                            <td style={{ padding: "12px 15px" }}>
                              {book.book_id}
                            </td>
                            <td style={{ padding: "12px 15px" }}>
                              <strong>{book.book_name}</strong>
                            </td>
                            <td style={{ padding: "12px 15px" }}>
                              {book.publisher || "N/A"}
                            </td>
                            <td
                              style={{
                                padding: "12px 15px",
                                textAlign: "center",
                                color: "#2e7d32",
                                fontWeight: "bold",
                              }}
                            >
                              {book.available_copies}
                            </td>
                            <td
                              style={{
                                padding: "12px 15px",
                                textAlign: "center",
                                fontWeight: "bold",
                              }}
                            >
                              {book.total_copies}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default Admin;
