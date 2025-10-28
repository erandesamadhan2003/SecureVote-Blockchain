import React, { useMemo, useState } from "react";
import Button from "../common/Button.jsx";
import Card from "../common/Card.jsx";
import { formatNumber } from "../../utils/helpers.js";

/**
 * Props:
 * - results: [{ candidateId, name, party, votes, imageHash }]
 * - totalVoters: number
 * - totalVotes: number (optional)
 * - onExportCSV: function(results) optional
 */
export default function     ResultsTable({ results = [], totalVoters = 0, totalVotes = 0, onExportCSV }) {
    const [sortBy, setSortBy] = useState("votes");
    const [sortOrder, setSortOrder] = useState("desc");

    const computedTotalVotes = totalVotes || results.reduce((s, r) => s + Number(r.votes || 0), 0);

    const sorted = useMemo(() => {
        const arr = (results || []).slice();
        arr.sort((a, b) => {
            let va = a[sortBy], vb = b[sortBy];
            if (sortBy === "name" || sortBy === "party") {
                va = String(va || "").toLowerCase();
                vb = String(vb || "").toLowerCase();
                if (va < vb) return sortOrder === "asc" ? -1 : 1;
                if (va > vb) return sortOrder === "asc" ? 1 : -1;
                return 0;
            }
            return sortOrder === "asc" ? (Number(va || 0) - Number(vb || 0)) : (Number(vb || 0) - Number(va || 0));
        });
        return arr;
    }, [results, sortBy, sortOrder]);

    const toggleSort = (col) => {
        if (sortBy === col) setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
        else {
            setSortBy(col);
            setSortOrder(col === "name" ? "asc" : "desc");
        }
    };

    const exportCSV = () => {
        const rows = [
            ["Rank", "Candidate", "Party", "Votes", "Percentage"]
        ];
        sorted.forEach((r, i) => {
            const pct = computedTotalVotes ? ((Number(r.votes || 0) / computedTotalVotes) * 100).toFixed(2) + "%" : "0%";
            rows.push([i + 1, r.name, r.party || "-", r.votes || 0, pct]);
        });
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `results_export_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        if (typeof onExportCSV === "function") onExportCSV(sorted);
    };

    // mobile card rendering
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

    if (!results || results.length === 0) {
        return <div className="p-4 text-center text-gray-600">No results available</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Total votes: <strong>{formatNumber(computedTotalVotes)}</strong></div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="small" onClick={() => { setSortBy("votes"); setSortOrder("desc"); }}>Sort by votes</Button>
                    <Button variant="outline" size="small" onClick={() => { setSortBy("name"); setSortOrder("asc"); }}>Sort by name</Button>
                    <Button variant="primary" size="small" onClick={exportCSV}>Export CSV</Button>
                </div>
            </div>

            {!isMobile ? (
                <div className="overflow-auto bg-white rounded shadow">
                    <table className="min-w-full table-auto">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">#</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Candidate</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Party</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 cursor-pointer" onClick={() => toggleSort("votes")}>Votes</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((r, idx) => {
                                const pct = computedTotalVotes ? ((Number(r.votes || 0) / computedTotalVotes) * 100) : 0;
                                const highlight = idx === 0 ? "bg-yellow-50" : idx === 1 ? "bg-gray-50" : "";
                                return (
                                    <tr key={r.candidateId ?? r.name} className={`${highlight} border-b`}>
                                        <td className="px-4 py-3 text-sm">{idx + 1}</td>
                                        <td className="px-4 py-3 text-sm flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                                                {r.imageHash ? <img src={`https://ipfs.io/ipfs/${r.imageHash}`} alt={r.name} className="object-cover w-full h-full" /> : <div className="text-xs text-gray-400 flex items-center justify-center h-full">No</div>}
                                            </div>
                                            <div>
                                                <div className="font-medium">{r.name}</div>
                                                <div className="text-xs text-gray-500">ID: {r.candidateId}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{r.party || "-"}</td>
                                        <td className="px-4 py-3 text-sm text-right">{formatNumber(r.votes || 0)}</td>
                                        <td className="px-4 py-3 text-sm text-right w-40">
                                            <div className="text-xs text-gray-600 mb-1">{pct.toFixed(2)}%</div>
                                            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                                                <div className="h-2 bg-blue-500" style={{ width: `${pct}%` }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map((r, idx) => {
                        const pct = computedTotalVotes ? ((Number(r.votes || 0) / computedTotalVotes) * 100) : 0;
                        return (
                            <Card key={r.candidateId ?? r.name}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100">
                                            {r.imageHash ? <img src={`https://ipfs.io/ipfs/${r.imageHash}`} alt={r.name} className="object-cover w-full h-full" /> : <div className="text-xs text-gray-400 flex items-center justify-center h-full">No</div>}
                                        </div>
                                        <div>
                                            <div className="font-medium">{r.name}</div>
                                            <div className="text-xs text-gray-500">{r.party}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">{formatNumber(r.votes || 0)}</div>
                                        <div className="text-xs text-gray-600">{pct.toFixed(2)}%</div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <div className="text-sm text-gray-600">Voter turnout: {totalVoters ? ((computedTotalVotes / totalVoters) * 100).toFixed(2) + "%" : "N/A"}</div>
        </div>
    );
}
