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
Then ```npm install``` to install the dependencies.
After installing the dependencies run ```npm start```.
This will run the front end.

## Running Backend

Go to the ```root directory``` and do ```npm install```. Once the dependencies are installed Run ```node serve.js```.

## Setting up MySql workbench

Create a new local instance keeping the user and password ```root```. The local instance should run on the localhost:3306.

Create a new schema, Keep the schema name ```nodejs_login1```. Then, Create tables in the schema ```users``` and ```applies```. In which you should keep the query ```SELECT * FROM nodejs_login1.users``` and ```SELECT * FROM nodejs_login1.applies```.

In this way, you should be able to fetch the details from the POST request which is coming from the backend.
