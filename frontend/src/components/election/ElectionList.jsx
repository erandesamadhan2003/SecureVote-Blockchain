import React, { useMemo, useState } from "react";
import ElectionCard from "./ElectionCard.jsx";
import Loading from "../common/Loading.jsx";
import Button from "../common/Button.jsx";

/**
 * Props:
 * - elections: array
 * - isLoading: boolean
 * - showManageButtons: boolean
 */
export default function ElectionList({ elections = [], isLoading = false, showManageButtons = false }) {
    const [view, setView] = useState("grid"); // 'grid' | 'list'
    const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'oldest' | 'name'
    const [visibleCount, setVisibleCount] = useState(9);

    const sorted = useMemo(() => {
        if (!Array.isArray(elections)) return [];
        const copy = [...elections];
        if (sortBy === "name") {
            copy.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        } else if (sortBy === "oldest") {
            copy.sort((a, b) => new Date(a.startTime || a.createdAt || 0) - new Date(b.startTime || b.createdAt || 0));
        } else {
            // newest
            copy.sort((a, b) => new Date(b.startTime || b.createdAt || 0) - new Date(a.startTime || a.createdAt || 0));
        }
        return copy;
    }, [elections, sortBy]);

    const visible = sorted.slice(0, visibleCount);

    const onLoadMore = () => setVisibleCount((c) => c + 9);

    // skeletons
    if (isLoading && (!elections || elections.length === 0)) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-4 bg-white rounded shadow">
                        <Loading size="large" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">View:</div>
                    <button onClick={() => setView("grid")} className={`px-2 py-1 rounded ${view === "grid" ? "bg-gray-200" : "hover:bg-gray-100"}`}>Grid</button>
                    <button onClick={() => setView("list")} className={`px-2 py-1 rounded ${view === "list" ? "bg-gray-200" : "hover:bg-gray-100"}`}>List</button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">Sort:</div>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-2 py-1 border rounded">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name">Name (A-Z)</option>
                    </select>
                </div>
            </div>

            {visible.length === 0 ? (
                <div className="p-6 bg-white rounded shadow text-center text-gray-600">
                    {isLoading ? "Loading elections..." : "No elections found."}
                </div>
            ) : view === "list" ? (
                <div className="space-y-4">
                    {visible.map((e) => (
                        <div key={e.electionId ?? e.id} className="bg-white rounded shadow p-4">
                            <ElectionCard election={e} showManageButton={showManageButtons} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map((e) => (
                        <ElectionCard key={e.electionId ?? e.id} election={e} showManageButton={showManageButtons} />
                    ))}
                </div>
            )}

            {/* load more / loading indicator */}
            <div className="flex items-center justify-center mt-4">
                {isLoading ? (
                    <Loading size="small" />
                ) : visibleCount < sorted.length ? (
                    <Button variant="primary" size="medium" onClick={onLoadMore}>Load more</Button>
                ) : null}
            </div>
        </div>
    );
}
