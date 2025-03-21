USE nodejs_login1;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    JobID VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    Email VARCHAR(255),
    Phone VARCHAR(20),
    Gender VARCHAR(100),
    Date DATE,
    referrer VARCHAR(100),
    job_type VARCHAR(100)
);