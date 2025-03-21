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

Default Email and Password: ```admin@example.com``` and ```mypassword123```

In this way, you should be able to fetch the details from the POST request which is coming from the backend.

# Deploying the Application on Docker

To Deploy the application on docker, you need to install docker and docker-compose in your system. In the mean time, go to the files ```server.js```, ```models/User.js```, ```models/ApplyModel.js```, ```client/package.json```. Uncomment the docker configuration code and vice-versa. 

Once the docker gets installed, go to the root directory and run the command ```docker-compose up --build```. This will start creating the containers for frontend, backend and database. Once the Image is generated the cliend, backend and database will automatically start at ```localhost:3000```. By this way, you can start the whole web application with a single click.

To stop docker, RUN: ```docker-compose stop``` OR If you want to delete the containers RUN: ```docker-compose down```.