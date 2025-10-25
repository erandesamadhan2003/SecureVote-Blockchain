import React, { useState, useEffect } from "react";
import Button from "../common/Button.jsx";

/**
 * Props:
 * - onFilterChange: (filters) => void
 * - initialFilters: { status, search, from, to }
 */
export default function ElectionFilters({ onFilterChange = () => { }, initialFilters = {} }) {
    const [filters, setFilters] = useState({
        status: initialFilters.status || "all",
        search: initialFilters.search || "",
        from: initialFilters.from || "",
        to: initialFilters.to || ""
    });

    useEffect(() => {
        setFilters({
            status: initialFilters.status || "all",
            search: initialFilters.search || "",
            from: initialFilters.from || "",
            to: initialFilters.to || ""
        });
    }, [initialFilters]);

    const apply = () => {
        onFilterChange({ ...filters });
    };

    const clear = () => {
        const cleared = { status: "all", search: "", from: "", to: "" };
        setFilters(cleared);
        onFilterChange(cleared);
    };

    const statusTabs = [
        { key: "all", label: "All" },
        { key: "ongoing", label: "Ongoing" },
        { key: "upcoming", label: "Upcoming" },
        { key: "completed", label: "Completed" }
    ];

    return (
        <div className="bg-white p-4 rounded shadow space-y-3">
            <div className="flex items-center gap-2">
                {statusTabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setFilters((s) => ({ ...s, status: t.key }))}
                        className={`px-3 py-1 rounded text-sm ${filters.status === t.key ? "bg-blue-100" : "hover:bg-gray-100"}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Search elections..."
                    value={filters.search}
                    onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded"
                />
                <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))}
                    className="px-3 py-2 border rounded"
                    title="From date"
                />
                <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))}
                    className="px-3 py-2 border rounded"
                    title="To date"
                />
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="small" onClick={clear}>Clear</Button>
                <Button variant="primary" size="small" onClick={apply}>Apply</Button>
            </div>
        </div>
    );
}
