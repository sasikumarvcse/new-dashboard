const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profile: {
    currentWeight: { type: Number, default: null },
    height: { type: Number, default: null },
    targetWeight: { type: Number, default: null },
    goal: { type: String, default: "" },
    history: [
      {
        date: { type: Date, default: Date.now },
        weight: { type: Number },  // Ensure this is a number
        goal: String,
      },
    ],
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Compare stored password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
