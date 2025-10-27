import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
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
    onReject = () => { },
    imageUrl: propImageUrl // new optional prop
}) {
    const name = candidate.name || "Unnamed";
    const party = candidate.party || "Independent";
    const manifesto = candidate.manifesto || "";
    const [imageError, setImageError] = useState(false);

    // Resolve an image identifier into a usable URL:
    // - If propImageUrl provided, use it.
    // - If starts with http(s) use as-is.
    // - If starts with ipfs:// -> ipfs.io gateway
    // - If looks like an uploaded filename (has extension or underscores) -> backend /uploads/<filename>
    // - Otherwise assume IPFS CID and use ipfs.io gateway
    const resolveImageUrl = (id) => {
        if (!id) return null;
        const s = String(id).trim();
        if (s.startsWith("http://") || s.startsWith("https://")) return s;
        if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.slice(7)}`;

        // common CID prefixes: Qm... or bafy...
        const isLikelyCid = /^Qm[a-zA-Z0-9]{44,}|^bafy/i.test(s);
        const isFilename = /\.(jpe?g|png|gif|webp|svg)$/i.test(s) || s.includes("_") || s.length < 80 && s.includes(".");

        const apiBase = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "") : "http://localhost:3000/api";
        const uploadsBase = apiBase.replace(/\/api\/?$/, "");

        if (isFilename) {
            // treat as backend uploads filename
            return `${uploadsBase}/uploads/${encodeURIComponent(s)}`;
        }
        if (isLikelyCid) {
            return `https://ipfs.io/ipfs/${s}`;
        }
        // fallback: if short string without extension assume it's probably a filename - route to uploads
        if (s.length < 80) return `${uploadsBase}/uploads/${encodeURIComponent(s)}`;
        // last resort treat as ipfs CID
        return `https://ipfs.io/ipfs/${s}`;
    };

    const imageSrc = useMemo(() => {
        if (propImageUrl) return propImageUrl;
        return resolveImageUrl(candidate.imageHash || candidate.image || candidate.imageUrl);
    }, [propImageUrl, candidate.imageHash, candidate.image, candidate.imageUrl]);

    const status = candidate.status || "Pending";
    const votes = Number(candidate.voteCount ?? 0);
    const totalVotes = Number(candidate.totalVotes ?? candidate.totalVotesOnElection ?? 0);
    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

    return (
        <Card className="transform hover:scale-[1.01] transition-transform hover:shadow-lg">
            <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {imageSrc && !imageError ? (
                        // eslint-disable-next-line jsx-a11y/img-redundant-alt
                        <img
                            src={imageSrc}
                            alt={`${name} photo`}
                            className="object-cover w-full h-full"
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="flex flex-col items-center text-gray-600">
                            <User className="w-8 h-8" />
                            <div className="text-xs mt-1">{(name || "U")[0]?.toUpperCase()}</div>
                        </div>
                    )}
                </div>

                {/* link to candidate profile; prefer on-chain id or DB _id */}
                <h3 className="mt-3 text-lg font-semibold">
                    <Link to={`/candidates/${encodeURIComponent(candidate.candidateId ?? candidate._id ?? candidate.id ?? "")}`} className="hover:underline">
                        {name}
                    </Link>
                </h3>

                <div className="text-sm text-gray-500">{party}</div>

                {/* show on-chain candidateId when available (helps debug mapping between DB and chain) */}
                {candidate.candidateId && (
                    <div className="text-xs text-gray-400 mt-1">On-chain id: #{String(candidate.candidateId)}</div>
                )}

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
                            {/* disable when we don't have any resolvable identifier (no on-chain id and no wallet address) */}
                            <Button
                                variant="primary"
                                size="small"
                                onClick={() => onApprove(candidate)}
                                disabled={!(candidate.candidateId || candidate.walletAddress || candidate.candidateAddress)}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="danger"
                                size="small"
                                onClick={() => onReject(candidate)}
                                disabled={!(candidate.candidateId || candidate.walletAddress || candidate.candidateAddress)}
                            >
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
