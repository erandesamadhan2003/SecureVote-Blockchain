import React from "react";
import { Link } from "react-router-dom";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
import { formatDate, truncateText } from "../../utils/helpers.js";

/**
 * Minimal election card used in lists
 * Props: election, showManageButton
 */
export default function ElectionCard({ election = {}, showManageButton = false }) {
    const name = election.name || "Untitled Election";
    const description = election.description || "";
    const start = election.startTime ? formatDate(election.startTime) : "TBD";
    const end = election.endTime ? formatDate(election.endTime) : "TBD";
    const candidates = election.totalCandidates ?? election.candidatesCount ?? (election.candidateIds ? election.candidateIds.length : 0);

    const idForLink = election.electionId ?? election.id ?? election._id ?? "";

    return (
        <Card className="p-4">
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-semibold">
                            <Link to={`/elections/${encodeURIComponent(idForLink)}`} className="hover:underline">{name}</Link>
                        </h3>
                        <div className="text-xs text-gray-500 mt-1">{truncateText(description, 120)}</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        <div>Start: <span className="font-medium text-gray-700">{start}</span></div>
                        <div className="mt-1">End: <span className="font-medium text-gray-700">{end}</span></div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between mt-auto">
                    <div className="text-sm text-gray-600">Candidates: <span className="font-medium">{candidates}</span></div>
                    <div className="flex items-center gap-2">
                        <Link to={`/elections/${encodeURIComponent(idForLink)}`}>
                            <Button variant="outline" size="small">View</Button>
                        </Link>
                        {showManageButton && (
                            <Link to={`/elections/${encodeURIComponent(idForLink)}/manage`}>
                                <Button variant="primary" size="small">Manage</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
