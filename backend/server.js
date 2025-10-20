import express from 'express';
import { connectDB } from './config/db.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { listenToEvents } from './utils/contractService.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import electionRoutes from './routes/elections.routes.js';
import candidateRoutes from './routes/candidates.routes.js';
import voteRoutes from './routes/votes.routes.js';
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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});