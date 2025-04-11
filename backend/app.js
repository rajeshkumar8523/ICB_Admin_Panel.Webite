require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:5500',
            'https://icb-admin-panel-website-8tjak5gmq-rajeshkumar8523s-projects.vercel.app',
            process.env.CLIENT_URL || '*'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: [
        'http://localhost:5500',
        'https://icb-admin-panel-website-8tjak5gmq-rajeshkumar8523s-projects.vercel.app',
        process.env.CLIENT_URL || '*'
    ],
    methods: ['GET', 'POST'],
    credentials: true
}));

// Serve static files from ICB-Admin-Panel/public
app.use(express.static(path.join(__dirname, '../ICB-Admin-Panel/public')));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://projectsem949:rajesh8523@admindb.zesxng1.mongodb.net/?retryWrites=true&w=majority&appName=admindb';
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        console.error('Server will not function without a database connection.');
        process.exit(1); // Exit if database connection fails
    });

// Schemas
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    institutionType: { type: String, required: true },
    designation: { type: String, required: true },
    password: { type: String, required: true },
    ipAddress: { type: String },
    lastLogin: { type: Date },
    role: { type: String, enum: ['user', 'driver', 'admin'], default: 'user' }
});

const busTrackingSchema = new mongoose.Schema({
    busNumber: { type: Number, required: true, unique: true },
    driverName: { type: String, required: true },
    driverId: { type: String },
    route: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    direction: { type: Number },
    capacity: { type: Number, required: true },
    currentStudents: { type: Number, default: 0 },
    currentStatus: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
    lastUpdated: { type: Date, default: Date.now }
});

const trackerSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },
    busNumber: { type: Number, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number },
    direction: { type: Number },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const BusTracking = mongoose.model('BusTracking', busTrackingSchema);
const Tracker = mongoose.model('Tracker', trackerSchema);

// Utility function to get client IP
const getClientIp = (req) => {
    return (
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null)
    );
};

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinBus', (busNumber) => {
        socket.join(busNumber);
        console.log(`Socket ${socket.id} joined bus ${busNumber}`);
    });

    socket.on('locationUpdate', async (data) => {
        try {
            const { busNumber, latitude, longitude, speed, direction } = data;

            // Save to Tracker collection
            const tracker = new Tracker({
                deviceId: socket.id,
                busNumber,
                latitude,
                longitude,
                speed,
                direction
            });
            await tracker.save();

            // Update BusTracking collection
            await BusTracking.findOneAndUpdate(
                { busNumber },
                {
                    latitude,
                    longitude,
                    speed,
                    direction,
                    lastUpdated: new Date()
                },
                { upsert: true }
            );

            // Emit update to clients in the bus room
            io.to(busNumber).emit('busLocation', {
                busNumber,
                latitude,
                longitude,
                speed,
                direction,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('Error handling location update:', error);
            socket.emit('error', { message: 'Failed to update location' });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// API Routes
// Register Endpoint
app.post('/api/register', async (req, res, next) => {
    try {
        const { userId, name, contact, email, institutionType, designation, password, role } = req.body;
        const existingUser = await User.findOne({ $or: [{ userId }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User ID or Email already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const ipAddress = getClientIp(req);
        const newUser = new User({
            userId,
            name,
            contact,
            email,
            institutionType,
            designation,
            password: hashedPassword,
            ipAddress,
            lastLogin: new Date(),
            role: role || 'user'
        });
        await newUser.save();
        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                user: {
                    userId: newUser.userId,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// Login Endpoint
app.post('/api/login', async (req, res, next) => {
    try {
        const { userId, password } = req.body;
        if (!userId || !password) {
            return res.status(400).json({ message: 'Please provide user ID and password' });
        }
        const user = await User.findOne({ userId });
        const ipAddress = getClientIp(req);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        user.ipAddress = ipAddress;
        user.lastLogin = new Date();
        await user.save();
        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: {
                    userId: user.userId,
                    name: user.name,
                    email: user.email,
                    contact: user.contact,
                    designation: user.designation,
                    institutionType: user.institutionType,
                    role: user.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// Get User Profile Endpoint
app.get('/api/profile/:userId', async (req, res, next) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    userId: user.userId,
                    name: user.name,
                    email: user.email,
                    contact: user.contact,
                    designation: user.designation,
                    institutionType: user.institutionType,
                    role: user.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// Update Password Endpoint
app.post('/api/update-password', async (req, res, next) => {
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
        next(error);
    }
});

// Reset Password Endpoint
app.post('/api/reset-password', async (req, res, next) => {
    try {
        const { userId, newPassword } = req.body;
        if (!userId || !newPassword) {
            return res.status(400).json({ message: 'Please provide user ID and new password' });
        }
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();
        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
});

// Add Bus Endpoint
app.post('/api/buses', async (req, res, next) => {
    try {
        const { busNumber, driverName, driverId, route, capacity, currentStudents } = req.body;
        const bus = await BusTracking.create({
            busNumber,
            driverName,
            driverId,
            route,
            capacity,
            currentStudents,
            latitude: 0,
            longitude: 0
        });
        res.status(201).json({
            status: 'success',
            data: { bus }
        });
    } catch (error) {
        next(error);
    }
});

// Get All Buses Endpoint
app.get('/api/buses', async (req, res, next) => {
    try {
        const buses = await BusTracking.find();
        res.status(200).json({
            status: 'success',
            results: buses.length,
            data: { buses }
        });
    } catch (error) {
        next(error);
    }
});

// Get Single Bus Endpoint
app.get('/api/buses/:busNumber', async (req, res, next) => {
    try {
        const bus = await BusTracking.findOne({ busNumber: req.params.busNumber });
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        res.status(200).json({
            status: 'success',
            data: { bus }
        });
    } catch (error) {
        next(error);
    }
});

// IoT Device Data Endpoint (Bus Tracking Update)
app.post('/api/iot/update', async (req, res, next) => {
    try {
        const { busNumber, latitude, longitude, speed, direction } = req.body;
        if (!busNumber || !latitude || !longitude) {
            return res.status(400).json({ message: 'Please provide busNumber, latitude, and longitude' });
        }
        const busData = {
            busNumber,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            speed: speed ? parseFloat(speed) : 0,
            direction: direction ? parseFloat(direction) : null,
            lastUpdated: new Date()
        };
        const updatedBus = await BusTracking.findOneAndUpdate(
            { busNumber },
            busData,
            { upsert: true, new: true }
        );
        const tracker = new Tracker({
            deviceId: req.headers['device-id'] || 'web',
            busNumber,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            speed: speed ? parseFloat(speed) : null,
            direction: direction ? parseFloat(direction) : null
        });
        await tracker.save();
        io.to(busNumber).emit('busLocation', {
            busNumber,
            latitude: tracker.latitude,
            longitude: tracker.longitude,
            speed: tracker.speed,
            direction: tracker.direction,
            timestamp: tracker.timestamp
        });
        res.status(200).json({
            status: 'success',
            message: 'Bus data updated successfully',
            data: { bus: updatedBus }
        });
    } catch (error) {
        next(error);
    }
});

// Get Bus Tracking History
app.get('/api/trackers/history/:busNumber', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { busNumber: req.params.busNumber };
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        const trackers = await Tracker.find(query).sort({ timestamp: 1 });
        res.status(200).json({
            status: 'success',
            results: trackers.length,
            data: { trackers }
        });
    } catch (error) {
        next(error);
    }
});

// Serve frontend (default to login.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../ICB-Admin-Panel/public/LOGIN/login.html'));
});

// Catch-all route for frontend routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../ICB-Admin-Panel/public/LOGIN/login.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
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

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
