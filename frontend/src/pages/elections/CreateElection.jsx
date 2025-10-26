import React, { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ElectionForm from "../../components/election/ElectionForm.jsx";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import { createNewElection } from "../../redux/slices/electionSlice.js";

export default function CreateElection() {
	// ...state & hooks...
	const { isManager, isSuperAdmin, user } = useAuth();
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const { showSuccess, showError } = useToast();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = useCallback(
		async (formPayload) => {
			setIsSubmitting(true);
			try {
				// attach creator if available (backend will accept or ignore)
				const payload = { ...formPayload };
				if (user?.walletAddress) payload.creator = user.walletAddress;

				const action = await dispatch(createNewElection(payload));
				if (action.error) throw new Error(action.error.message || "Failed to create election");
				const res = action.payload || {};
				// attempt to extract created election id/address
				const created = res?.election ?? res;
				const id =
					created?.electionId ??
					created?.id ??
					created?._id ??
					res?.electionId ??
					res?.id;
				showSuccess("Election created");
				if (id) {
					navigate(`/elections/${id}`);
				} else {
					// fallback to elections list
					navigate("/elections");
				}
				return res;
			} catch (err) {
				showError(err?.message || "Failed to create election");
				throw err;
			} finally {
				setIsSubmitting(false);
			}
		},
		[dispatch, navigate, showError, showSuccess, user]
	);

	// Not authorized view
	if (!isManager && !isSuperAdmin) {
		return (
			<div className="max-w-3xl mx-auto px-4 py-8">
				<Card>
					<h2 className="text-lg font-semibold">Create New Election</h2>
					<p className="mt-2 text-sm text-gray-600">You do not have permission to create elections.</p>
					<div className="mt-4">
						<Button variant="outline" size="medium" onClick={() => navigate(-1)}>Go Back</Button>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-semibold">Create New Election</h2>
				<Button variant="outline" size="small" onClick={() => navigate(-1)}>Back</Button>
			</div>

			<Card>
				<ElectionForm onSubmit={handleSubmit} />
			</Card>

			{isSubmitting && (
				<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded shadow text-center">
						<div className="text-lg font-medium">Submitting...</div>
						<div className="text-sm text-gray-500 mt-2">Please wait while the election is being created.</div>
					</div>
				</div>
			)}
		</div>
	);
}
