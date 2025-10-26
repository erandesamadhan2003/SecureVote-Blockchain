import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import VotingBallot from "../../components/voting/VotingBallot.jsx";
import VoteSuccess from "../../components/voting/VoteSuccess.jsx";
import electionService from "../../services/electionService.js";
import voteService from "../../services/voteService.js";
import { submitVote, checkHasVoted } from "../../redux/slices/voteSlice.js";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import { formatDate, calculateTimeRemaining } from "../../utils/helpers.js";
import Button from "../../components/common/Button.jsx";

/*
  Route: /vote/:electionId
*/
export default function VotePage() {
  const { electionId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, walletAddress, isAuthenticated, isVoter } = useAuth();
  const { showError, showSuccess } = useToast();

  const [election, setElection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await electionService.getElectionById(electionId);
        if (!mounted) return;
        const e = res?.election ?? res;
        setElection(e || null);
      } catch (err) {
        showError("Failed to load election");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [electionId, showError]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        // try to check using authenticated user wallet or query string
        const addr = walletAddress || user?.walletAddress;
        if (!addr) {
          setHasVoted(false);
          return;
        }
        const res = await voteService.checkVotingStatus(electionId, addr).catch(() => null);
        if (!mounted) return;
        const voted = res?.hasVoted ?? (res?.hasVoted === false ? false : false);
        setHasVoted(!!voted);
        // optionally capture tx info if backend returns it
        if (res?.tx) setTransaction(res.tx);
      } catch (err) {
        // ignore
      }
    };
    check();
    return () => { mounted = false; };
  }, [electionId, walletAddress, user]);

  const onVote = async (candidate) => {
    setIsVoting(true);
    try {
      // dispatch redux action to submit vote
      const candidateId = candidate?.candidateId ?? candidate?.id ?? candidate?._id;
      const action = await dispatch(submitVote({ electionId, candidateId }));
      if (action.error) throw new Error(action.error.message || "Vote failed");
      // action.payload expected { tx, electionId, candidateId }
      const payload = action.payload || {};
      setHasVoted(true);
      setTransaction(payload.tx ?? payload);
      showSuccess("Vote submitted");
      return payload.tx ?? payload;
    } catch (err) {
      showError(err?.message || "Vote submission failed");
      throw err;
    } finally {
      setIsVoting(false);
    }
  };

  const canVote = useMemo(() => {
    // basic guard: user must be voter role and election must exist and be in Voting status
    if (!election) return false;
    const status = election.status || "";
    return isVoter && String(status).toLowerCase() === "voting";
  }, [election, isVoter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{election?.name ?? "Election"}</h1>
          <div className="text-sm text-gray-600">
            {election?.endTime ? `Ends: ${formatDate(election.endTime)} — ${calculateTimeRemaining(election.endTime)}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="small" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </div>

      {!isAuthenticated ? (
        <div className="p-6 bg-white rounded shadow text-center text-sm text-gray-700">Please connect your wallet to vote.</div>
      ) : isLoading ? (
        <div className="p-6 bg-white rounded shadow text-center text-sm text-gray-700">Loading election…</div>
      ) : hasVoted ? (
        <VoteSuccess transaction={transaction || {}} electionName={election?.name} electionEndTime={election?.endTime} onBack={() => navigate("/elections")} onViewResults={() => navigate(`/elections/${electionId}/results`)} />
      ) : !canVote ? (
        <div className="p-6 bg-yellow-50 rounded shadow text-center text-sm text-gray-700">
          Voting is not active or you do not have VOTER role.
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-red-600 font-medium">Warning: Your vote is final and anonymous. Proceed carefully.</div>
          <VotingBallot election={election} candidates={election?.candidates ?? []} hasVoted={hasVoted} onVote={onVote} onViewResults={() => navigate(`/elections/${electionId}/results`)} />
        </div>
      )}
    </div>
  );
}
