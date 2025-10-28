import React, { useMemo, useState } from "react";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
import { List, Users, BarChart } from "lucide-react";
import { formatDate, formatNumber, getElectionStatus } from "../../utils/helpers.js";

/**
 * Props:
 * - election: object (may come from DB or on-chain)
 * - onStatusChange: async function(targetStatus) => void
 * - canManage: boolean (show manager controls)
 */
export default function ElectionDetails({ election = {}, onStatusChange = async () => { }, canManage  }) {
    // derive stable fields
    const status = useMemo(() => {
        // prefer explicit string status, else derive from times
        if (!election) return "Unknown";
        if (typeof election.status === "string" && election.status) return election.status;
        // fallback to helper which uses times / deadline
        return getElectionStatus(election);
    }, [election]);


    const creator = election.creator || election.createdBy || election.creatorAddress || null;
    const totalCandidates = election.totalCandidates ?? election.candidatesCount ?? election.candidateIds?.length ?? 0;
    const totalVoters = election.totalVoters ?? election.votersCount ?? election.totalVotersOnChain ?? 0;
    const totalVotes = election.totalVotes ?? 0;
    const turnout = totalVoters ? `${Math.round((Number(totalVotes) / Number(totalVoters || 1)) * 100)}%` : "—";

    // Helper: accept Date, ISO string, or numeric (seconds or ms) and return Date or null
    const parseToDate = (v) => {
        if (!v) return null;
        if (v instanceof Date) return v;
        // numeric value (seconds or milliseconds)
        const n = Number(v);
        if (!Number.isNaN(n)) {
            // if looks like ms (> 1e12) use directly, else treat as seconds
            return n > 1e12 ? new Date(n) : new Date(n * 1000);
        }
        // try ISO/parsing
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const formattedDates = useMemo(() => {
        const startDate = parseToDate(election.startTime);
        const endDate = parseToDate(election.endTime);
        const regDate = parseToDate(election.registrationDeadline);
        return {
            start: startDate ? formatDate(startDate) : "TBD",
            end: endDate ? formatDate(endDate) : "TBD",
            registrationDeadline: regDate ? formatDate(regDate) : "TBD"
        };
    }, [election]);

    const [isChangingStatus, setIsChangingStatus] = useState(false);

    const handleChange = async (target) => {
        try {
            setIsChangingStatus(true);
            await onStatusChange(target);
        } catch (e) {
            // caller will handle toasts; swallow here
            console.error("status change failed:", e);
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
                                    <div className="font-medium">{formatNumber(totalCandidates)}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                                <Users className="w-6 h-6 text-gray-700" />
                                <div>
                                    <div className="text-xs text-gray-500">Registered Voters</div>
                                    <div className="font-medium">{formatNumber(totalVoters)}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                                <BarChart className="w-6 h-6 text-gray-700" />
                                <div>
                                    <div className="text-xs text-gray-500">Votes Cast</div>
                                    <div className="font-medium">{formatNumber(totalVotes)} <span className="text-xs text-gray-500">({turnout} turnout)</span></div>
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
                            {/* timeline component may live here */}
                            {/* ...existing code... */}
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center gap-4 border-b pb-3 mb-3">
                            <nav className="flex gap-2">
                                <button className="px-3 py-1 rounded text-sm bg-blue-100">Overview</button>
                                <button className="px-3 py-1 rounded text-sm hover:bg-gray-100">Candidates</button>
                            </nav>

                            <div className="ml-auto text-xs text-gray-500">Manage controls</div>
                        </div>

                        <div>
                            {/* lifecycle manager controls */}
                            {canManage && (
                                <div className="space-y-2">
                                    {status === "Created" && (
                                        <Button variant="primary" size="medium" onClick={() => handleChange("Registration")} loading={isChangingStatus}>
                                            Start Registration
                                        </Button>
                                    )}

                                    {status === "Registration" && (
                                        <Button variant="primary" size="medium" onClick={() => handleChange("Voting")} loading={isChangingStatus}>
                                            Start Voting
                                        </Button>
                                    )}

                                    {status === "Voting" && (
                                        <Button variant="danger" size="medium" onClick={() => handleChange("Ended")} loading={isChangingStatus}>
                                            End Election
                                        </Button>
                                    )}

                                    {status === "Ended" && (
                                        <Button variant="primary" size="medium" onClick={() => handleChange("ResultDeclared")} loading={isChangingStatus}>
                                            Declare Results
                                        </Button>
                                    )}
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
                </aside>
            </div>
        </div>
    );
}