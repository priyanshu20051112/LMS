# 📚 LibraryFlow — Library Management System

A full-stack **Library Management System** built with **Flask, React, and MySQL**, featuring **JWT-based authentication**, **role-based access (Admin & User)**, and **Agentic AI-powered book recommendations**.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![AI](https://img.shields.io/badge/AI-Agentic-green)

---

## Table of Contents

- Features  
- Tech Stack  
- Project Structure  
- Prerequisites  
- Installation & Setup  
- Running the Application  
- Authentication & Roles  
- API Endpoints  
- Database Schema  
- Frontend Pages  
- Open Source Contribution  
- License  

---

## Features

- JWT-based authentication system  
- Separate Admin and User login  
- Role-based access control  
- Book management (Add, Update, Delete)  
- Borrow and return system  
- Agentic AI-based book recommendation  
- Secure backend using environment variables  

---

## Tech Stack

Frontend: React.js, Vite  
Backend: Flask (Python), Flask-JWT-Extended  
Database: MySQL  
Authentication: JWT  
AI: Agentic AI  

---

## Project Structure

LibraryFlow/

backend/  
  app/  
    routes/  
      auth.py  
      users.py  
      books.py  
      transactions.py  
      recommendations.py  
    db/  
      connection.py  
    config.py  
  run.py  

frontend/  
  src/  
    pages/  
    components/  
    App.jsx  

.env.example  
README.md  

---

## Prerequisites

- Node.js (v18+)  
- Python (3.10+)  
- MySQL  
- pip  

---

## Installation & Setup

### Clone the repository

git clone https://github.com/priyanshu20051112/LMS.git 
<br>
cd LMS  

---

### Setup Database

mysql -u root -p  
CREATE DATABASE library_db;  

---

### Backend Setup

cd backend  
pip install -r requirements.txt  

Create a `.env` file:

API_KEY = 'your_ai_api_key'
<br>
DB_HOST=localhost  
DB_USER=root  
DB_PASSWORD=your_password  
DB_NAME=library_db  
JWT_SECRET_KEY=your_secret_key  

---

### Frontend Setup

cd frontend  
npm install  

---

## Running the Application

### Backend

cd backend  
python run.py  

Runs on: http://127.0.0.1:5000  

---

### Frontend

cd frontend  
npm run dev  

Runs on: http://localhost:5173  

---

## Authentication & Roles

JWT Authentication:
- Login returns a token  
- Token required for protected routes  

Roles:

Admin:
- Full access  
- Manage books and users  

User:
- Browse books  
- Borrow/return books  
- Get AI recommendations  

---

## API Endpoints

Auth:

POST /auth/login → Login user  
POST /auth/register → Register user  

Books:

GET /books/ → Get all books  
POST /books/ → Add book (Admin)  
PUT /books/{id} → Update book  
DELETE /books/{id} → Delete book  

Transactions:

POST /borrow/ → Borrow book  
POST /return/ → Return book  

Recommendations:

GET /recommendations/ → AI suggestions  

---

## Database Schema

users: id, name, email, password, role  
books: id, title, author, availability  
transactions: id, user_id, book_id, issue_date, return_date  

---

## Frontend Pages

- Login / Register  
- User Dashboard  
- Admin Dashboard  
- Book Listing  
- Book Management  
- Borrow / Return  
- AI Recommendation Page  

---

## Open Source Contribution

This project is open-source and contributions are welcome.

Steps:
1. Fork the repository  
2. Create a new branch (feature/your-feature)  
3. Commit your changes  
4. Push to your branch  
5. Open a Pull Request  

---

## License

This project is open-source and available for educational purposes.
