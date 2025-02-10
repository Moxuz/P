const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Password is required only if googleId is not present
    },
  },
  googleId: {
    type: String, // To store Google OAuth ID if using Google login
  },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Only hash password if it has been modified or is new and is not null
  if (!this.isModified('password') || !this.password) return next();

  try {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next(); // Proceed to save the user
  } catch (error) {
    next(error); // Pass the error to the next middleware
  }
});

// Method to compare password for login
UserSchema.methods.isValidPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
