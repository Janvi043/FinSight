// create-demo-user.js
/**
 * FinSight – Insert a demo user with rich sample data.
 *
 * Run once:
 *   node backend/create-demo-user.js
 *
 * After running, you can log in with:
 *   Email: demo@example.com
 *   Password: password
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finsight_db';

mongoose.connect(MONGODB_URI);
const db = mongoose.connection;

// Schemas – must match definitions in server.js
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    full_name: { type: String },
    email: { type: String },
    phone: { type: String },
    city: { type: String },
    country: { type: String },
    monthly_salary: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    avatar_url: { type: String },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    transaction_date: { type: Date, default: Date.now },
    source: { type: String },
    recurring: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    target: { type: Number, required: true },
    deadline: { type: Date },
    achieved: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

const User = mongoose.model('User', userSchema);
const Profile = mongoose.model('Profile', profileSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Goal = mongoose.model('Goal', goalSchema);

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function main() {
  try {
    // 1️⃣ Ensure demo user exists (idempotent)
    const existing = await User.findOne({ email: 'demo@example.com' });
    if (existing) {
      console.log('✅ Demo user already exists with ID', existing._id.toString());
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash('password', 10);
    const demoUser = await User.create({ email: 'demo@example.com', passwordHash });
    console.log('👤 Created demo user →', demoUser.email);

    // 2️⃣ Profile
    await Profile.create({
      userId: demoUser._id,
      full_name: 'Demo User',
      email: demoUser.email,
      phone: '+91-9876543210',
      city: 'Bangalore',
      country: 'India',
      monthly_salary: 80000,
      currency: 'INR',
    });

    // 3️⃣ Transactions – 9 months of data
    const now = new Date();
    const incomeCats = ['Salary', 'Freelance', 'Interest', 'Dividends'];
    const expenseCats = ['Rent', 'Groceries', 'Utilities', 'Transport', 'Entertainment', 'Dining', 'Shopping', 'Health', 'Travel'];
    const txs = [];
    for (let m = 8; m >= 0; m--) {
      const month = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

      // income (once per month)
      const salary = 80000 + randInt(-4000, 4000);
      txs.push({
        userId: demoUser._id,
        type: 'income',
        category: incomeCats[randInt(0, incomeCats.length - 1)],
        amount: salary,
        description: 'Monthly salary',
        transaction_date: new Date(month.getFullYear(), month.getMonth(), randInt(1, 5)),
        source: 'Acme Corp',
        recurring: true,
      });

      // expenses (5‑8 per month)
      const expCount = randInt(5, 8);
      for (let i = 0; i < expCount; i++) {
        const cat = expenseCats[randInt(0, expenseCats.length - 1)];
        const amt = randInt(500, 25000);
        txs.push({
          userId: demoUser._id,
          type: 'expense',
          category: cat,
          amount: amt,
          description: `${cat} expense`,
          transaction_date: new Date(month.getFullYear(), month.getMonth(), randInt(6, days)),
          source: cat,
          recurring: false,
        });
      }
    }
    await Transaction.insertMany(txs);
    console.log(`💸 Inserted ${txs.length} transactions covering 9 months`);

    // 4️⃣ Sample goals
    const goals = [
      { name: 'Emergency Fund', target: 200000, deadline: new Date(now.getFullYear(), now.getMonth() + 6, 1) },
      { name: 'Vacation to Goa', target: 50000, deadline: new Date(now.getFullYear(), now.getMonth() + 4, 15) },
      { name: 'New Laptop', target: 120000, deadline: new Date(now.getFullYear(), now.getMonth() + 3, 1) },
    ];
    for (const g of goals) {
      await Goal.create({
        userId: demoUser._id,
        name: g.name,
        target: g.target,
        deadline: g.deadline,
      });
    }
    console.log(`🎯 Created ${goals.length} sample savings goals`);

    console.log('\n✅ All demo data ready. You can now log in with demo@example.com / password');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error during seeding', e);
    process.exit(1);
  }
}

main();
