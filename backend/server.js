import express from 'express';
import { connectDB } from './config/db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { listenToEvents } from './utils/contractService.js';
import http from 'http';

// Import routes
import authRoutes from './routes/auth.routes.js';
import electionRoutes from './routes/elections.routes.js';
import candidateRoutes from './routes/candidates.routes.js';
import voteRoutes from './routes/votes.routes.js';
import adminRoutes from './routes/admin.routes.js'
import { errorHandler } from './middlewares/errorHandler.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes)

// Basic routes
app.get('/', (req, res) => {
    res.json({ 
        message: 'Voting DApp Server is running',
        version: '1.0.0',
        blockchain: process.env.BLOCKCHAIN_RPC_URL ? 'Configured' : 'Not configured'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start listening to blockchain events with error handling
setTimeout(() => {
    try {
        listenToEvents();
        console.log('Blockchain event listener started');
    } catch (error) {
        console.log('Blockchain connection failed, running in offline mode');
    }
}, 2000);

// Error handler middleware (should be last)
app.use(errorHandler);

const server = http.createServer(app);

// initialize websocket
const { initWebsocket } = require('./utils/websocket');
initWebsocket(server, { origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' });

// start server
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});