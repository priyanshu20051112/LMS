/**
 * AI Chat Component
 * -----------------
 * A floating AI assistant chat widget for book recommendations.
 * Matches the library management system theme.
 */

import React, { useState, useRef, useEffect } from "react";
import "./AIChat.css";

const AIChat = ({ onBookSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      text: "Hi! I'm here to help you find the perfect books. What subject or topic are you interested in?\n\nHere are some popular topics from our library:\n\n1. Artificial Intelligence & Machine Learning\n2. Web Development (HTML, CSS, JavaScript, React)\n3. Data Structures & Algorithms\n4. Python Programming\n5. Database Management & SQL\n6. Cyber Security\n7. Object Oriented Programming\n8. Computer Networks\n\nJust type the topic you're interested in, or pick one from above!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get auth token from localStorage
  const getToken = () => {
    const user = localStorage.getItem("user");
    if (!user) return null;
    try {
      const userData = JSON.parse(user);
      return userData?.token || null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  };

  const handleUnauthorized = () => {
    localStorage.removeItem("user");
    setMessages((prev) => [
      ...prev,
      { type: "bot", text: "Your session has expired. Please log in again." },
    ]);
    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message to chat
    setMessages((prev) => [...prev, { type: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const token = getToken();
      if (!token) {
        setMessages((prev) => [
          ...prev,
          { type: "bot", text: "Please log in to use the AI assistant." },
        ]);
        setIsLoading(false);
        return;
      }

      const response = await fetch("http://127.0.0.1:5000/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add AI response
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: data.answer,
            books: data.books || [],
            needsClarification: data.needs_clarification,
          },
        ]);
      } else {
        if (response.status === 401 || response.status === 403) {
          handleUnauthorized();
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            text: data.message || "Sorry, something went wrong. Please try again.",
          },
        ]);
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "Unable to connect to the AI assistant. Please check your connection.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear conversation
  const clearChat = async () => {
    const token = getToken();
    if (token) {
      try {
        const response = await fetch("http://127.0.0.1:5000/ai/clear", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 401 || response.status === 403) {
          handleUnauthorized();
          return;
        }
      } catch (error) {
        console.error("Error clearing chat:", error);
      }
    }

    setMessages([
      {
        type: "bot",
        text: "Hi! I'm here to help you find the perfect books. What subject or topic are you interested in?\n\nHere are some popular topics from our library:\n\n1. Artificial Intelligence & Machine Learning\n2. Web Development (HTML, CSS, JavaScript, React)\n3. Data Structures & Algorithms\n4. Python Programming\n5. Database Management & SQL\n6. Cyber Security\n7. Object Oriented Programming\n8. Computer Networks\n\nJust type the topic you're interested in, or pick one from above!",
      },
    ]);
  };
  // Handle book click - open book detail popup
  const handleBookClick = (book) => {
    if (onBookSelect) {
      // Transform AI book structure to match Home.jsx book structure
      onBookSelect({
        id: book.book_id,
        title: book.title,
        publisher: book.publisher,
        description: book.description,
        status: book.available_copies > 0 ? "Available" : "Issued",
        available_copies: book.available_copies,
        total_copies: book.total_copies || book.available_copies,
        image: "/assets/demo.png"
      });
      // Optionally minimize chat when book is selected
      // setIsOpen(false);
    }
  };
  return (
    <div className="ai-chat-container">
      {/* Floating Toggle Button */}
      <button
        className={`ai-chat-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Book Assistant"
      >
        {isOpen ? (
          <i className="fa-solid fa-xmark"></i>
        ) : (
          <i className="fa-solid fa-robot"></i>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-chat-title">
              <i className="fa-solid fa-robot"></i>
              <span>Library AI Assistant</span>
            </div>
            <button className="ai-chat-clear" onClick={clearChat} title="Clear chat">
              <i className="fa-solid fa-trash-can"></i>
            </button>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`ai-chat-message ${msg.type}`}>
                {msg.type === "bot" && (
                  <div className="ai-avatar">
                    <i className="fa-solid fa-robot"></i>
                  </div>
                )}
                <div className="ai-message-content">
                  <div className="ai-message-text">
                    {msg.text.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < msg.text.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>

                  {/* Show book cards if available */}
                  {msg.books && msg.books.length > 0 && (
                    <div className="ai-book-list">
                      {msg.books.slice(0, 5).map((book, idx) => (
                        <div 
                          key={idx} 
                          className="ai-book-card"
                          onClick={() => handleBookClick(book)}
                          style={{ cursor: "pointer" }}
                          title="Click to view details and request this book"
                        >
                          <div className="ai-book-title">{book.title}</div>
                          <div className="ai-book-publisher">
                            {book.publisher}
                          </div>
                          <div className="ai-book-availability">
                            <i className="fa-solid fa-book"></i>
                            {book.available_copies} available
                          </div>
                          <div className="ai-book-action">
                            <i className="fa-solid fa-arrow-right"></i> View Details
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="ai-chat-message bot">
                <div className="ai-avatar">
                  <i className="fa-solid fa-robot"></i>
                </div>
                <div className="ai-message-content">
                  <div className="ai-typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-input-container">
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask about books..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="ai-chat-send"
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
