import React, { useState, useRef } from "react";
import Button from "../common/Button.jsx";
import useToast from "../../hooks/useToast.js";
import candidateService from "../../services/candidateService.js";
import api from "../../services/api.js";

// Simple validators
const validators = {
    name: (v) => {
        if (!v || v.trim().length < 3) return "Name required (min 3 chars)";
        if (v.trim().length > 50) return "Name max 50 chars";
        return null;
    },
    party: (v) => {
        if (!v || v.trim().length < 2) return "Party required (min 2 chars)";
        if (v.trim().length > 50) return "Party max 50 chars";
        return null;
    },
    manifesto: (v) => {
        if (!v || v.trim().length < 50) return "Manifesto required (min 50 chars)";
        if (v.trim().length > 500) return "Manifesto max 500 chars";
        return null;
    },
    image: (file) => {
        if (!file) return "Profile image is required";
        const okTypes = ["image/jpeg", "image/png"];
        if (!okTypes.includes(file.type)) return "Only JPG/PNG images allowed";
        if (file.size > 2 * 1024 * 1024) return "Image must be <= 2MB";
        return null;
    }
};

export default function CandidateForm({ electionId: initialElectionId = "", onSubmit = null, elections = [] }) {
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState({
        electionId: initialElectionId || (elections[0]?.electionId ?? ""),
        name: "",
        party: "",
        manifesto: ""
    });

    const [errors, setErrors] = useState({});
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
        setErrors((s) => ({ ...s, [name]: undefined }));
    };

    const onSelectFile = (file) => {
        if (!file) return;
        const err = validators.image(file);
        if (err) {
            setErrors((s) => ({ ...s, image: err }));
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setErrors((s) => ({ ...s, image: undefined }));
    };

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        onSelectFile(f);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        onSelectFile(f);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const validateAll = () => {
        const e = {};
        e.name = validators.name(form.name);
        e.party = validators.party(form.party);
        e.manifesto = validators.manifesto(form.manifesto);
        e.image = validators.image(imageFile);
        // remove undefined entries
        Object.keys(e).forEach((k) => { if (!e[k]) delete e[k]; });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const uploadImage = async () => {
        if (!imageFile) throw new Error("No image file");
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const data = new FormData();
            data.append("file", imageFile);
            // backend should accept /upload and return { hash } or { url }
            const res = await api.post("/upload", data, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (ev) => {
                    if (ev.total) {
                        setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
                    }
                }
            });
            setIsUploading(false);
            const hash = res?.hash ?? res?.data?.hash ?? res?.data?.url ?? res?.url ?? null;
            if (!hash) throw new Error("Upload failed: no hash returned");
            return hash;
        } catch (err) {
            setIsUploading(false);
            setUploadProgress(0);
            throw err;
        }
    };

    const handleSubmit = async (e) => {
        e && e.preventDefault();
        if (submitting) return;
        if (!validateAll()) {
            showError("Please fix validation errors");
            return;
        }
        setSubmitting(true);
        try {
            // upload image first
            const imageHash = await uploadImage();

            const payload = {
                electionId: form.electionId,
                name: form.name.trim(),
                party: form.party.trim(),
                manifesto: form.manifesto.trim(),
                imageHash
            };

            // if parent provided onSubmit use it; otherwise use candidateService directly
            let res;
            if (typeof onSubmit === "function") {
                res = await onSubmit(payload);
            } else {
                res = await candidateService.registerCandidate(payload);
            }

            showSuccess("Candidate registered successfully");
            // reset form
            setForm({ electionId: form.electionId, name: "", party: "", manifesto: "" });
            setImageFile(null);
            setImagePreview("");
            setUploadProgress(0);
            setErrors({});
            return res;
        } catch (err) {
            const msg = (err?.message || err?.data?.message || "Registration failed");
            setErrors((s) => ({ ...s, submit: msg }));
            showError(msg);
            throw err;
        } finally {
            setSubmitting(false);
            setIsUploading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow">
            <div>
                <label className="text-xs font-medium">Election</label>
                {initialElectionId ? (
                    <div className="mt-1 text-sm">{initialElectionId}</div>
                ) : (
                    <select name="electionId" value={form.electionId} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded">
                        <option value="">Select election</option>
                        {Array.isArray(elections) && elections.map((el) => (
                            <option key={el.electionId ?? el.id ?? el.contractAddress} value={el.electionId ?? el.id ?? el.contractAddress}>
                                {el.name ?? `Election ${el.electionId ?? el.id}`}
                            </option>
                        ))}
                    </select>
                )}
                {errors.electionId && <div className="text-xs text-red-600 mt-1">{errors.electionId}</div>}
            </div>

            <div>
                <label className="text-xs font-medium">Full name</label>
                <input name="name" value={form.name} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded" />
                {errors.name && <div className="text-xs text-red-600 mt-1">{errors.name}</div>}
            </div>

            <div>
                <label className="text-xs font-medium">Party</label>
                <input name="party" value={form.party} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded" />
                {errors.party && <div className="text-xs text-red-600 mt-1">{errors.party}</div>}
            </div>

            <div>
                <label className="text-xs font-medium">Manifesto</label>
                <textarea name="manifesto" value={form.manifesto} onChange={handleChange} rows={6} className="w-full mt-1 px-3 py-2 border rounded" maxLength={500} />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <div>{errors.manifesto ? <span className="text-red-600">{errors.manifesto}</span> : null}</div>
                    <div>{form.manifesto.length}/500</div>
                </div>
            </div>

            <div>
                <label className="text-xs font-medium">Profile image (JPG/PNG, max 2MB)</label>

                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="mt-2 border-dashed border-2 border-gray-200 rounded p-4 flex items-center justify-between gap-4"
                >
                    <div className="flex-1">
                        <div className="text-sm text-gray-600">Drag & drop an image here or</div>
                        <div className="mt-2">
                            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={handleFileChange} style={{ display: "none" }} />
                            <Button variant="outline" size="small" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                                Choose file
                            </Button>
                            {imageFile && <span className="ml-3 text-sm">{imageFile.name}</span>}
                        </div>
                        {errors.image && <div className="text-xs text-red-600 mt-1">{errors.image}</div>}
                    </div>

                    <div className="w-28 h-28 bg-gray-50 rounded overflow-hidden flex items-center justify-center">
                        {imagePreview ? <img src={imagePreview} alt="preview" className="object-cover w-full h-full" /> : <div className="text-xs text-gray-400">Preview</div>}
                    </div>
                </div>

                {isUploading && (
                    <div className="mt-2">
                        <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
                            <div className="h-2 bg-blue-500" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{uploadProgress}%</div>
                    </div>
                )}
            </div>

            {errors.submit && <div className="text-sm text-red-600">{errors.submit}</div>}

            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="medium" onClick={() => {
                    // reset form
                    setForm({ electionId: form.electionId, name: "", party: "", manifesto: "" });
                    setImageFile(null);
                    setImagePreview("");
                    setErrors({});
                }}>
                    Clear
                </Button>
                <Button type="submit" variant="primary" size="medium" loading={submitting}>
                    Submit
                </Button>
            </div>
        </form>
    );
}
