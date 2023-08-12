const Sequelize = require('sequelize');
const db = {};

let sequelize;

if (process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
        operatorsAliases: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
} else {
    sequelize = new Sequelize('nodejs_login1', 'root', 'root', {
        host: 'localhost',
        port: '3306',
        dialect: 'mysql',
        operatorsAliases: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
sequelize.sync();