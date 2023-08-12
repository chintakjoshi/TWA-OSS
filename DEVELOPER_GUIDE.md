# Developer's Guide

## Introduction
Welcome to the Developer Guide for Project TWA. This guide will help you understand how to effectively use the application, including installation, configuration, and utilization of its main features.

## Getting Started
System Requirements
Front-end (react.js)
Back-end (node.js) and 
MySQL Workbench

## Running Frontend

```cd client\src```
Then ```npm install --force``` to install the dependencies.
After installing the dependencies run ```npm start```.
This will run the front end.

## Running Backend

Go to the ```root directory``` and do ```npm install --force```. Once the dependencies are installed Run ```node server.js```.

## Setting up MySql workbench

Create a new local instance keeping the user and password ```root```. The local instance should run on the localhost:3306.

Create a new schema, Keep the schema name ```nodejs_login1```. Then, Create tables in the schema ```users``` and ```applies```. In which you should keep the query ```SELECT * FROM nodejs_login1.users``` and ```SELECT * FROM nodejs_login1.applies```.

In this way, you should be able to fetch the details from the POST request which is coming from the backend.

# Deploying the Application on Docker

To Deploy the application on docker, you need to install docker and docker-compose in your system. In the mean time, go to the files ```server.js```, ```models/User.js```, ```models/ApplyModel.js```, ```client/package.json```. Uncomment the docker configuration code and vice-versa. 

Once the docker gets installed, go to the root directory and run the command ```docker-compose up --build```. This will start creating the containers for frontend, backend and database. Once the Image is generated the cliend, backend and database will automatically start at ```localhost:3000```. By this way, you can start the whole web application with a single click.

To stop docker, RUN: ```docker-compose stop``` OR If you want to delete the containers RUN: ```docker-compose down```.

## **Project 2 - Developer guide for Back-end**
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
