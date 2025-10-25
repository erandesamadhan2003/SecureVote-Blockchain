import React from "react";
import Button from "../common/Button.jsx";
import Card from "../common/Card.jsx";
import { formatDate } from "../../utils/helpers.js";

/**
 * Props:
 * - transaction: { txHash, blockNumber, timestamp, gasUsed, explorerUrl? }
 * - electionName
 * - electionEndTime
 * - onViewResults
 * - onBack
 */
export default function VoteSuccess({ transaction = {}, electionName = "", electionEndTime = null, onViewResults = () => { }, onBack = () => { } }) {
    const explorer = transaction.explorerUrl || import.meta.env.VITE_ETHERSCAN_URL || "https://sepolia.etherscan.io";

    const copy = async (txt) => {
        try {
            await navigator.clipboard.writeText(txt);
        } catch { /* ignore */ }
    };

    const canViewResults = () => {
        if (!electionEndTime) return false;
        const end = new Date(electionEndTime).getTime();
        return Date.now() > end;
    };

    return (
        <Card className="p-6 text-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6L9 17l-5-5" strokeWidth="1.5" /></svg>
                </div>

                <h3 className="text-2xl font-semibold">Vote Cast Successfully!</h3>
                <p className="text-sm text-gray-600">Your vote has been recorded on the blockchain.</p>

                <div className="w-full max-w-xl text-left mt-4">
                    <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500">Transaction</div>
                        <div className="flex items-center justify-between mt-1">
                            <div className="font-mono text-sm">{transaction.txHash ?? "—"}</div>
                            <div className="flex items-center gap-2">
                                <button className="text-xs text-blue-600" onClick={() => copy(transaction.txHash)}>Copy</button>
                                {transaction.txHash && <a className="text-xs text-blue-600" href={`${explorer}/tx/${transaction.txHash}`} target="_blank" rel="noreferrer">View on Explorer</a>}
                            </div>
                        </div>

                        <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
                            <div>Block: {transaction.blockNumber ?? "—"}</div>
                            <div>Gas used: {transaction.gasUsed ?? "—"}</div>
                            <div>Timestamp: {transaction.timestamp ? formatDate(new Date(transaction.timestamp)) : "—"}</div>
                            <div>Election: {electionName ?? "—"}</div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-4">
                    <Button variant="primary" size="medium" onClick={onBack}>Back to Elections</Button>
                    <Button variant="outline" size="medium" onClick={onViewResults} disabled={!canViewResults()}>View Results</Button>
                </div>
            </div>
        </Card>
    );
}
