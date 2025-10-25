import React from "react";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
import { formatNumber } from "../../utils/helpers.js";

/**
 * Props:
 * - winner: { candidateId, name, party, votes, imageHash }
 * - runnerUp: same shape (optional)
 * - totalVotes: number
 */
export default function WinnerCard({ winner = {}, runnerUp = null, totalVotes = 0, onShare }) {
    const votes = Number(winner.votes || 0);
    const pct = totalVotes ? ((votes / totalVotes) * 100).toFixed(2) : "0.00";
    const margin = runnerUp ? (votes - Number(runnerUp.votes || 0)) : null;
    const marginPct = totalVotes ? (margin ? ((margin / totalVotes) * 100).toFixed(2) : "0.00") : "0.00";

    return (
        <Card className="p-6 bg-gradient-to-r from-yellow-100 to-white">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                    <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-yellow-400 shadow-lg">
                        {winner.imageHash ? <img src={`https://ipfs.io/ipfs/${winner.imageHash}`} alt={winner.name} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-yellow-700">No photo</div>}
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-3">
                        <div className="text-2xl font-bold">{winner.name}</div>
                        <div className="px-2 py-1 rounded-full bg-yellow-300 text-xs font-semibold">WINNER</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-2">{winner.party}</div>

                    <div className="mt-4 flex items-center gap-6">
                        <div>
                            <div className="text-xs text-gray-500">Total votes</div>
                            <div className="text-xl font-semibold">{formatNumber(votes)}</div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500">Share</div>
                            <div className="text-xl font-semibold">{pct}%</div>
                        </div>

                        {margin != null && (
                            <div>
                                <div className="text-xs text-gray-500">Winning margin</div>
                                <div className="text-sm font-medium">{formatNumber(margin)} votes ({marginPct}%)</div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                        <Button variant="primary" size="medium" onClick={() => onShare && onShare(winner)}>Share Results</Button>
                        <Button variant="outline" size="medium" onClick={() => window.print()}>Print</Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
