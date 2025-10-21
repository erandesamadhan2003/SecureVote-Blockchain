import mongoose from "mongoose";

const connectDB = async () => {
	try {
		const uri = process.env.MONGODB_URI;
		if (!uri) {
			throw new Error("MONGODB_URI not defined in environment");
		}

		await mongoose.connect(uri);

		console.log("MongoDB connected:", mongoose.connection.host);
	} catch (error) {
		console.error("MongoDB connection error:", error.message || error);
		// fail fast
		process.exit(1);
	}
};

export default connectDB;