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

### Initial Approach for the Project

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