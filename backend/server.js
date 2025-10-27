import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import electionRoutes from "./routes/election.routes.js";
import roleRoutes from "./routes/roles.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import votesRoutes from "./routes/votes.routes.js";
import resultRoutes from "./routes/result.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js"; // added earlier
import adminRoutes from "./routes/admin.routes.js"; // <-- added

import { provider, wallet, roleContract, electionFactoryContract } from "./utils/blockchain.js";
import { ethers } from "ethers";

// add multer + file helpers for uploads
import multer from "multer";
import fs from "fs";
import path from "path";

// ensure uploads dir exists
const uploadsDir = path.join(process.cwd(), "uploads");
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { /* ignore */ }

// serve uploaded files

// configure multer storage (store original extension)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    cb(null, `${base}${ext}`);
  }
});
const upload = multer({ storage });

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
connectDB();

// mount auth routes
app.use("/api/auth", authRoutes);

// mount election routes
app.use("/api/elections", electionRoutes);

// mount candidate routes
app.use("/api/candidates", candidateRoutes);

// mount votes routes
app.use("/api/votes", votesRoutes);

// mount role routes
app.use("/api/roles", roleRoutes);

// mount result routes
app.use("/api/results", resultRoutes);

// mount dashboard routes (stats & recent activities)
app.use("/api/dashboard", dashboardRoutes);

// mount admin routes
app.use("/api/admin", adminRoutes);

app.use("/uploads", express.static(uploadsDir));
// Simple health route
app.get("/", (req, res) => {
	return res.json({ status: "ok", env: process.env.NODE_ENV || "development" });
});

// file upload endpoint
app.post("/api/upload", upload.single("file"), (req, res) => {
	try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const filename = req.file.filename;
    const urlBase = process.env.API_BASE_URL ? process.env.API_BASE_URL.replace(/\/$/, "") : `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${urlBase}/uploads/${encodeURIComponent(filename)}`;
    return res.json({ hash: filename, url: fileUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ message: "Upload failed" });
  }
});

// New: verify blockchain connectivity and contracts
const verifyBlockchain = async () => {
	try {
		// provider sanity
		if (!provider) throw new Error("Blockchain provider not configured");
		const blockNumber = await provider.getBlockNumber();
		const network = await provider.getNetwork();
		console.log(`Blockchain provider connected — network: ${network.name} (chainId=${network.chainId}), block: ${blockNumber}`);

		// wallet sanity
		if (!wallet || !wallet.address) {
			console.warn("Admin wallet not configured (ADMIN_PRIVATE_KEY). Some admin actions will fail.");
		} else {
			const balance = await provider.getBalance(wallet.address);
			console.log(`Admin wallet: ${wallet.address} — balance: ${ethers.utils.formatEther(balance)} ETH`);
		}

		// contract code checks (Roles)
		if (roleContract && roleContract.address) {
			const code = await provider.getCode(roleContract.address);
			if (!code || code === "0x") {
				throw new Error(`No contract code at Roles address ${roleContract.address}`);
			}
			console.log(`Roles contract available at ${roleContract.address}`);
		} else {
			console.warn("Roles contract instance not configured or address missing.");
		}

		// contract code checks (ElectionFactory)
		if (electionFactoryContract && electionFactoryContract.address) {
			const code = await provider.getCode(electionFactoryContract.address);
			if (!code || code === "0x") {
				throw new Error(`No contract code at ElectionFactory address ${electionFactoryContract.address}`);
			}
			console.log(`ElectionFactory contract available at ${electionFactoryContract.address}`);
		} else {
			console.warn("ElectionFactory contract instance not configured or address missing.");
		}

		// passed checks
		return true;
	} catch (err) {
		console.error("Blockchain verification failed:", err?.message || err);
		return false;
	}
};

// Start server after DB connection and blockchain verification
const PORT = process.env.PORT || 3000;
const start = async () => {
	try {
		await connectDB();

		const ok = await verifyBlockchain();
		if (!ok) {
			console.error("Exiting: blockchain connectivity or contract checks failed.");
			process.exit(1);
		}

		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (err) {
		console.error("Failed to start server:", err);
		process.exit(1);
	}
};

start();

