import { useParams } from "react-router-dom";
import { useState } from "react";
import VoterRegistration from "@/components/voting/VoterRegistration";
import voteService from "@/services/voteService.js";
import useToast from "@/hooks/useToast.js";

export default function RegisterVoters() {
	const { electionId } = useParams();
	const { showSuccess, showError } = useToast();
	const [isProcessing, setIsProcessing] = useState(false);

	// onRegisterComplete(voters: string[], progressCb?: (done:number)=>void)
	const onRegisterComplete = async (voters, progressCb) => {
		if (!electionId) throw new Error("electionId is required (from route)");
		if (!Array.isArray(voters) || voters.length === 0) throw new Error("No voters provided");

		setIsProcessing(true);
		try {
			if (voters.length === 1) {
				await voteService.registerVoter(electionId, voters[0]);
				if (typeof progressCb === "function") progressCb(1);
				showSuccess("Voter registered");
			} else {
				// use batch endpoint
				await voteService.registerVotersBatch(electionId, voters);
				if (typeof progressCb === "function") progressCb(voters.length);
				showSuccess(`Registered ${voters.length} voters`);
			}
		} catch (err) {
			showError(err?.message || "Registration failed");
			throw err;
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div>
			<VoterRegistration electionId={electionId} onRegisterComplete={onRegisterComplete} />
		</div>
	);
}