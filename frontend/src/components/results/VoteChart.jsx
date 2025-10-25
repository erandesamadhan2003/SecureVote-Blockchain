import React, { useMemo, useRef, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Button from "../common/Button.jsx";
import html2canvas from "html2canvas";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#A28BFF", "#FF6B6B", "#4DD0E1"];

export default function VoteChart({ results = [], chartType: initial = "pie", onChangeChartType }) {
    const [chartType, setChartType] = useState(initial || "pie");
    const containerRef = useRef(null);

    const data = useMemo(() => (results || []).map((r) => ({
        name: r.name,
        value: Number(r.votes || 0),
        candidateId: r.candidateId,
        party: r.party
    })), [results]);

    const downloadPNG = async () => {
        if (!containerRef.current) return;
        const canvas = await html2canvas(containerRef.current, { backgroundColor: null, scale: 2 });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `chart_${Date.now()}.png`;
        a.click();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button className={`px-3 py-1 rounded ${chartType === "pie" ? "bg-blue-100" : "hover:bg-gray-100"}`} onClick={() => { setChartType("pie"); onChangeChartType && onChangeChartType("pie"); }}>Pie</button>
                    <button className={`px-3 py-1 rounded ${chartType === "bar" ? "bg-blue-100" : "hover:bg-gray-100"}`} onClick={() => { setChartType("bar"); onChangeChartType && onChangeChartType("bar"); }}>Bar</button>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="small" onClick={downloadPNG}>Download PNG</Button>
                </div>
            </div>

            <div ref={containerRef} style={{ width: "100%", height: 360 }}>
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === "pie" ? (
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={(entry) => `${entry.name}: ${entry.value}`} >
                                {data.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" fill="#8884d8">
                                {data.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
