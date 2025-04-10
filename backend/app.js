require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5500', 'https://icb-admin-panel-website-8tjak5gmq-rajeshkumar8523s-projects.vercel.app'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5500', 'https://icb-admin-panel-website-8tjak5gmq-rajeshkumar8523s-projects.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
}));

// MongoDB Connection
const mongoURI = 'mongodb+srv://projectsem949:rajesh8523@admindb.zesxng1.mongodb.net/?retryWrites=true&w=majority&appName=admindb';
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    institutionType: { type: String, required: true },
    designation: { type: String, required: true },
    password: { type: String, required: true }
});

// Bus Tracking Schema
const busTrackingSchema = new mongoose.Schema({
    busNumber: { type: Number, required: true, unique: true },
    driverName: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, required: true },
    route: { type: String, required: true },
    capacity: { type: Number, required: true },
    currentStudents: { type: Number, required: true },
    lastUpdated: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const BusTracking = mongoose.model('BusTracking', busTrackingSchema);

// Register Endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { userId, name, contact, email, institutionType, designation, password } = req.body;
        const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User ID or Email already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ 
            userId, 
            name, 
            contact, 
            email, 
            institutionType,
            designation,
            password: hashedPassword 
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const user = await User.findOne({ userId });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        res.status(200).json({ 
            message: 'Login successful', 
            userId: user.userId,
            name: user.name,
            email: user.email,
            contact: user.contact,
            designation: user.designation,
            institutionType: user.institutionType
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Get User Profile Endpoint
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            name: user.name,
            email: user.email,
            contact: user.contact,
            designation: user.designation
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});

// Update Password Endpoint
app.post('/api/update-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();
        
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ message: 'Server error during password update' });
    }
});

// Reset Password Endpoint
app.post('/api/reset-password', async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});

// IoT Device Data Endpoint
app.post('/api/iot/update', async (req, res) => {
    try {
        const { busNumber, latitude, longitude, speed } = req.body;
        
        const busData = {
            busNumber,
            driverName: busNumber === 1 ? "John Doe" : `Driver ${busNumber}`,
            latitude,
            longitude,
            speed,
            route: "Mahabubnagar (College) to Jadcherla",
            capacity: 60,
            currentStudents: Math.floor(Math.random() * 60),
            lastUpdated: new Date()
        };

        const updatedBus = await BusTracking.findOneAndUpdate(
            { busNumber },
            busData,
            { upsert: true, new: true }
        );

        io.emit('busUpdate', updatedBus);
        res.status(200).json({ message: 'Bus data updated successfully' });
    } catch (error) {
        console.error('IoT update error:', error);
        res.status(500).json({ message: 'Server error during IoT update' });
    }
});

// Get All Bus Tracking Data
app.get('/api/tracking', async (req, res) => {
    try {
        const buses = await BusTracking.find();
        res.status(200).json(buses);
    } catch (error) {
        console.error('Tracking fetch error:', error);
        res.status(500).json({ message: 'Server error fetching tracking data' });
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// For Vercel deployment
module.exports = app;

// For local development
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5005;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
