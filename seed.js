// seed.js
const bcrypt = require('bcryptjs');
const db = require('./database/db.js');
const User = require('./models/User'); // adjust path to your user model

async function seedAdmin() {
  await db.sequelize.sync(); // ensure tables exist

  const adminEmail = 'admin@example.com';
  const plainPassword = 'mypassword123';

  const existing = await User.findOne({ where: { email: adminEmail } });
  if (existing) {
    console.log('Admin already exists. Skipping seed.');
    return;
  }

  const hash = await bcrypt.hash(plainPassword, 10);

  await User.create({
    first_name: 'Default',
    last_name: 'Admin',
    email: adminEmail,
    password: hash,  // or password_hash depending on your model
    created: new Date()
  });

  console.log(`✅ Default admin created: ${adminEmail} / ${plainPassword}`);
}

seedAdmin()
  .then(() => {
    console.log('🌱 Seeding complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
