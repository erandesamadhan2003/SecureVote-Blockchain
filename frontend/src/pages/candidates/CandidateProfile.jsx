import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import CandidateDetails from "../../components/candidate/CandidateDetails.jsx";
import Button from "../../components/common/Button.jsx";
import api from "../../services/api.js";
import candidateService from "../../services/candidateService.js";
import useToast from "../../hooks/useToast.js";

/*
  Page: /candidates/:candidateId
  Optional query param: ?electionId=<electionId or contractAddress>
*/
export default function CandidateProfile() {
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const electionId = searchParams.get("electionId");
  const navigate = useNavigate();
  const { showError } = useToast();

  const [candidate, setCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        // if electionId provided prefer chain/db endpoint that returns candidate details
        if (electionId) {
          try {
            const res = await candidateService.getCandidateDetails(electionId, candidateId);
            if (!mounted) return;
            const payload = res?.candidate ?? res;
            setCandidate(payload || null);
            return;
          } catch (e) {
            // fallback to generic endpoints below
          }
        }

        // try profile endpoint by candidate internal id (if backend provides it)
        try {
          const res = await api.get(`/candidates/profile/${candidateId}`);
          if (!mounted) return;
          setCandidate(res?.candidate ?? res ?? null);
          return;
        } catch (e) {
          // continue
        }

        // try generic candidate lookup endpoint (some backends expose /candidates/id)
        try {
          const res = await api.get(`/candidates/${candidateId}`);
          if (!mounted) return;
          // if it returned a list, attempt to pick first
          const data = res?.candidate ?? res;
          if (Array.isArray(data) && data.length > 0) setCandidate(data[0]);
          else setCandidate(data || null);
          return;
        } catch (e) {
          // last resort
          throw new Error("Candidate not found");
        }
      } catch (err) {
        if (mounted) {
          showError(err?.message || "Failed to load candidate");
          setCandidate(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [candidateId, electionId, showError]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Candidate Profile</h2>
        <Button variant="outline" size="small" onClick={() => navigate(-1)}>Back</Button>
      </div>

      {isLoading ? (
        <div className="p-6 bg-white rounded shadow text-center text-sm text-gray-600">Loading candidate…</div>
      ) : candidate ? (
        <CandidateDetails candidate={candidate} showVoteButton={false} onVote={() => { /* optional handler */ }} />
      ) : (
        <div className="p-6 bg-white rounded shadow text-center text-sm text-gray-600">Candidate not found.</div>
      )}
    </div>
  );
}
