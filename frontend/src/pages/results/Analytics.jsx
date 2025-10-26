import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import VoteChart from "../../components/results/VoteChart.jsx";
import electionService from "../../services/electionService.js";
import api from "../../services/api.js";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";
import { formatDate, formatNumber } from "../../utils/helpers.js";

export default function Analytics() {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { isManager, isAuthority } = useAuth();
  const { showError } = useToast();

  const [election, setElection] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [range, setRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isManager && !isAuthority) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const e = await electionService.getElectionById(electionId).catch(() => null);
        if (!mounted) return;
        setElection(e?.election ?? e ?? null);
        const a = await api.get(`/results/${electionId}/analytics`).catch(() => null);
        if (!mounted) return;
        setAnalytics(a || null);
      } catch (err) {
        showError(err?.message || "Failed to load analytics");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [electionId, isManager, isAuthority, showError]);

  const overview = useMemo(() => {
    if (!analytics) return { totalVotes: 0, peakHour: "-", topCandidates: [] };
    return {
      totalVotes: analytics.totalVotes || 0,
      peakHour: analytics.peakHour || "-",
      topCandidates: analytics.candidates?.slice(0, 3) || []
    };
  }, [analytics]);

  if (!isManager && !isAuthority) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card>
          <h2 className="text-lg font-semibold">Election Analytics</h2>
          <p className="mt-2 text-sm text-gray-600">You do not have permission to view analytics.</p>
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
        <div>
          <h1 className="text-2xl font-semibold">Election Analytics</h1>
          <div className="text-sm text-gray-600">{election?.name}</div>
        </div>

        <div className="flex items-center gap-2">
          <input type="date" value={range.from} onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))} className="px-2 py-1 border rounded" />
          <input type="date" value={range.to} onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))} className="px-2 py-1 border rounded" />
          <Button variant="primary" size="small" onClick={() => {
            // re-fetch analytics with date range
            (async () => {
              setLoading(true);
              try {
                const res = await api.get(`/results/${electionId}/analytics?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
                setAnalytics(res || null);
              } catch (err) {
                showError(err?.message || "Failed to filter analytics");
              } finally {
                setLoading(false);
              }
            })();
          }}>Apply</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-medium">Overview</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded text-center">
              <div className="text-xs text-gray-500">Total Votes</div>
              <div className="text-xl font-semibold mt-1">{formatNumber(overview.totalVotes)}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded text-center">
              <div className="text-xs text-gray-500">Peak Hour</div>
              <div className="text-xl font-semibold mt-1">{overview.peakHour}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded text-center">
              <div className="text-xs text-gray-500">Top Candidate</div>
              <div className="text-lg font-semibold mt-1">{overview.topCandidates[0]?.name ?? "-"}</div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium">Voting Timeline</h4>
            <div className="mt-3">
              {/* Placeholder: reuse VoteChart as line chart would be ideal; fallback to pie/bar */}
              <VoteChart results={analytics?.timeSeries || analytics?.candidates || []} chartType="bar" />
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium">Candidate Performance</h4>
            <div className="mt-3">
              <VoteChart results={analytics?.candidates || []} chartType="bar" />
            </div>
          </div>
        </Card>

        <aside className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium">Voter Participation</h3>
            <div className="mt-3 text-sm">
              <div className="flex justify-between"><div>Registered</div><div>{formatNumber(analytics?.registeredVoters ?? 0)}</div></div>
              <div className="flex justify-between mt-2"><div>Actual Votes</div><div>{formatNumber(analytics?.totalVotes ?? 0)}</div></div>
              <div className="flex justify-between mt-2"><div>Turnout</div><div>{analytics?.turnout ? `${analytics.turnout}%` : "-"}</div></div>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium">Export</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="primary" size="small" onClick={async () => {
                try {
                  setLoading(true);
                  const res = await api.get(`/results/${electionId}/export`, { responseType: "blob" });
                  // download blob
                  const url = URL.createObjectURL(new Blob([res]));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `analytics_${electionId}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  showError(err?.message || "Export failed");
                } finally {
                  setLoading(false);
                }
              }}>Download CSV</Button>

              <Button variant="outline" size="small" onClick={() => window.print()}>Print Report</Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
