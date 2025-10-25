import React from "react";
import { Link } from "react-router-dom";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
import { formatDate, calculateTimeRemaining, truncateText, truncateAddress } from "../../utils/helpers.js";
import { Calendar, Clock, Users, List, BarChart } from "lucide-react";

/**
 * Props:
 *  - election: object (expects fields: id/electionId, name, description, startTime, endTime, creator, status, totalCandidates, totalVotes, totalVoters)
 *  - showManageButton: boolean
 */
export default function ElectionCard({ election = {}, showManageButton = false }) {
    const id = election.electionId ?? election.id ?? "";
    const title = election.name || "Untitled Election";
    const desc = election.description || "";
    const start = election.startTime ? new Date(election.startTime) : null;
    const end = election.endTime ? new Date(election.endTime) : null;
    const status = election.status || "Created";
    const candidatesCount = election.totalCandidates ?? election.candidatesCount ?? 0;
    const votersCount = election.totalVoters ?? election.votersCount ?? 0;
    const votesCount = election.totalVotes ?? 0;

    // progress percentage for ongoing elections
    let progressPct = 0;
    if (start && end) {
        const now = Date.now();
        const total = end.getTime() - start.getTime();
        const elapsed = Math.max(0, Math.min(now - start.getTime(), total));
        progressPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
    }

    const statusColor = {
        Created: "bg-gray-200 text-gray-800",
        Registration: "bg-yellow-100 text-yellow-800",
        Voting: "bg-blue-100 text-blue-800",
        Ended: "bg-green-100 text-green-800",
        ResultDeclared: "bg-indigo-100 text-indigo-800"
    }[status] || "bg-gray-100 text-gray-800";

    return (
        <Card
            title={null}
            className="relative overflow-hidden"
            footer={null}
        >
            <div className="flex justify-between items-start">
                <div className="pr-4 flex-1">
                    <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>{status}</div>
                    </div>

                    <p className="mt-2 text-sm text-gray-700 leading-5">
                        {truncateText(desc, 180)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 items-center">
                        <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                                {start ? formatDate(start) : "TBD"} — {end ? formatDate(end) : "TBD"}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{start && end ? calculateTimeRemaining(end) : "—"}</span>
                        </div>
                    </div>

                    {status === "Voting" && start && end && (
                        <div className="mt-3">
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-2 bg-blue-500" style={{ width: `${progressPct}%` }} />
                            </div>
                            <div className="mt-1 text-xs text-gray-500">{progressPct}% complete</div>
                        </div>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <List className="w-4 h-4 text-gray-600" />
                            <div>
                                <div className="text-xs text-gray-500">Candidates</div>
                                <div className="font-medium text-gray-800">{candidatesCount}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <div>
                                <div className="text-xs text-gray-500">Voters</div>
                                <div className="font-medium text-gray-800">{votersCount}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <BarChart className="w-4 h-4 text-gray-600" />
                            <div>
                                <div className="text-xs text-gray-500">Votes</div>
                                <div className="font-medium text-gray-800">{votesCount}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end space-y-3">
                    <Link to={`/elections/${id}`}>
                        <Button variant="primary" size="small">View Details</Button>
                    </Link>

                    {showManageButton && (
                        <Link to={`/elections/${id}/manage`}>
                            <Button variant="outline" size="small">Manage</Button>
                        </Link>
                    )}
                </div>
            </div>
        </Card>
    );
}
