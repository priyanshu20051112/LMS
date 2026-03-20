-- Create issue_requests table for pending book requests
CREATE TABLE IF NOT EXISTS issue_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    moodle_id INT NOT NULL,
    book_id INT NOT NULL,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (moodle_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);
