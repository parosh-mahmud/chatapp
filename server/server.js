const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server); // Initialize Socket.io

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, index: true },
  password: String,
  profilePicture: String,
  email: { type: String, index: true },
  phoneNumber: { type: String, index: true },
  address: { type: String, index: true },
  rank: { type: String, index: true },
  isOnline: { type: Boolean, index: true },
});

const User = mongoose.model('User', userSchema);

// JWT secret
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      username: req.body.username,
      password: hashedPassword,
    });
    await user.save();
    res.status(201).send();
  } catch (error) {
    res.status(500).send(error);
  }
});



// Login endpoint
app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      const token = jwt.sign({ userId: user._id }, JWT_SECRET);
      
      const userData = {
        _id: user._id,
        username: user.username,
        // other user properties you want to include
      };

      res.status(200).json({ token, user: userData }); // Include user data in the response

      // Emit a socket event when the user logs in
      io.emit('userLoggedIn', {
        username: user.username,
      });
      console.log('User logged in:', user.username);
    } else {
      res.status(401).send('Invalid login credentials');
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update user data
app.put('/update-profile/:userId', async (req, res) => {
  const userId = req.params.userId;
  const updatedData = req.body;

  

  try {
    const user = await User.findByIdAndUpdate(userId, { $set: updatedData }, { new: true });

    // Log the updated user data
    

    res.json({ message: 'User data updated successfully', user });
  } catch (error) {
    console.error('Error updating user data:', error);
    res.status(500).json({ message: 'Error updating user data' });
  }
});





// Get registered users endpoint
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }); // Exclude passwords from the response
    res.status(200).json(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
