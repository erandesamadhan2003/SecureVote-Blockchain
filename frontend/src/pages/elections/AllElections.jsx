import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ElectionFilters from "../../components/election/ElectionFilters.jsx";
import ElectionList from "../../components/election/ElectionList.jsx";
import Button from "../../components/common/Button.jsx";
import useAuth from "../../hooks/useAuth.js";
import { fetchAllElections, selectAllElections, selectElectionLoading } from "../../redux/slices/electionSlice.js";

export default function AllElections() {
	// auth/role
	const { isManager } = useAuth();

	const dispatch = useDispatch();
	const elections = useSelector(selectAllElections) || [];
	const isLoading = useSelector(selectElectionLoading);

	// filters & pagination
	const [filters, setFilters] = useState({ status: "all", search: "" });
	const [page, setPage] = useState(1);
	const limit = 9;

	useEffect(() => {
		// fetch with filters + pagination
		const payload = { ...filters, page, limit };
		dispatch(fetchAllElections(payload));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dispatch, filters, page]);

	const onFilterChange = (newFilters) => {
		setFilters((f) => ({ ...f, ...newFilters }));
		setPage(1); // reset page when filters change
	};

	return (
		<div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
			<div className=" items-center justify-between">
				<h1 className="text-2xl font-semibold">All Elections</h1>
				{isManager && (
					<Button variant="primary" size="medium" onClick={() => (window.location.href = "/elections/create")}>
						Create Election
					</Button>
				)}
			</div>

			<div className="">
				<div className="mb-12">
					{/* <ElectionFilters initialFilters={filters} onFilterChange={onFilterChange} /> */}
				</div>

				<div className="">
					<ElectionList elections={elections} isLoading={isLoading} showManageButtons={isManager} />

					{/* Simple pagination controls */}
					<div className="mt-4 flex items-center justify-between">
						<div className="text-sm text-gray-600">Page {page}</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="small" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}>
								Previous
							</Button>
							<Button variant="outline" size="small" onClick={() => setPage((p) => p + 1)} disabled={isLoading}>
								Next
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
