import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authrouter from './routes/auth.routes.js';
dotenv.config();

connectDB();

const app = express();

app.use("/api/auth", authrouter);

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
})