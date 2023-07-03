# TWA-Project

This project aims to assist individuals whose resumes are being rejected due to their criminal records by matching them with jobs where their crimes do not reflect negatively.

### Functional Requirements

1. Job Details:
   - Industry
   - Location
   - Accessibility
   - Contact Information
   - Positions Available
   - Salary
   - Benefits
   - Shifts Available
   - Offense Exemptions
   - Notes

2. Job Seekers:
   - Jobseeker First Name
   - Jobseeker Last Name
   - Jobseeker Phone Number
   - Jobseeker Email

### Business Requirements

The Transformative Workforce Academy aims to provide job opportunities to individuals with criminal records who are seeking to make a positive change in their lives. It creates opportunities for them by giving second chances and helping them find their dream jobs.

To achieve this, it is necessary to maintain records of job seekers and employer details.

### Licensing

According to me an Open-Source Project, the MIT License is one of the most permissive and popular open-source licenses. It lets people do almost anything they want with your project, like making and distributing copies, or making changes and improvements, as long as they provide attribution back to you and don’t hold you liable for any issues.

Here's why the MIT License could be a good choice:

Permissiveness: The MIT License is a permissive license. This means it allows users to do whatever they want with the software (such as use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software), provided that the original copyright notice and the permission notice are included in all copies or substantial portions of the software.

Simplicity and Permissiveness: The MIT License is brief and straightforward, making it easy for other developers to understand. It allows your work to be used in almost any context, which includes commercial and proprietary uses.

Popularity: The MIT License is widely used in the open-source community. This makes it familiar and trusted, which can encourage more use and contributions.

Compatibility: The MIT License is compatible with many other licenses, including the GNU General Public License (GPL), which means that your code can be combined with code under those licenses without legal issues.

No Warranty: The license explicitly states that the software is provided "as is," without any warranty of any kind.

No Liability: The license includes a disclaimer stating that the authors or copyright holders will not be liable for any damages arising from the software.

# Developer's Guide

### Introduction
Welcome to the Developer Guide for Project TWA. This guide will help you understand how to effectively use the application, including installation, configuration, and utilization of its main features.

### Getting Started
System Requirements
Front-end (react.js, css)
Back-end (node.js)


### Product Overview
![image](https://github.com/NavyaNelluri/Project-TWA/assets/123142678/bbf27237-df59-4606-81bd-5c7d836caf96)

The initial approach to this project involves the following steps:

1. Job seekers and employers will be asked to fill out Google Forms.
2. The information will be extracted in .CSV format and loaded into the database.
3. A framework will be created to access the database data, which includes:
   - Connection to the database
   - Loading data
   - Retrieving data
   - Mapping job seekers to appropriate job positions
4. The mapped data will be available on the front end, either by sorting based on employer details or job positions.

### How to Use the application

***How to Run Frontend*** 

```cd client\src```
Then ```npm install``` to install the dependencies.
After installing the dependencies run ```npm start```.
This will start the frontend.

***How to setup MySql workbench***
Create new a local instance keeping the user and password "root". The local instance should run on the localhost:3306.

Create a new schema, Keep the schema name "nodejs_login1". Then, Create tables in the schema "users" and "applies". In which you should keep the query "SELECT * FROM nodejs_login1.users" and "SELECT * FROM nodejs_login1.applies".

By this way, you should be able to fetch the details from the POST request which is coming from the backend.

### API Reference
POST /register: Used for user registration. It expects the following data in the request body: first_name, last_name, email, and password. It checks if the user already exists and then hashes the password before creating a new user in the database.

POST /login: Used for user login. It expects the user's email and password in the request body. It verifies the user's credentials, and if valid, generates a JWT token that is sent as the response.

GET /profile: Used to retrieve the user's profile. It expects a valid JWT token in the Authorization header. It verifies the token, retrieves the user's profile based on the decoded token, and returns the user's data.

### Contributing
Chintak Joshi - Frontend (react.js)