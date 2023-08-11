## Functional Requirements

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
   
## Product Overview

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

## API Reference
POST /register: Used for user registration. It expects the following data in the request body: first_name, last_name, email, and password. It checks if the user already exists and then hashes the password before creating a new user in the database.
Checks if the provided email already exists in the database.
Hashes the provided password for security.
Creates a new user record in the database with the provided data.

POST /login: Used for user login. It expects the user's email and password in the request body. It verifies the user's credentials, and if valid, generates a JWT token that is sent as the response.
Verifies the provided email against the database records.
Compares the provided password with the hashed password stored in the database.
If the credentials are valid, generates a JSON Web Token (JWT) as a response.

GET /profile: Used to retrieve the user's profile. It expects a valid JWT token in the Authorization header. It verifies the token, retrieves the user's profile based on the decoded token, and returns the user's data.