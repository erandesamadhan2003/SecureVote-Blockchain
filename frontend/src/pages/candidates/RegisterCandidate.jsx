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
    const { isAuthenticated, wallet } = useAuth();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const [availableElections, setAvailableElections] = useState([]);
    const [loadingElections, setLoadingElections] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // track selected election and its on-chain/backend status
    const [selectedElectionId, setSelectedElectionId] = useState("");
    const [selectedElectionStatus, setSelectedElectionStatus] = useState(null);
    const [electionStatusLoading, setElectionStatusLoading] = useState(false);

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
                // set default selected election id if not provided
                if ((list?.length ?? 0) > 0 && !selectedElectionId) {
                    const first = list[0];
                    const id = first.electionId ?? first.id ?? first.contractAddress;
                    setSelectedElectionId(id);
                }
            } catch (err) {
                // fallback to upcoming/active fetch
                try {
                    const alt = await electionService.getUpcomingElections();
                    const altList = Array.isArray(alt) ? alt : (alt?.elections ?? alt);
                    if (mounted) setAvailableElections(altList || []);
                    if ((altList?.length ?? 0) > 0 && !selectedElectionId) {
                        const first = altList[0];
                        const id = first.electionId ?? first.id ?? first.contractAddress;
                        setSelectedElectionId(id);
                    }
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

    // load selected election details (status) when selection changes
    useEffect(() => {
        let mounted = true;
        const loadStatus = async () => {
            if (!selectedElectionId) {
                setSelectedElectionStatus(null);
                return;
            }
            setElectionStatusLoading(true);
            try {
                const res = await electionService.getElectionById(selectedElectionId).catch(() => null);
                const e = res?.election ?? res ?? null;
                if (!mounted) return;
                // normalized status: prefer explicit string status else derive
                const status = e?.status ?? e?._status ?? null;
                setSelectedElectionStatus(status ? String(status) : null);
            } catch (e) {
                if (mounted) setSelectedElectionStatus(null);
            } finally {
                if (mounted) setElectionStatusLoading(false);
            }
        };
        loadStatus();
        return () => { mounted = false; };
    }, [selectedElectionId]);

    const handleSubmit = async (payload) => {
        if (!isAuthenticated) {
            showError("Please connect your wallet / login to register");
            throw new Error("Not authenticated");
        }
        setIsSubmitting(true);
        try {
            // ensure we have an election id from the select if not present in payload
            const electionToUse = payload?.electionId || selectedElectionId;
            if (!electionToUse) {
                throw new Error("Please select an election");
            }

            // client-side guard: only allow registering during Registration phase
            // normalize check: many backends return "Registration" or similar
            if (selectedElectionStatus && String(selectedElectionStatus).toLowerCase() !== "registration") {
                throw new Error("Selected election is not accepting candidate registrations at this time");
            }

            // final safety: if we couldn't determine status client-side, attempt a lightweight fetch
            if (!selectedElectionStatus) {
                const check = await electionService.getElectionById(electionToUse).catch(() => null);
                const chk = check?.election ?? check ?? null;
                const s = chk?.status ?? chk?._status ?? null;
                if (s && String(s).toLowerCase() !== "registration") {
                    throw new Error("Selected election is not accepting candidate registrations at this time");
                }
            }

            // CandidateForm already uploads image and provides imageHash, ensure payload contains electionId
            // Also include connected wallet address if CandidateForm did not include it
            const finalPayload = {
                ...payload,
                electionId: payload.electionId || selectedElectionId,
                walletAddress: payload.walletAddress || (wallet?.walletAddress) || undefined
            };
            const res = await candidateService.registerCandidate(finalPayload);
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
                                <select
                                    id="selectElection"
                                    name="election"
                                    className="w-full px-3 py-2 border rounded"
                                    value={selectedElectionId}
                                    onChange={(ev) => setSelectedElectionId(ev.target.value)}
                                >
                                    {availableElections.map((e) => (
                                        <option key={e.electionId ?? e.id} value={e.electionId ?? e.id}>
                                            {e.name} — {e.startTime ? new Date(e.startTime).toLocaleString() : "TBD"}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">If multiple elections are open, pick the one you want to contest in. You can only register for one election at a time.</div>

                        {/* show status of selected election */}
                        {selectedElectionId && (
                            <div className="mt-2 text-sm">
                                {electionStatusLoading ? (
                                    <span className="text-gray-500">Checking election status…</span>
                                ) : selectedElectionStatus ? (
                                    <span className={`font-medium ${String(selectedElectionStatus).toLowerCase() === "registration" ? "text-green-600" : "text-yellow-700"}`}>
                                        Status: {selectedElectionStatus}
                                    </span>
                                ) : (
                                    <span className="text-gray-500">Status: unknown</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CandidateForm will show election selector if electionId prop not provided.
              We pass onSubmit handler and also forward selected electionId from the select above. */}
                    <CandidateForm
                        elections={availableElections}
                        onSubmit={async (formPayload) => {
                            // ensure electionId from select is attached if not provided
                            const selectedElectionIdNow = selectedElectionId || (availableElections[0]?.electionId ?? availableElections[0]?.id);
                            const payload = { ...formPayload, electionId: formPayload.electionId || selectedElectionIdNow };
                            return handleSubmit(payload);
                        }}
                    />

                    {isSubmitting && <div className="text-sm text-gray-600">Submitting registration…</div>}
                </div>
            </Card>
        </div>
    );
}
