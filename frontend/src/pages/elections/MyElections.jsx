import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import ElectionList from "../../components/election/ElectionList.jsx";
import useAuth from "../../hooks/useAuth.js";
import { fetchMyElections, selectMyElections, selectElectionLoading } from "../../redux/slices/electionSlice.js";
import { getElectionStatus } from "../../utils/helpers.js";

export default function MyElections() {
    const { isManager, isSuperAdmin, isAuthenticated } = useAuth(); // include isAuthenticated
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const myElections = useSelector(selectMyElections) || [];
    const isLoading = useSelector(selectElectionLoading);

    const [filter, setFilter] = useState("All"); // All | Active | Upcoming | Completed

    useEffect(() => {
        // fetch only when user is authenticated and has manager or super-admin role
        if (isAuthenticated && (isManager || isSuperAdmin)) {
            dispatch(fetchMyElections());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, isManager, isSuperAdmin, isAuthenticated]);

    const filtered = useMemo(() => {
        if (!Array.isArray(myElections)) return [];
        if (filter === "All") return myElections;
        return myElections.filter((e) => {
            const status = (String(e.status || getElectionStatus(e) || "")).toLowerCase();
            if (filter === "Active") return status === "voting";
            if (filter === "Upcoming") return status === "created" || status === "registration";
            if (filter === "Completed") return status === "ended" || status === "resultdeclared" || status === "result declared";
            return true;
        });
    }, [myElections, filter]);

    // require authentication + manager or super-admin role
    if (!isAuthenticated || (!isManager && !isSuperAdmin)) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <Card>
                    <h2 className="text-lg font-semibold">My Elections</h2>
                    <p className="mt-2 text-sm text-gray-600">You do not have permission to view this page.</p>
                    <div className="mt-4">
                        <Button variant="outline" size="small" onClick={() => navigate(-1)}>Go Back</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">My Elections</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="small" onClick={() => setFilter("All")} className={filter === "All" ? "bg-blue-50" : ""}>All</Button>
                    <Button variant="outline" size="small" onClick={() => setFilter("Active")} className={filter === "Active" ? "bg-blue-50" : ""}>Active</Button>
                    <Button variant="outline" size="small" onClick={() => setFilter("Upcoming")} className={filter === "Upcoming" ? "bg-blue-50" : ""}>Upcoming</Button>
                    <Button variant="outline" size="small" onClick={() => setFilter("Completed")} className={filter === "Completed" ? "bg-blue-50" : ""}>Completed</Button>
                    {/* fixed route */}
                    <Button variant="primary" size="medium" onClick={() => navigate("/elections/create")}>Create Election</Button>
                </div>
            </div>

            <Card>
                {isLoading ? (
                    <div className="p-6 text-center text-sm text-gray-600">Loading elections…</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="text-xl font-medium text-gray-700">No elections yet</div>
                        <div className="mt-2 text-sm text-gray-500">You have not created any elections. Create your first election to get started.</div>
                        <div className="mt-4">
                            <Button variant="primary" size="medium" onClick={() => navigate("/elections/create")}>Create Election</Button>
                        </div>
                    </div>
                ) : (
                    <ElectionList elections={filtered} isLoading={isLoading} showManageButtons={true} />
                )}
            </Card>
        </div>
    );
}
