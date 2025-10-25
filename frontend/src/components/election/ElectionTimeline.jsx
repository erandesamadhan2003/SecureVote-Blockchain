import React, { useEffect, useMemo, useState } from "react";
import { formatDate, calculateTimeRemaining } from "../../utils/helpers.js";
import { Check, Clock } from "lucide-react";

/**
 * Props:
 * - election: { createdAt, registrationDeadline, startTime, endTime }
 * - compact: boolean
 */
export default function ElectionTimeline({ election = {}, compact = false }) {
    const now = Date.now();
    const createdAt = election.createdAt ? new Date(election.createdAt) : null;
    const registrationDeadline = election.registrationDeadline ? new Date(election.registrationDeadline) : null;
    const startTime = election.startTime ? new Date(election.startTime) : null;
    const endTime = election.endTime ? new Date(election.endTime) : null;

    const phases = useMemo(() => {
        return [
            { key: "created", label: "Created", time: createdAt },
            { key: "registrationClose", label: "Registration Closes", time: registrationDeadline },
            { key: "votingStart", label: "Voting Starts", time: startTime },
            { key: "votingEnd", label: "Voting Ends", time: endTime },
            { key: "results", label: "Results", time: endTime ? new Date(endTime.getTime() + 60 * 60 * 1000) : null } // placeholder: 1 hour after end
        ];
    }, [createdAt, registrationDeadline, startTime, endTime]);

    const [currentTime, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    // determine phase statuses
    const phaseStatus = useMemo(() => {
        return phases.map((p) => {
            const t = p.time ? p.time.getTime() : null;
            if (!t) return { ...p, status: "pending" };
            if (currentTime >= t) return { ...p, status: "done" };
            // next upcoming is 'current'
            return { ...p, status: "upcoming" };
        }).map((p, idx, arr) => {
            if (p.status === "upcoming") {
                // if any previous is done and this is first upcoming -> current
                const prevDone = arr.slice(0, idx).some((x) => x.status === "done");
                if (prevDone) return { ...p, status: "current" };
            }
            return p;
        });
    }, [phases, currentTime]);

    // find next phase for countdown
    const nextPhase = useMemo(() => {
        return phaseStatus.find((p) => p.status === "current" || p.status === "upcoming") || null;
    }, [phaseStatus]);

    const countdown = nextPhase && nextPhase.time ? calculateTimeRemaining(nextPhase.time) : "";

    // render
    return (
        <div className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
            <div className={`flex ${compact ? "flex-col space-y-3" : "items-center space-x-4"} overflow-auto`}>
                {phaseStatus.map((p, i) => (
                    <div key={p.key} className={`${compact ? "flex items-start gap-2" : "flex items-center gap-3"}`}>
                        <div className="flex items-center">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${p.status === "done" ? "bg-green-500 text-white" : p.status === "current" ? "bg-blue-400 text-white" : "bg-gray-200 text-gray-700"}`}
                            >
                                {p.status === "done" ? <Check className="w-4 h-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                            </div>
                        </div>

                        <div>
                            <div className="font-medium">{p.label}</div>
                            <div className="text-xs text-gray-600">{p.time ? formatDate(p.time) : "TBD"}</div>
                        </div>

                        {!compact && i < phaseStatus.length - 1 && (
                            <div className={`flex-1 h-1 ${phaseStatus[i].status === "done" ? "bg-green-300" : phaseStatus[i + 1].status === "current" ? "bg-blue-200 animate-pulse" : "bg-gray-200"}`} style={{ minWidth: 80 }} />
                        )}
                    </div>
                ))}
            </div>

            {nextPhase && nextPhase.time && (
                <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> <span>Next: {nextPhase.label} — {countdown}</span>
                </div>
            )}
        </div>
    );
}
