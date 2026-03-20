# Book Request and Issue Workflow

## Overview
The system now uses a two-step process for book issuance:
1. **Student submits a request** from their dashboard
2. **Admin approves and issues** the book when student comes to collect

## Database
A new table `issue_requests` has been created to track pending requests:
- `request_id`: Unique identifier for each request
- `moodle_id`: Student's ID
- `book_id`: Book being requested
- `request_date`: When the request was made
- `status`: pending/approved/rejected

## Student Workflow

### Requesting a Book
1. Student browses books in their dashboard
2. Clicks on a book to see details
3. Clicks "Request Book" button
4. Confirms the request
5. Receives message: "Request submitted successfully! Collect from library when admin approves."
6. Request appears in admin's "Pending Requests" tab

### Limitations
- Students can only have 2 books issued at a time
- Cannot request a book they already have issued
- Cannot have multiple pending requests for the same book
- Can only request books that have copies available

## Admin Workflow

### Viewing Pending Requests
1. Admin logs in with credentials:
   - Moodle ID: 28106191
   - Password: 28106191@APSHAH
2. Navigates to "Pending Requests" tab
3. Sees list of all pending requests with:
   - Request ID
   - Student ID
   - Book Name
   - Request Date

### Issuing Books
1. When student comes to library to collect book:
2. Admin clicks "Issue Book" button next to their request
3. System:
   - Assigns an available copy to the student
   - Creates a transaction record
   - Sets issue date (today) and due date (7 days from today)
   - Marks request as 'approved'
4. Student receives the physical book

### Rejecting Requests
1. If book is not available or request is invalid:
2. Admin clicks "Reject" button
3. Request is marked as 'rejected'
4. Student can submit a new request if needed

## API Endpoints

### Student Endpoints
- `POST /request-book`: Submit a new book request
  - Body: `{ "book_id": <book_id> }`
  - Response: Success message or error

### Admin Endpoints
- `GET /admin/requests`: Get all pending requests
- `POST /admin/approve/<request_id>`: Approve request and issue book
- `POST /admin/reject/<request_id>`: Reject a request

## Benefits of This System
1. **Better Control**: Admin can verify student identity before issuing
2. **Physical Verification**: Books are only issued when student is present
3. **Request Tracking**: Complete audit trail of all requests
4. **Prevents Abuse**: Students can't "issue" books without collecting them
5. **Real-world Library Process**: Matches how physical libraries work
