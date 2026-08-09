require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finsight_db';

app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['http://localhost:4200', 'http://localhost:3000'];
    if (!origin || allowed.includes(origin) || /ngrok(-free)?\.(app|dev|io)$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

mongoose.connect(MONGODB_URI);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  full_name: { type: String },
  email: { type: String },
  phone: { type: String },
  city: { type: String },
  country: { type: String },
  monthly_salary: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  avatar_url: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });


// Goal schema
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  target: { type: Number, required: true },
  deadline: { type: Date },
  achieved: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const Goal = mongoose.model('Goal', goalSchema);

// Get goals for a user
app.get('/api/goals/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const goals = await Goal.find({ userId: userObjectId }).lean();
    res.json(goals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Add a new goal
app.post('/api/goals/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, target, deadline } = req.body;
    const goal = await Goal.create({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      target: Number(target) || 0,
      deadline: deadline ? new Date(deadline) : undefined,
    });
    res.status(201).json(goal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  transaction_date: { type: Date, default: Date.now },
  source: { type: String },
  recurring: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

const User = mongoose.model('User', userSchema);
const Profile = mongoose.model('Profile', profileSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FinSight backend is running' });
});

app.listen(port, () => {
  console.log(`FinSight backend running on http://localhost:${port}`);
});

app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [profile, incomeResult, expenseResult, recentTransactions] = await Promise.all([
      Profile.findOne({ userId: userObjectId }).lean(),
      Transaction.aggregate([
        { $match: { userId: userObjectId, type: 'income' } },
        { $group: { _id: null, total_income: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { userId: userObjectId, type: 'expense' } },
        { $group: { _id: null, total_expense: { $sum: '$amount' } } },
      ]),
      Transaction.find({ userId: userObjectId }).sort({ transaction_date: -1, created_at: -1 }).limit(10).lean(),
    ]);

    const totalIncome = Number(incomeResult[0]?.total_income || 0);
    const totalExpense = Number(expenseResult[0]?.total_expense || 0);
    const netBalance = totalIncome - totalExpense;

    res.json({
      profile,
      totals: {
        income: totalIncome,
        expense: totalExpense,
        netBalance,
      },
      recentTransactions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profile = await Profile.findOne({ userId: userObjectId }).lean();
    res.json(profile || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      full_name,
      email,
      phone,
      city,
      country,
      monthly_salary,
      currency,
      avatar_url,
    } = req.body;

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const update = {};

    if (full_name !== undefined) update.full_name = full_name;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (city !== undefined) update.city = city;
    if (country !== undefined) update.country = country;
    if (monthly_salary !== undefined) update.monthly_salary = Number(monthly_salary) || 0;
    if (currency !== undefined) update.currency = currency;
    if (avatar_url !== undefined) update.avatar_url = avatar_url;

    const profile = await Profile.findOneAndUpdate(
      { userId: userObjectId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.status(201).json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const query = { userId: userObjectId };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query).sort({ transaction_date: -1, created_at: -1 }).lean();
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      type,
      category,
      amount,
      description,
      transaction_date,
      source,
      recurring,
    } = req.body;

    const transaction = await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      category,
      amount,
      description,
      transaction_date: transaction_date || new Date(),
      source: source || null,
      recurring: recurring || false,
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

app.put('/api/transactions/:userId/:transactionId', async (req, res) => {
  try {
    const { userId, transactionId } = req.params;
    const {
      type,
      category,
      amount,
      description,
      transaction_date,
      source,
      recurring,
    } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: transactionId, userId: new mongoose.Types.ObjectId(userId) },
      { type, category, amount, description, transaction_date, source, recurring },
      { new: true }
    ).lean();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/api/transactions/:userId/:transactionId', async (req, res) => {
  try {
    const { userId, transactionId } = req.params;
    const result = await Transaction.deleteOne({ _id: transactionId, userId: new mongoose.Types.ObjectId(userId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, city, country, monthly_salary } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase(), passwordHash });

    await Profile.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          full_name: full_name || null,
          email: email.toLowerCase(),
          phone: phone || null,
          city: city || null,
          country: country || null,
          monthly_salary: Number(monthly_salary) || 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login' });
  }
});
