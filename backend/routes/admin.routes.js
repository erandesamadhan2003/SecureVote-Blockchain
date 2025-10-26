import express from "express";
import {
	getUsers,
	updateUserRole,
	setUserVerified,
	deleteUser,
	bulkAction
} from "../controllers/admin.controller.js";

const router = express.Router();

// GET /api/admin/users
router.get("/users", getUsers);

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", updateUserRole);

// PUT /api/admin/users/:id/verify
router.put("/users/:id/verify", setUserVerified);

// DELETE /api/admin/users/:id
router.delete("/users/:id", deleteUser);

// POST /api/admin/users/bulk-action
router.post("/users/bulk-action", bulkAction);

export default router;
