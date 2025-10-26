import React, { useMemo, useState } from "react";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
import ElectionTimeline from "./ElectionTimeline.jsx";
import useAuth from "../../hooks/useAuth.js";
import { formatDate, getElectionStatus } from "../../utils/helpers.js";
import { Trophy, Users, List, BarChart } from "lucide-react";

/**
 * Props:
 *  - election: object
 *  - onStatusChange: async function(newStatus) => Promise
 */
export default function ElectionDetails({ election = {}, onStatusChange = async () => { } }) {
    const { isManager, isAuthority, isSuperAdmin, wallet } = useAuth();
    const [activeTab, setActiveTab] = useState("overview"); // overview | candidates | voters | results
    const [isChangingStatus, setIsChangingStatus] = useState(false);
    const creator = (election.creator || election.creatorAddress || election.creatorWallet) ?? null;
    const currentUserAddress = wallet?.walletAddress ?? wallet?.walletAddress ?? null;
    const isCreator = creator && currentUserAddress && String(creator).toLowerCase() === String(currentUserAddress).toLowerCase();
    const canManage = isSuperAdmin || isManager || isAuthority || isCreator;

    const totalCandidates = Number(election.totalCandidates ?? election.candidatesCount ?? 0);
    const totalVoters = Number(election.totalVoters ?? election.registeredVoters ?? 0);
    const totalVotes = Number(election.totalVotes ?? election.votes ?? 0);
    const turnout = totalVoters > 0 ? `${((totalVotes / totalVoters) * 100).toFixed(2)}%` : "0.00%";

    // prefer explicit status from backend; fallback to heuristic helper
    const status = election.status || election._status || getElectionStatus(election) || "Created";

    const formattedDates = useMemo(() => ({
        start: election.startTime ? formatDate(new Date(election.startTime)) : "TBD",
        end: election.endTime ? formatDate(new Date(election.endTime)) : "TBD",
        registrationDeadline: election.registrationDeadline ? formatDate(new Date(election.registrationDeadline)) : "TBD"
    }), [election]);

    const handleStatusChange = async (target) => {
        if (typeof onStatusChange !== "function") return;
        try {
            setIsChangingStatus(true);
            await onStatusChange(target);
        } catch (err) {
            console.error("Status change failed:", err);
        } finally {
            setIsChangingStatus(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">{election.name || "Untitled Election"}</h1>
                                <p className="text-sm text-gray-600 mt-1">{election.description || "No description provided."}</p>
                            </div>

                            <div className="text-right space-y-1">
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm font-medium">
                                    <span className="mr-2 text-xs">Status</span>
                                    <span className="text-sm font-semibold">{status}</span>
                                </div>

                                <div className="text-xs text-gray-500 mt-2">
                                    Creator: <span className="font-mono text-xs">{creator ? String(creator).slice(0, 6) + "..." + String(creator).slice(-4) : "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                                <List className="w-6 h-6 text-gray-700" />
                                <div>
                                    <div className="text-xs text-gray-500">Candidates</div>
                                    <div className="font-medium">{totalCandidates}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                                <Users className="w-6 h-6 text-gray-700" />
                                <div>
                                    <div className="text-xs text-gray-500">Registered Voters</div>
                                    <div className="font-medium">{totalVoters}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                                <BarChart className="w-6 h-6 text-gray-700" />
                                <div>
                                    <div className="text-xs text-gray-500">Votes Cast</div>
                                    <div className="font-medium">{totalVotes} <span className="text-xs text-gray-500">({turnout} turnout)</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium">Timeline</h3>
                                <div className="text-xs text-gray-500">
                                    Registration deadline: {formattedDates.registrationDeadline}
                                </div>
                            </div>

                            <div className="text-xs text-gray-500">
                                Start: {formattedDates.start}<br />End: {formattedDates.end}
                            </div>
                        </div>

                        <div className="mt-4">
                            <ElectionTimeline election={{
                                createdAt: election.createdAt || election.createdAt,
                                registrationDeadline: election.registrationDeadline,
                                startTime: election.startTime,
                                endTime: election.endTime
                            }} />
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-4 border-b pb-3 mb-3">
                            <nav className="flex gap-2">
                                <button onClick={() => setActiveTab("overview")} className={`px-3 py-1 rounded text-sm ${activeTab === "overview" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Overview</button>
                                <button onClick={() => setActiveTab("candidates")} className={`px-3 py-1 rounded text-sm ${activeTab === "candidates" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Candidates</button>
                                {(canManage) && <button onClick={() => setActiveTab("voters")} className={`px-3 py-1 rounded text-sm ${activeTab === "voters" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Voters</button>}
                                {(status === "Ended" || status === "ResultDeclared") && <button onClick={() => setActiveTab("results")} className={`px-3 py-1 rounded text-sm ${activeTab === "results" ? "bg-blue-100" : "hover:bg-gray-100"}`}>Results</button>}
                            </nav>

                            <div className="ml-auto text-xs text-gray-500">{/* placeholder for small info */}</div>
                        </div>

                        <div>
                            {activeTab === "overview" && (
                                <div className="prose text-sm">
                                    <p>{election.longDescription || election.description || "No additional overview available."}</p>
                                </div>
                            )}

                            {activeTab === "candidates" && (
                                <div>
                                    {/* Expect parent to pass candidate list separately; show placeholder */}
                                    <p className="text-sm text-gray-600">Candidates list will be shown here.</p>
                                </div>
                            )}

                            {activeTab === "voters" && canManage && (
                                <div>
                                    <p className="text-sm text-gray-600">Voter management and registration details are available to managers/authorities.</p>
                                </div>
                            )}

                            {activeTab === "results" && (status === "Ended" || status === "ResultDeclared") && (
                                <div>
                                    <p className="text-sm text-gray-600">Results and analytics are available here.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <aside className="space-y-4">
                    <Card>
                        <h3 className="text-sm font-medium mb-3">Quick Info</h3>
                        <div className="text-sm text-gray-700 space-y-2">
                            <div><strong>Election ID:</strong> {election.electionId ?? election.id ?? "—"}</div>
                            <div><strong>Creator:</strong> {creator ? creator : "—"}</div>
                            <div><strong>Created:</strong> {election.createdAt ? formatDate(new Date(election.createdAt)) : "—"}</div>
                        </div>
                    </Card>

                    {canManage && (
                        <Card>
                            <h3 className="text-sm font-medium mb-3">Manager Controls</h3>
                            <div className="space-y-2">
                                {status === "Created" && (
                                    <Button variant="primary" size="medium" onClick={() => handleStatusChange("Registration")} loading={isChangingStatus}>
                                        Start Registration
                                    </Button>
                                )}

                                {status === "Registration" && (
                                    <Button variant="primary" size="medium" onClick={() => handleStatusChange("Voting")} loading={isChangingStatus}>
                                        Start Voting
                                    </Button>
                                )}

                                {status === "Voting" && (
                                    <Button variant="danger" size="medium" onClick={() => handleStatusChange("Ended")} loading={isChangingStatus}>
                                        End Election
                                    </Button>
                                )}

                                {status === "Ended" && (
                                    <Button variant="primary" size="medium" onClick={() => handleStatusChange("ResultDeclared")} loading={isChangingStatus}>
                                        Declare Results
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )}
                </aside>
            </div>
        </div>
    );
}
