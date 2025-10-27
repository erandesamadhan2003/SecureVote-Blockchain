import React, { useMemo, useState } from "react";
import CandidateCard from "./CandidateCard.jsx";
import Loading from "../common/Loading.jsx";
import { Search } from "lucide-react";

/**
 * Props:
 * - candidates: array
 * - mode: "view"|"vote"|"manage"|"results"
 * - isLoading: boolean
 * - onCandidateAction: function({ type, candidate }) => void
 */
export default function CandidateList({ candidates = [], mode = "view", isLoading = false, onCandidateAction = () => {} }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const filters = ["All", "Pending", "Approved", "Rejected"];

  const filteredCandidates = useMemo(() => {
    let list = Array.isArray(candidates) ? candidates.slice() : [];

    if (activeFilter && activeFilter !== "All") {
      list = list.filter((c) => String((c.status || "Pending")).toLowerCase() === activeFilter.toLowerCase());
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.party || "").toLowerCase().includes(q));
    }

    if (mode === "results") {
      list.sort((a, b) => (Number(b.voteCount || 0) - Number(a.voteCount || 0)));
    }

    return list;
  }, [candidates, activeFilter, searchQuery, mode]);

  const onSelect = (candidate) => {
    setSelectedId(candidate.candidateId ?? candidate.id ?? candidate._id);
    onCandidateAction({ type: "select", candidate });
  };

  const handleApprove = (candidate) => onCandidateAction({ type: "approve", candidate });
  const handleReject = (candidate) => onCandidateAction({ type: "reject", candidate });

  // small helper (duplicate of CandidateCard resolver) — computes usable image URL
  const resolveImageUrl = (id) => {
    if (!id) return null;
    const s = String(id).trim();
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.slice(7)}`;
    const isLikelyCid = /^Qm[a-zA-Z0-9]{44,}|^bafy/i.test(s);
    const isFilename = /\.(jpe?g|png|gif|webp|svg)$/i.test(s) || s.includes("_") || s.length < 80 && s.includes(".");
    const apiBase = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "") : "http://localhost:3000/api";
    const uploadsBase = apiBase.replace(/\/api\/?$/, "");
    if (isFilename) return `${uploadsBase}/uploads/${encodeURIComponent(s)}`;
    if (isLikelyCid) return `https://ipfs.io/ipfs/${s}`;
    if (s.length < 80) return `${uploadsBase}/uploads/${encodeURIComponent(s)}`;
    return `https://ipfs.io/ipfs/${s}`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 bg-white rounded shadow flex items-center justify-center">
            <Loading size="medium" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {mode === "manage" && filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1 rounded text-sm ${activeFilter === f ? "bg-blue-100" : "hover:bg-gray-100"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search by name or party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded pl-10"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          <div className="text-sm text-gray-600">
            {filteredCandidates.length} candidates
          </div>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="p-6 bg-white rounded shadow text-center text-gray-600">No candidates found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCandidates.map((c) => {
            const img = c.imageUrl || c.imageHash || c.image;
            const resolved = img ? resolveImageUrl(img) : null;
            return (
              <CandidateCard
                key={c.candidateId ?? c.id ?? c._id}
                candidate={c}
                imageUrl={resolved}
                mode={mode}
                isSelected={String(selectedId) === String(c.candidateId ?? c.id ?? c._id)}
                onSelect={onSelect}
                onApprove={() => handleApprove(c)}
                onReject={() => handleReject(c)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
