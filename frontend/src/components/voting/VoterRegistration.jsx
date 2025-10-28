import React, { useState } from "react";
import Button from "../common/Button.jsx";
import useToast from "../../hooks/useToast.js";

/**
 * Props:
 * - electionId
 * - onRegisterComplete()
 *
 * Note: batch CSV parsing and blockchain role checks should be implemented in parent or service layer.
 */
export default function VoterRegistration({ electionId, onRegisterComplete = () => { } }) {
    const { showSuccess, showError } = useToast();
    const [mode, setMode] = useState("single");
    const [singleAddress, setSingleAddress] = useState("");
    const [csvFile, setCsvFile] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    const validateAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr);

    const handleSingleRegister = async () => {
        if (!validateAddress(singleAddress)) {
            showError("Invalid Ethereum address");
            return;
        }
        setIsRegistering(true);
        try {
            // parent or service should call API to register voter
            // pass a progress callback so parent can update UI if it wants
            await onRegisterComplete([singleAddress], (done) => setProgress({ done, total: 1 }));
            showSuccess("Voter registered");
            setSingleAddress("");
        } catch (e) {
            showError(e?.message || "Registration failed");
        } finally {
            setIsRegistering(false);
        }
    };

    const handleCsv = (file) => {
        setCsvFile(file);
        // lightweight parse: read file lines and extract addresses
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target.result || "";
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const addrs = lines.map(l => l.split(",")[0].trim()).filter(Boolean);
            setAddresses(addrs);
        };
        reader.readAsText(file);
    };

    const handleBatchRegister = async () => {
        const valid = addresses.filter(validateAddress);
        if (valid.length === 0) {
            showError("No valid addresses found");
            return;
        }
        setIsRegistering(true);
        setProgress({ done: 0, total: valid.length });
        try {
            // call parent to perform batch registration; parent handles progress updates if needed
            await onRegisterComplete(valid, (done) => setProgress((p) => ({ ...p, done })));
            showSuccess(`Registered ${valid.length} voters`);
            setCsvFile(null);
            setAddresses([]);
        } catch (e) {
            showError(e?.message || "Batch registration failed");
        } finally {
            setIsRegistering(false);
            setProgress({ done: 0, total: 0 });
        }
    };

    return (
        <div className="space-y-4 bg-white p-4 rounded shadow">
            <div className="flex items-center gap-3">
                <button className={`px-3 py-1 rounded ${mode === "single" ? "bg-blue-100" : "hover:bg-gray-100"}`} onClick={() => setMode("single")}>Single</button>
                <button className={`px-3 py-1 rounded ${mode === "batch" ? "bg-blue-100" : "hover:bg-gray-100"}`} onClick={() => setMode("batch")}>Batch (CSV)</button>
            </div>

            {mode === "single" ? (
                <div className="space-y-3">
                    <label className="text-xs font-medium">Wallet address</label>
                    <input value={singleAddress} onChange={(e) => setSingleAddress(e.target.value)} className="w-full px-3 py-2 border rounded" placeholder="0x..." />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="small" onClick={() => setSingleAddress("")}>Clear</Button>
                        <Button variant="primary" size="medium" onClick={handleSingleRegister} loading={isRegistering}>Verify & Register</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <label className="text-xs font-medium">Upload CSV (one address per line)</label>
                    <div className="border-dashed border-2 p-4 rounded">
                        <input type="file" accept=".csv,text/csv" onChange={(e) => handleCsv(e.target.files?.[0])} />
                        <div className="text-xs text-gray-500 mt-2">CSV should contain one address per line. You can download a template from the admin panel.</div>
                        {csvFile && <div className="mt-2 text-sm">Loaded: {csvFile.name} — {addresses.length} rows</div>}
                    </div>

                    <div>
                        <div className="text-sm">Preview (first 10)</div>
                        <ul className="mt-2 text-xs text-gray-700 list-disc list-inside">
                            {addresses.slice(0, 10).map((a, i) => <li key={i}>{a} {validateAddress(a) ? "" : <span className="text-red-600"> (invalid)</span>}</li>)}
                        </ul>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">Total: {addresses.length}</div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="small" onClick={() => { setCsvFile(null); setAddresses([]); }}>Clear</Button>
                            <Button variant="primary" size="medium" onClick={handleBatchRegister} loading={isRegistering}>Register Batch</Button>
                        </div>
                    </div>

                    {isRegistering && (
                        <div className="mt-2 text-sm text-gray-600">
                            Progress: {progress.done}/{progress.total}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
