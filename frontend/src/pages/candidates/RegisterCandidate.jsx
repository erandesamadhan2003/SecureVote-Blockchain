import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import CandidateForm from "../../components/candidate/CandidateForm.jsx";
import electionService from "../../services/electionService.js";
import candidateService from "../../services/candidateService.js";
import useToast from "../../hooks/useToast.js";
import useAuth from "../../hooks/useAuth.js";

export default function RegisterCandidate() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [availableElections, setAvailableElections] = useState([]);
  const [loadingElections, setLoadingElections] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingElections(true);
      try {
        // attempt to fetch elections in 'Registration' status
        const res = await electionService.getAllElections({ status: "Registration" });
        const list = Array.isArray(res) ? res : (res?.elections ?? res);
        if (!mounted) return;
        setAvailableElections(list || []);
      } catch (err) {
        // fallback to upcoming/active fetch
        try {
          const alt = await electionService.getUpcomingElections();
          const altList = Array.isArray(alt) ? alt : (alt?.elections ?? alt);
          if (mounted) setAvailableElections(altList || []);
        } catch {
          if (mounted) setAvailableElections([]);
        }
      } finally {
        if (mounted) setLoadingElections(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (payload) => {
    if (!isAuthenticated) {
      showError("Please connect your wallet / login to register");
      throw new Error("Not authenticated");
    }
    setIsSubmitting(true);
    try {
      // CandidateForm already uploads image and provides imageHash, ensure payload contains electionId
      const res = await candidateService.registerCandidate(payload);
      showSuccess("Registration submitted. Awaiting approval.");
      // navigate to candidate status or election page
      if (payload?.electionId) navigate(`/elections/${payload.electionId}`);
      else navigate("/dashboard");
      return res;
    } catch (err) {
      const msg = err?.message || "Registration failed";
      showError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Register as Candidate</h2>
        <Button variant="outline" size="small" onClick={() => navigate(-1)}>Back</Button>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            <p><strong>Eligibility:</strong> You must meet the election's eligibility criteria and register before the registration deadline.</p>
            <p className="mt-2"><strong>Note:</strong> Submitted candidacy requires authority approval before appearing on the ballot.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Select Election</label>
            <div className="mt-2">
              {loadingElections ? (
                <div className="text-sm text-gray-600">Loading available elections…</div>
              ) : availableElections.length === 0 ? (
                <div className="text-sm text-gray-600">No elections open for candidate registration at this time.</div>
              ) : (
                <select id="selectElection" name="election" className="w-full px-3 py-2 border rounded" defaultValue={availableElections[0]?.electionId ?? availableElections[0]?.id}>
                  {availableElections.map((e) => (
                    <option key={e.electionId ?? e.id} value={e.electionId ?? e.id}>
                      {e.name} — {e.startTime ? new Date(e.startTime).toLocaleString() : "TBD"}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">If multiple elections are open, pick the one you want to contest in. You can only register for one election at a time.</div>
          </div>

          {/* CandidateForm will show election selector if electionId prop not provided.
              We pass onSubmit handler and also forward selected electionId from the select above. */}
          <CandidateForm
            elections={availableElections}
            onSubmit={async (formPayload) => {
              // ensure electionId from select is attached if not provided
              const select = document.getElementById("selectElection");
              const selectedElectionId = select?.value;
              const payload = { ...formPayload, electionId: formPayload.electionId || selectedElectionId };
              return handleSubmit(payload);
            }}
          />

          {isSubmitting && <div className="text-sm text-gray-600">Submitting registration…</div>}
        </div>
      </Card>
    </div>
  );
}
