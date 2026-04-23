import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import "./Home.css";
import BookDetailCard from "./components/BookDetailCard";
import AIChat from "./components/AIChat";
import Wishlist from "./components/Wishlist";
import "./components/Wishlist.css";

const DEFAULT_COVER = "/assets/demo.png";

const decodeJwtPayload = (token) => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
};

const renderStars = (rating) => {
  const normalized = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span style={{ color: "#f4b400", fontSize: "0.9rem" }}>
      {Array.from({ length: 5 }, (_, index) => (
        <i
          key={index}
          className={
            index < normalized ? "fa-solid fa-star" : "fa-regular fa-star"
          }
          style={{ marginRight: 2 }}
        ></i>
      ))}
    </span>
  );
};

const Home = () => {
  const [selectedBook, setSelectedBook] = useState(null);
  const [username, setUsername] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSubFilter, setShowSubFilter] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState({
    type: null,
    value: null,
  });
  const [books, setBooks] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [requestedBooks, setRequestedBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [authorSearch, setAuthorSearch] = useState("");
  const [publisherSearch, setPublisherSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userToken, setUserToken] = useState("");
  const navigate = useNavigate();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [showWishlist, setShowWishlist] = useState(false);
  const [wishlistedBooks, setWishlistedBooks] = useState([]);

  // Server-side search for books
  useEffect(() => {
    if (!userToken) return;

    const searchBooks = async () => {
      if (searchQuery.trim() === "") {
        // If search is empty, reset to original books
        return;
      }

      setSearchLoading(true);
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/dashboard?search=${encodeURIComponent(searchQuery)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${userToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          const transformedBooks = data.books.map((book) => ({
            id: book.book_id,
            title: book.book_name,
            publisher: book.publisher,
            description: book.description,
            rating: Number(book.rating) || 0,
            status: book.available_copies > 0 ? "Available" : "Issued",
            available_copies: book.available_copies,
            total_copies: book.total_copies,
            image: book.cover_url || DEFAULT_COVER,
          }));
          setFilteredBooks(transformedBooks);
        }
      } catch (error) {
        console.error("Error searching books:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchBooks, 500);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, userToken]);

  // Fetch books from backend API
  useEffect(() => {
    const fetchDashboardData = async () => {
      const forceLogout = () => {
        localStorage.removeItem("user");
        navigate("/", { replace: true });
      };

      const user = localStorage.getItem("user");
      if (!user) {
        forceLogout();
        return;
      }

      let userData;
      try {
        userData = JSON.parse(user);
      } catch (error) {
        forceLogout();
        return;
      }

      if (!userData?.token) {
        forceLogout();
        return;
      }

      if (isTokenExpired(userData.token)) {
        forceLogout();
        return;
      }

      setUsername(userData.moodle_id);
      setUserToken(userData.token);

      try {
        const response = await fetch("http://127.0.0.1:5000/dashboard", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userData.token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Transform backend data to frontend format
          const transformedBooks = data.books.map((book) => ({
            id: book.book_id,
            title: book.book_name,
            publisher: book.publisher,
            description: book.description,
            rating: Number(book.rating) || 0,
            status: book.available_copies > 0 ? "Available" : "Issued",
            available_copies: book.available_copies,
            total_copies: book.total_copies,
            image: book.cover_url || DEFAULT_COVER,
          }));
          setBooks(transformedBooks);
          setFilteredBooks(transformedBooks);
          setIssuedBooks(data.issued_books || []);
          setRequestedBooks(data.requested_books || []);

          // Fetch wishlist after dashboard data
          try {
            const wishlistResponse = await fetch(
              "http://127.0.0.1:5000/wishlist",
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${userData.token}`,
                  "Content-Type": "application/json",
                },
              },
            );
            if (wishlistResponse.ok) {
              const wishlistData = await wishlistResponse.json();
              setWishlistedBooks(
                wishlistData.wishlist.map((item) => item.book_id) || [],
              );
            }
          } catch (err) {
            console.error("Error fetching wishlist:", err);
          }
        } else if (response.status === 401 || response.status === 403) {
          forceLogout();
        } else {
          const data = await response.json().catch(() => ({}));
          setNotificationMsg(data.message || "Failed to load dashboard data");
          setShowNotification(true);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setNotificationMsg("Failed to load dashboard data");
        setShowNotification(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest(".filter-wrapper")) {
        setShowFilterDropdown(false);
        setShowSubFilter(null);
      }
      if (showUserDropdown && !event.target.closest(".user-menu-wrapper")) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterDropdown, showUserDropdown]);

  useEffect(() => {
    let filtered = books;
    if (selectedFilter.type && selectedFilter.value) {
      if (selectedFilter.type === "availability") {
        filtered = filtered.filter(
          (book) => book.status === selectedFilter.value,
        );
      } else if (selectedFilter.type === "publisher") {
        filtered = filtered.filter(
          (book) => book.publisher === selectedFilter.value,
        );
      }
    }

    // Only apply local sorting if not searching
    if (searchQuery.trim() === "") {
      // Keep books with real cover URLs on top in normal browse mode.
      filtered = [...filtered].sort((a, b) => {
        const aHasRealCover = a.image && a.image !== DEFAULT_COVER;
        const bHasRealCover = b.image && b.image !== DEFAULT_COVER;
        if (aHasRealCover === bHasRealCover) return 0;
        return aHasRealCover ? -1 : 1;
      });
      setFilteredBooks(filtered);
    }
  }, [selectedFilter, books, searchQuery]);

  const uniqueStatuses = [...new Set(books.map((book) => book.status))];
  const uniquePublishers = [
    ...new Set(books.map((book) => book.publisher).filter(Boolean)),
  ];

  const handleFilterClick = () => {
    setShowFilterDropdown(!showFilterDropdown);
    setShowSubFilter(null);
  };

  const handleFilterTypeClick = (type) => {
    setShowSubFilter(showSubFilter === type ? null : type);
  };

  const handleFilterSelect = (type, value) => {
    setSelectedFilter({ type, value });
  };

  const handleUserMenuClick = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const handleMenuOptionClick = (option) => {
    if (option === "profile") {
      navigate("/profile");
    } else if (option === "history") {
      navigate("/history");
    }
    setShowUserDropdown(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleIssueBook = (book, message) => {
    setSelectedBook(null);
    setShowNotification(true);
    setNotificationMsg(message || `Book "${book.title}" issued successfully!`);
    // Refresh the dashboard data
    window.location.reload();
  };

  const handleBookRated = (bookId, averageRating) => {
    const updatedRating = Number(averageRating) || 0;
    setBooks((prevBooks) =>
      prevBooks.map((book) =>
        book.id === bookId ? { ...book, rating: updatedRating } : book,
      ),
    );
    setSelectedBook((prev) =>
      prev && prev.id === bookId ? { ...prev, rating: updatedRating } : prev,
    );
  };

  const handleAddToWishlist = async (bookId) => {
    const book = filteredBooks.find((b) => b.id === bookId);

    // Only allow wishlist for unavailable books
    if (book && book.available_copies > 0) {
      setShowNotification(true);
      setNotificationMsg("Add to wishlist when book becomes unavailable");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/add-to-wishlist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ book_id: bookId }),
      });

      const data = await response.json();

      if (response.ok) {
        setWishlistedBooks([...wishlistedBooks, bookId]);
        setShowNotification(true);
        setNotificationMsg("Added to wishlist! 💚");
      } else if (response.status === 409) {
        setShowNotification(true);
        setNotificationMsg("Already in your wishlist");
      } else {
        setShowNotification(true);
        setNotificationMsg(data.message || "Failed to add to wishlist");
      }
    } catch (err) {
      console.error("Add to wishlist error:", err);
      setShowNotification(true);
      setNotificationMsg("Failed to add to wishlist");
    }
  };

  const handleRemoveFromWishlist = async (bookId) => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/remove-from-wishlist",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ book_id: bookId }),
        },
      );

      if (response.ok) {
        setWishlistedBooks(wishlistedBooks.filter((id) => id !== bookId));
        setShowNotification(true);
        setNotificationMsg("Removed from wishlist");
      }
    } catch (err) {
      console.error("Remove from wishlist error:", err);
      setShowNotification(true);
      setNotificationMsg("Failed to remove from wishlist");
    }
  };

  return (
    <div>
      <nav className="home-nav">
        <img
          className="logo-image"
          src="/assets/apsit.png"
          alt="Library Logo"
          onClick={() => navigate("/home")}
          style={{ cursor: "pointer" }}
        />
        <h1
          style={{ cursor: "pointer", display: "inline-block", marginLeft: 10 }}
          onClick={() => navigate("/home")}
        >
          PCT's A. P. Shah Institute of Technology
        </h1>
        <div className="user-section">
          <button
            className="wishlist-nav-button"
            onClick={() => setShowWishlist(true)}
            title="View Wishlist"
          >
            <i className="fa-solid fa-heart"></i>
            {wishlistedBooks.length > 0 && (
              <span className="wishlist-badge">{wishlistedBooks.length}</span>
            )}
          </button>
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
                <div
                  className="user-dropdown-option"
                  onClick={() => handleMenuOptionClick("history")}
                >
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

      <div className="search-filter-container">
        <div className="search-bar-wrapper">
          <input
            type="text"
            className="search-bar"
            placeholder="Search for books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchLoading && searchQuery.trim() !== "" && (
            <div
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <i
                className="fa-solid fa-spinner"
                style={{ animation: "spin 1s linear infinite" }}
              ></i>
            </div>
          )}
        </div>
        <div className="filter-wrapper">
          <button className="filter-button" onClick={handleFilterClick}>
            <img src="/assets/filter-icon.png" alt="Filter" />
          </button>
          {showFilterDropdown && (
            <div className="filter-dropdown">
              <div className="filter-header">Filter By:</div>
              <div className="filter-options">
                <div
                  className="filter-option"
                  onClick={() => handleFilterTypeClick("availability")}
                >
                  Availability
                  {showSubFilter === "availability" && (
                    <div className="sub-filter-options">
                      {uniqueStatuses.map((status, index) => (
                        <div
                          key={index}
                          className={`sub-filter-option ${
                            selectedFilter.type === "availability" &&
                            selectedFilter.value === status
                              ? "selected"
                              : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFilterSelect("availability", status);
                          }}
                        >
                          {status}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className="filter-option"
                  onClick={() => handleFilterTypeClick("publisher")}
                >
                  Publisher
                  {showSubFilter === "publisher" &&
                    uniquePublishers.length > 0 && (
                      <div className="sub-filter-options">
                        <input
                          type="text"
                          className="sub-filter-search"
                          placeholder="Search publisher..."
                          value={publisherSearch}
                          onChange={(e) => setPublisherSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          style={{
                            width: "90%",
                            margin: "0.5rem",
                            padding: "0.3rem",
                            borderRadius: "4px",
                            border: "1px solid #ccc",
                          }}
                        />
                        {uniquePublishers
                          .filter((publisher) =>
                            publisher
                              .toLowerCase()
                              .includes(publisherSearch.toLowerCase()),
                          )
                          .map((publisher, index) => (
                            <div
                              key={index}
                              className={`sub-filter-option ${
                                selectedFilter.type === "publisher" &&
                                selectedFilter.value === publisher
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFilterSelect("publisher", publisher);
                              }}
                            >
                              {publisher}
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Issued Books Section */}
      <h2 style={{ marginLeft: "15rem", marginTop: "2rem" }}>Issued Books</h2>
      <div className="book-grid">
        {loading ? (
          <div style={{ marginLeft: "2rem", color: "#d4b06f" }}>
            Loading books...
          </div>
        ) : issuedBooks.length === 0 ? (
          <div style={{ marginLeft: "2rem", color: "#d4b06f" }}>
            No books issued
          </div>
        ) : (
          issuedBooks.map((book, index) => (
            <div className="book-card" key={index}>
              <img
                src={book.cover_url || DEFAULT_COVER}
                alt={book.book_name}
                className="book-image"
              />
              <h4>{book.book_name}</h4>
              <p style={{ fontSize: "0.9em", color: "#888" }}>
                Due: {new Date(book.due_date).toLocaleDateString()}
              </p>
              <span className="book-status issued">Issued</span>
            </div>
          ))
        )}
      </div>

      {/* Requested Books Section */}
      <h2 style={{ marginLeft: "15rem", marginTop: "2rem" }}>
        Requested Books
      </h2>
      <div className="book-grid">
        {loading ? (
          <div style={{ marginLeft: "2rem", color: "#d4b06f" }}>
            Loading books...
          </div>
        ) : requestedBooks.length === 0 ? (
          <div style={{ marginLeft: "2rem", color: "#d4b06f" }}>
            No requested books
          </div>
        ) : (
          requestedBooks.map((book) => (
            <div className="book-card" key={book.request_id}>
              <img
                src={book.cover_url || DEFAULT_COVER}
                alt={book.book_name}
                className="book-image"
              />
              <h4>{book.book_name}</h4>
              <p style={{ fontSize: "0.9em", color: "#888" }}>
                {book.publisher}
              </p>
              <p style={{ fontSize: "0.85em", color: "#666" }}>
                Requested: {new Date(book.request_date).toLocaleDateString()}
              </p>
              <span
                className="book-status issued"
                style={{ textTransform: "capitalize" }}
              >
                {book.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* All Books Section */}
      <h2 style={{ marginLeft: "15rem", marginTop: "2rem" }}>All Books</h2>
      <div className="book-grid">
        {loading ? (
          <div style={{ marginLeft: "2rem", color: "#d4b06f" }}>
            Loading books...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div style={{ marginLeft: "2rem", color: "#d4b06f" }}>
            No books found
          </div>
        ) : (
          filteredBooks.map((book) => (
            <div className="book-card" key={book.id}>
              <div className="book-card-image-container">
                <img
                  src={book.image}
                  alt={book.title}
                  className="book-image"
                  onClick={() => setSelectedBook(book)}
                  style={{ cursor: "pointer" }}
                />
                <button
                  className={`book-wishlist-btn ${wishlistedBooks.includes(book.id) ? "wishlisted" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (wishlistedBooks.includes(book.id)) {
                      handleRemoveFromWishlist(book.id);
                    } else {
                      handleAddToWishlist(book.id);
                    }
                  }}
                  disabled={
                    book.available_copies > 0 &&
                    !wishlistedBooks.includes(book.id)
                  }
                  title={
                    wishlistedBooks.includes(book.id)
                      ? "Remove from wishlist"
                      : book.available_copies > 0
                        ? "Add to wishlist when unavailable"
                        : "Add to wishlist"
                  }
                >
                  <i
                    className={`fa-${wishlistedBooks.includes(book.id) ? "solid" : "regular"} fa-heart`}
                  ></i>
                </button>
              </div>
              <h4
                onClick={() => setSelectedBook(book)}
                style={{ cursor: "pointer" }}
              >
                {book.title}
              </h4>
              <p style={{ fontSize: "0.9em", color: "#888" }}>
                {book.publisher}
              </p>
              <p style={{ margin: "0.3rem 0", color: "#666" }}>
                {renderStars(book.rating)}
                <span style={{ marginLeft: 6, fontSize: "0.85rem" }}>
                  {Number(book.rating || 0).toFixed(1)}
                </span>
              </p>
              <span
                className={`book-status ${book.status.toLowerCase()}`}
                onClick={() => setSelectedBook(book)}
                style={{ cursor: "pointer" }}
              >
                {book.status} ({book.available_copies}/{book.total_copies})
              </span>
            </div>
          ))
        )}
      </div>

      {selectedBook && (
        <BookDetailCard
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onIssue={(book) => handleIssueBook(book)}
          onRate={handleBookRated}
        />
      )}
      {showNotification && (
        <div className="notification">
          {notificationMsg}
          <button
            className="notification-close"
            onClick={() => setShowNotification(false)}
          >
            ×
          </button>
        </div>
      )}

      {showWishlist && (
        <Wishlist
          onClose={() => setShowWishlist(false)}
          userToken={userToken}
        />
      )}

      {/* AI Chat Assistant */}
      <AIChat onBookSelect={(book) => setSelectedBook(book)} />
    </div>
  );
};

export default Home;
