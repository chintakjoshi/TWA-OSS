const Sequelize = require('sequelize');
const db = require('../database/db.js');

const Apply = db.sequelize.define(
  'apply',
  {
    JobID: {
      type: Sequelize.STRING
    },
    first_name: {
      type: Sequelize.STRING
    },
    last_name: {
      type: Sequelize.STRING
    },
    Email: {
      type: Sequelize.STRING
    },
    Phone: {
      type: Sequelize.STRING
    },
    Gender: {
      type: Sequelize.STRING
    },
    Date: {
      type: Sequelize.STRING
    },
    referrer: {
      type: Sequelize.STRING
    },
    job_type: {
      type: Sequelize.STRING
    },
    // resume: {
    //   type: Sequelize.GEOM
    // }
    // additional fields for your form
  },
  {
    timestamps: false
  }
);

module.exports = Apply;