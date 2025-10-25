import React, { useState, useRef } from "react";
import Button from "../common/Button.jsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

/**
 * Props:
 * - election: { name, id, startTime, endTime }
 * - results: [{ candidateId, name, party, votes }]
 * - winner: candidate object
 */
export default function ResultsExport({ election = {}, results = [], winner = null }) {
    const [isExporting, setIsExporting] = useState(false);
    const exportRef = useRef(null);

    const exportCSV = () => {
        const rows = [["Rank", "Candidate", "Party", "Votes", "Percentage"]];
        const total = results.reduce((s, r) => s + Number(r.votes || 0), 0);
        results.forEach((r, idx) => {
            const pct = total ? ((Number(r.votes || 0) / total) * 100).toFixed(2) + "%" : "0%";
            rows.push([idx + 1, r.name, r.party || "-", r.votes || 0, pct]);
        });
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${election.name || "results"}_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportExcel = () => {
        const wsData = [
            ["Rank", "Candidate", "Party", "Votes", "Percentage"]
        ];
        const total = results.reduce((s, r) => s + Number(r.votes || 0), 0);
        results.forEach((r, idx) => {
            const pct = total ? ((Number(r.votes || 0) / total) * 100).toFixed(2) + "%" : "0%";
            wsData.push([idx + 1, r.name, r.party || "-", Number(r.votes || 0), pct]);
        });
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Results");
        XLSX.writeFile(wb, `${(election.name || "results").replace(/\s+/g, "_")}_${Date.now()}.xlsx`);
    };

    const exportPDF = async () => {
        setIsExporting(true);
        try {
            const node = exportRef.current || document.body;
            const canvas = await html2canvas(node, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${(election.name || "results")}_${Date.now()}.pdf`);
        } catch (e) {
            console.error("PDF export error", e);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-3" ref={exportRef}>
            <Button variant="outline" size="small" onClick={exportCSV} disabled={isExporting}>Export CSV</Button>
            <Button variant="outline" size="small" onClick={exportExcel} disabled={isExporting}>Export Excel</Button>
            <Button variant="primary" size="small" onClick={exportPDF} loading={isExporting}>Export PDF</Button>
        </div>
    );
}
