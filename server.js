require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const connectDB = require('./db');
const User = require('./User');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Connect to MongoDB
connectDB();

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized: Please log in' });
};

// Server-side logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).json({ message: 'Failed to logout' });
    }
    res.clearCookie('connect.sid'); // Clears the session cookie
    return res.status(200).json({ message: 'Logout successful' });
  });
});

// Routes
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.get('/index.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User Signup
app.post('/signup', async (req, res) => {
  const { username, password, height, weight, targetWeight, goal } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const user = new User({
      username,
      password,
      profile: {
        currentWeight: parseInt(weight),
        height: parseInt(height),
        goal,
        targetWeight: parseInt(targetWeight),  // Storing target weight
        history: [{ weight: parseInt(weight), goal }],
      },
    });

    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: 'User not found. Please sign up.' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password.' });
    }

    req.session.user = user;
    res.status(200).json({ message: 'Login successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// Save Profile Data
app.post('/save-profile', isAuthenticated, async (req, res) => {
  const { currentWeight, height, targetWeight, goal } = req.body;
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profile.history.push({ weight: parseInt(currentWeight), goal });
    user.profile.currentWeight = parseInt(currentWeight);
    user.profile.height = parseInt(height);
    user.profile.targetWeight = parseInt(targetWeight);  // Saving target weight
    user.profile.goal = goal;

    await user.save();
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Profile Data
app.get('/get-profile', isAuthenticated, async (req, res) => {
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.profile);  // This includes targetWeight
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Weight History
app.get('/get-history', isAuthenticated, async (req, res) => {
  const username = req.session.user.username;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.profile.history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Username (assuming you are storing the username in the session)
app.get('/get-username', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.json({ username: null });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
