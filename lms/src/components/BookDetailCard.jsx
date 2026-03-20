import React from "react";

const BookDetailCard = ({ book, onClose, onIssue, onRate }) => {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedRating, setSelectedRating] = React.useState(0);
  const [isRatingLoading, setIsRatingLoading] = React.useState(false);
  const [ratingMsg, setRatingMsg] = React.useState("");

  if (!book) return null;

  const currentRating = Number(book.rating) || 0;

  React.useEffect(() => {
    setSelectedRating(0);
    setRatingMsg("");
  }, [book.id]);

  const handleIssueBook = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.token) {
        setError("Please login again");
        return;
      }

      const response = await fetch("http://127.0.0.1:5000/request-book", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ book_id: book.id })
      });

      const data = await response.json();

      if (response.ok) {
        onIssue(book, data.message || "Request submitted successfully! Collect from library when admin approves.");
        setShowConfirm(false);
      } else {
        setError(data.message || "Failed to submit request");
      }
    } catch (err) {
      setError("Failed to connect to server");
      console.error("Request book error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (selectedRating < 1 || selectedRating > 5) {
      setRatingMsg("Select a star rating between 1 and 5.");
      return;
    }

    setIsRatingLoading(true);
    setRatingMsg("");

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.token) {
        setRatingMsg("Please login again");
        return;
      }

      const response = await fetch("http://127.0.0.1:5000/rate-book", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${user.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ book_id: book.id, rating: selectedRating })
      });

      const data = await response.json();
      if (response.ok) {
        setRatingMsg(`Thanks! Rating saved: ${selectedRating} star(s)`);
        if (onRate) {
          onRate(book.id, data.average_rating);
        }
      } else {
        setRatingMsg(data.message || "Failed to save rating");
      }
    } catch (err) {
      setRatingMsg("Failed to connect to server");
      console.error("Rate book error:", err);
    } finally {
      setIsRatingLoading(false);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-card" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="detail-content">
          <div className="detail-left">
            <img src={book.image} alt={book.title} className="detail-image" />
          </div>
          <div className="detail-right">
            <h2 className="detail-title">{book.title}</h2>
            <p className="detail-author">Publisher: {book.publisher || "Unknown"}</p>
            <p style={{ margin: "0.4rem 0", color: "#555" }}>
              Average Rating: {currentRating.toFixed(1)}
            </p>
            <div style={{ marginBottom: "0.8rem", color: "#f4b400", fontSize: "1rem" }}>
              {Array.from({ length: 5 }, (_, index) => (
                <i
                  key={`avg-${index}`}
                  className={index < Math.round(currentRating) ? "fa-solid fa-star" : "fa-regular fa-star"}
                  style={{ marginRight: 3 }}
                ></i>
              ))}
            </div>
            <p className="detail-status">
              Status:{" "}
              <span className={`book-status ${book.status.toLowerCase()}`}>
                {book.status} ({book.available_copies}/{book.total_copies} available)
              </span>
            </p>
            <div style={{ marginTop: "0.7rem", marginBottom: "0.9rem" }}>
              <p style={{ marginBottom: "0.4rem", color: "#444", fontWeight: 600 }}>Rate this book</p>
              <div style={{ color: "#f4b400", fontSize: "1.1rem", marginBottom: "0.4rem" }}>
                {Array.from({ length: 5 }, (_, index) => {
                  const star = index + 1;
                  return (
                    <i
                      key={`rate-${star}`}
                      className={star <= selectedRating ? "fa-solid fa-star" : "fa-regular fa-star"}
                      style={{ marginRight: 6, cursor: "pointer" }}
                      onClick={() => setSelectedRating(star)}
                    ></i>
                  );
                })}
              </div>
              <button
                className="confirm-button"
                onClick={handleSubmitRating}
                disabled={isRatingLoading}
                style={{ marginBottom: "0.4rem" }}
              >
                {isRatingLoading ? "Saving Rating..." : "Submit Rating"}
              </button>
              {ratingMsg && (
                <div style={{ fontSize: "0.9em", color: ratingMsg.includes("saved") ? "green" : "#c0392b" }}>
                  {ratingMsg}
                </div>
              )}
            </div>
            <div className="detail-desc">
              {book.description || "No description available."}
            </div>
            {error && (
              <div style={{ color: "red", marginTop: "10px", fontSize: "0.9em" }}>
                {error}
              </div>
            )}
            <div className="detail-actions">
              {!showConfirm ? (
                <button
                  className="issue-button"
                  onClick={() => setShowConfirm(true)}
                  disabled={book.available_copies === 0}
                >
                  {book.available_copies === 0 ? "Not Available" : "Request Book"}
                </button>
              ) : (
                <div className="confirm-card">
                  <p>Request this book? You can collect it from the library once approved by admin.</p>
                  <button
                    className="confirm-button"
                    onClick={handleIssueBook}
                    disabled={isLoading}
                  >
                    {isLoading ? "Submitting..." : "Confirm Request"}
                  </button>
                  <button
                    className="cancel-button"
                    onClick={() => {
                      setShowConfirm(false);
                      setError("");
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailCard;
