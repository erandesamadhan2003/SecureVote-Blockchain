import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
dotenv.config();

connectDB();

const app = express();;

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
})