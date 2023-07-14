const express = require('express')
const users = express.Router()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs');
const Apply = require('../models/ApplyModel');

const User = require('../models/User')
users.use(cors())

process.env.SECRET_KEY = 'secret'

users.post('/register', (req, res) => {
  const today = new Date()
  const userData = {
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    email: req.body.email,
    password: req.body.password,
    created: today
  }

  User.findOne({
    where: {
      email: req.body.email
    }
  })
    //TODO bcrypt
    .then(user => {
      if (!user) {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          userData.password = hash
          User.create(userData)
            .then(user => {
              res.json({ status: user.email + 'Registered!' })
            })
            .catch(err => {
              res.send('error: ' + err)
            })
        })
      } else {
        res.json({ error: 'User already exists' })
      }
    })
    .catch(err => {
      res.send('error: ' + err)
    })
})

users.post('/login', (req, res) => {
  User.findOne({
    where: {
      email: req.body.email
    }
  })
    .then(user => {
      if (user) {
        if (bcrypt.compareSync(req.body.password, user.password)) {
          let token = jwt.sign(user.dataValues, process.env.SECRET_KEY, {
            expiresIn: 1440
          })
          res.send(token)
        }
      } else {
        res.status(400).json({ error: 'User does not exist' })
      }
    })
    .catch(err => {
      res.status(400).json({ error: err })
    })
})

users.get('/profile', (req, res) => {
  var decoded = jwt.verify(req.headers['authorization'], process.env.SECRET_KEY)

  User.findOne({
    where: {
      id: decoded.id
    }
  })
    .then(user => {
      if (user) {
        res.json(user)
      } else {
        res.send('User does not exist')
      }
    })
    .catch(err => {
      res.send('error: ' + err)
    })
})

users.post('/apply', (req, res) => {
  const applyData = {
    JobID: req.body.JobID,
    first_name: req.body.firstName,
    last_name: req.body.lastName,
    Email: req.body.Email,
    Phone: req.body.Phone,
    Gender: req.body.Gender,
    Date: req.body.Date,
    referrer: req.body.referrer,
    job_type: req.body.jobType,
    // resume: req.body.resume,
    // additional fields for your form
  }

  console.log('Checking for existing application with data: ', applyData);

  Apply.findOne({
    where: {
      JobID: applyData.JobID,
      first_name: applyData.first_name,
      last_name: applyData.last_name,
      Email: applyData.Email,
      Phone: applyData.Phone,
      Gender: applyData.Gender,
      Date: applyData.Date,
      referrer: applyData.referrer,
      job_type: applyData.job_type,
      // resume: applyData.resume,
      // additional fields for your form
    }
  })
  .then(application => {
    if (application) {
      console.log('Existing application found: ', application.toJSON());
      res.json({ status: 'You have already applied, Thank you' })
    } else {
      console.log('No existing application found, creating a new one.');
      Apply.create(applyData)
        .then(apply => {
          res.json({ status: 'Application submitted!' })
        })
        .catch(err => {
          console.error('Error while creating application: ', err);
          res.send('error: ' + err)
        })
    }
  })
  .catch(err => {
    console.error('Error while checking for existing application: ', err);
    res.send('error: ' + err)
  })
});

users.get('/apply', (req, res) => {
  Apply.findAll()
    .then(apply => {
      res.json(apply)
    })
    .catch(err => {
      res.send('error: ' + err)
    })
})

module.exports = users;
