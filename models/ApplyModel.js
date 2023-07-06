const Sequelize = require('sequelize');
const db = require('../database/db.js');

const Apply = db.sequelize.define(
  'apply',
  {
    first_name: {
      type: Sequelize.STRING
    },
    last_name: {
      type: Sequelize.STRING
    },
    job_type: {
      type: Sequelize.STRING
    },
    // additional fields for your form
  },
  {
    timestamps: false
  }
);

module.exports = Apply;
