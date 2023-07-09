## **Developer guide for Back-end**
# Introduction:
<br>The data of Job seekers and Job details should be loaded to the database.</br>
Developing a framework which can seemlessly transfer the raw file data to database.</br>
Data comes in .csv format and can be collected through google forms.</br>
Develop a matching algorithm according to the criminal records and offense excemptions.</br>
<br> **Below is the flow in snowflake:</br>**

![image](https://github.com/chintakjoshi/TWA-OSS/assets/123142678/ec2435f7-2009-4dfb-9540-cd58cc0cccb0)


# **1. File specification for Job Seeker:**

![image](https://github.com/chintakjoshi/TWA-OSS/assets/123142678/bcba09e0-c29e-4fde-9279-5bd1dea1f928)


# **2. File specification for Job details:**

![image](https://github.com/chintakjoshi/TWA-OSS/assets/123142678/09a51b38-dad4-4767-9989-e0c5cae78ab2)

# **3. DDL and DML statements :**

Attaching DDL Statements:
[DDL.txt](https://github.com/chintakjoshi/TWA-OSS/files/11961194/DDL.txt)


Attaching DML Statements:

[DML.txt](https://github.com/chintakjoshi/TWA-OSS/files/11961201/DML.txt)

CREATE DATABASE TWA;
CREATE SCHEMA SCHEMA_TWA;

CREATE TABLE TWA.SCHEMA_TWA.JobDetails(recruiter_Name varchar,
Industry_Name varchar,
Industry_Locations varchar,
Contact_Information varchar,
Job_positions varchar,
Pay_Rate varchar,
Benefits varchar,
Shifts_Available varchar,
Offense_Exemptions varchar,
Note varchar);


CREATE TABLE TWA.SCHEMA_TWA.JobSeeker(FIRST_NAME varchar,
LAST_NAME varchar,
PHONE varchar,
EMAIL varchar);

# **4. Connecting Snowflake and Python:**

We are using snowflake-connector package to connect to snowflake databas.

# **5. Creating Google forms**
We created google forms to get data from users

# **6. Extract data file from google forms**
Export the data from Google form as .csv file

# **7. Designing framework to load these data files to snowflake.**
DML statements to load .csv file to snowflake

# **8. In framework, we used tkinter for front end applet desigining.**

# **9. Reference links and Citation:****

https://docs.snowflake.com/en/developer-guide/python-connector/python-connector

"Python Connector for Snowflake: Enabling Data Engineering and Data Science with Snowflake" by Jonathan Goldschmidt

Those two references helped us as a point of initial approach for our development.

https://docs.snowflake.com/en/developer-guide/python-connector/python-connector1




