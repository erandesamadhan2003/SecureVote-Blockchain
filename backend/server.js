import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import electionRoutes from "./routes/election.routes.js";
import roleRoutes from "./routes/roles.routes.js";

dotenv.config();

const app = express();
app.use(cors()); 
app.use(express.json());
connectDB();

// mount auth routes
app.use("/api/auth", authRoutes);

// mount election routes
app.use("/api/elections", electionRoutes);

// mount role routes
app.use("/api/roles", roleRoutes);

// Simple health route
app.get("/", (req, res) => {
	return res.json({ status: "ok", env: process.env.NODE_ENV || "development" });
});

// Start server after DB connection
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

