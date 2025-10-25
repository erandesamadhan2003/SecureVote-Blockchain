import React from "react";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
import Loading from "../common/Loading.jsx";
import { truncateText, formatNumber } from "../../utils/helpers.js";
import { CheckCircle, User, BarChart } from "lucide-react";

/**
 * Props:
 * - candidate: object
 * - mode: "view" | "vote" | "manage" | "results"
 * - isSelected: boolean
 * - onSelect: (candidate) => void
 * - onApprove: (candidate) => void
 * - onReject: (candidate) => void
 */
export default function CandidateCard({
    candidate = {},
    mode = "view",
    isSelected = false,
    onSelect = () => { },
    onApprove = () => { },
    onReject = () => { }
}) {
    const name = candidate.name || "Unnamed";
    const party = candidate.party || "Independent";
    const manifesto = candidate.manifesto || "";
    const image = candidate.imageHash ? `https://ipfs.io/ipfs/${candidate.imageHash}` : null;
    const status = candidate.status || "Pending";
    const votes = Number(candidate.voteCount ?? 0);
    const totalVotes = Number(candidate.totalVotes ?? candidate.totalVotesOnElection ?? 0);
    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

    return (
        <Card className="transform hover:scale-[1.01] transition-transform hover:shadow-lg">
            <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {image ? (
                        // eslint-disable-next-line jsx-a11y/img-redundant-alt
                        <img src={image} alt={`${name} photo`} className="object-cover w-full h-full" />
                    ) : (
                        <div className="flex flex-col items-center text-gray-600">
                            <User className="w-8 h-8" />
                            <div className="text-xs mt-1">{(name || "U")[0]?.toUpperCase()}</div>
                        </div>
                    )}
                </div>

                <h3 className="mt-3 text-lg font-semibold">{name}</h3>
                <div className="text-sm text-gray-500">{party}</div>

                {status && status !== "Approved" && mode !== "results" && (
                    <div className="mt-2 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {status}
                    </div>
                )}

                <p className="mt-3 text-sm text-gray-700">{truncateText(manifesto, 160)}</p>

                <div className="w-full mt-4 flex items-center justify-center gap-3">
                    {mode === "vote" && (
                        <>
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="selectedCandidate"
                                    checked={isSelected}
                                    onChange={() => onSelect(candidate)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">{isSelected ? "Selected" : "Select"}</span>
                            </label>
                            <Button variant="primary" size="small" onClick={() => onSelect(candidate)}>
                                Vote
                            </Button>
                        </>
                    )}

                    {mode === "manage" && (
                        <>
                            <Button variant="primary" size="small" onClick={() => onApprove(candidate)}>
                                Approve
                            </Button>
                            <Button variant="danger" size="small" onClick={() => onReject(candidate)}>
                                Reject
                            </Button>
                        </>
                    )}

                    {mode === "results" && (
                        <div className="w-full">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                                <div className="flex items-center gap-2"><BarChart className="w-4 h-4" /> <span>{formatNumber(votes)} votes</span></div>
                                <div className="text-sm font-medium">{pct}%</div>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <div className="h-2 bg-green-500" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    )}

                    {mode === "view" && (
                        <Button variant="outline" size="small" onClick={() => onSelect(candidate)}>Read More</Button>
                    )}
                </div>
            </div>
        </Card>
    );
}
