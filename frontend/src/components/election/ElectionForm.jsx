import React, { useEffect, useMemo, useState, useCallback } from "react";
import Button from "../common/Button.jsx";
import ElectionTimeline from "./ElectionTimeline.jsx";
import useToast from "../../hooks/useToast.js";
import { formatDate, calculateTimeRemaining } from "../../utils/helpers.js";

/**
 * Props:
 * - onSubmit(formData) => Promise
 * - initialData: { name, description, registrationDeadline, startTime, endTime, createdAt }
 * - isEdit: boolean
 */
export default function ElectionForm({ onSubmit, initialData = {}, isEdit = false }) {
    const { showSuccess, showError } = useToast();

    const toInputValue = (d) => {
        if (!d) return "";
        const dt = typeof d === "string" ? new Date(d) : d;
        if (Number.isNaN(dt.getTime())) return "";
        // create YYYY-MM-DDTHH:mm for datetime-local
        const pad = (n) => String(n).padStart(2, "0");
        const yyyy = dt.getFullYear();
        const mm = pad(dt.getMonth() + 1);
        const dd = pad(dt.getDate());
        const hh = pad(dt.getHours());
        const min = pad(dt.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };

    const [step, setStep] = useState(1);
    const [form, setForm] = useState({
        name: initialData.name || "",
        description: initialData.description || "",
        registrationDeadline: toInputValue(initialData.registrationDeadline || initialData.registrationDeadline),
        startTime: toInputValue(initialData.startTime || initialData.startTime),
        endTime: toInputValue(initialData.endTime || initialData.endTime),
        createdAt: initialData.createdAt || new Date().toISOString()
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setForm((f) => ({
            ...f,
            name: initialData.name || f.name,
            description: initialData.description || f.description,
            registrationDeadline: toInputValue(initialData.registrationDeadline) || f.registrationDeadline,
            startTime: toInputValue(initialData.startTime) || f.startTime,
            endTime: toInputValue(initialData.endTime) || f.endTime,
            createdAt: initialData.createdAt || f.createdAt
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    const validateStep1 = useCallback(() => {
        const e = {};
        if (!form.name || form.name.trim().length < 3) e.name = "Name required (min 3 characters)";
        if (form.name && form.name.length > 100) e.name = "Max 100 characters";
        if (form.description && form.description.length > 500) e.description = "Max 500 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [form.name, form.description]);

    const validateStep2 = useCallback(() => {
        const e = {};
        const now = Date.now();
        const reg = form.registrationDeadline ? new Date(form.registrationDeadline).getTime() : null;
        const start = form.startTime ? new Date(form.startTime).getTime() : null;
        const end = form.endTime ? new Date(form.endTime).getTime() : null;

        if (!reg) e.registrationDeadline = "Registration deadline required";
        else if (reg <= now) e.registrationDeadline = "Registration deadline must be in the future";

        if (!start) e.startTime = "Voting start time required";
        else if (start <= now) e.startTime = "Start time must be in the future";

        if (!end) e.endTime = "Voting end time required";
        else if (start && end <= start) e.endTime = "End time must be after start time";

        if (reg && start && reg >= start) e.registrationDeadline = "Registration must end before voting starts";

        setErrors(e);
        return Object.keys(e).length === 0;
    }, [form.registrationDeadline, form.startTime, form.endTime]);

    const next = async () => {
        if (step === 1) {
            if (!validateStep1()) return;
            setStep(2);
            return;
        }
        if (step === 2) {
            if (!validateStep2()) return;
            setStep(3);
        }
    };

    const previous = () => {
        setErrors({});
        setStep((s) => Math.max(1, s - 1));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((s) => ({ ...s, [name]: value }));
        setErrors((s) => ({ ...s, [name]: undefined }));
    };

    const handleSubmit = async (e) => {
        e && e.preventDefault();
        // final validation across steps
        const ok1 = validateStep1();
        const ok2 = validateStep2();
        if (!ok1 || !ok2) {
            setStep(!ok1 ? 1 : 2);
            return;
        }

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
            startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
            endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
            createdAt: form.createdAt || new Date().toISOString()
        };

        setIsSubmitting(true);
        try {
            await onSubmit(payload);
            showSuccess(isEdit ? "Election updated" : "Election created");
        } catch (err) {
            showError(err?.message || "Failed to submit");
        } finally {
            setIsSubmitting(false);
        }
    };

    const nameCount = form.name.length;
    const descCount = form.description.length;

    const timelineElection = useMemo(() => {
        return {
            name: form.name,
            description: form.description,
            registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
            startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
            endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
            createdAt: form.createdAt || new Date().toISOString()
        };
    }, [form]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">{isEdit ? "Edit Election" : "Create Election"}</h2>
                <div className="text-sm text-gray-600">Step {step} of 3</div>
            </div>

            {step === 1 && (
                <div className="space-y-4 bg-white p-4 rounded shadow">
                    <div>
                        <label className="text-sm font-medium">Name</label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            className="w-full mt-1 px-3 py-2 border rounded"
                            maxLength={100}
                            placeholder="Election name"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <div>{errors.name ? <span className="text-red-600">{errors.name}</span> : null}</div>
                            <div>{nameCount}/100</div>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            className="w-full mt-1 px-3 py-2 border rounded"
                            rows={4}
                            maxLength={500}
                            placeholder="Short description (optional)"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <div>{errors.description ? <span className="text-red-600">{errors.description}</span> : null}</div>
                            <div>{descCount}/500</div>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 bg-white p-4 rounded shadow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium">Registration deadline</label>
                            <input
                                type="datetime-local"
                                name="registrationDeadline"
                                value={form.registrationDeadline}
                                onChange={handleChange}
                                className="w-full mt-1 px-3 py-2 border rounded"
                            />
                            {errors.registrationDeadline && <div className="text-xs text-red-600 mt-1">{errors.registrationDeadline}</div>}
                        </div>

                        <div>
                            <label className="text-sm font-medium">Voting start time</label>
                            <input
                                type="datetime-local"
                                name="startTime"
                                value={form.startTime}
                                onChange={handleChange}
                                className="w-full mt-1 px-3 py-2 border rounded"
                            />
                            {errors.startTime && <div className="text-xs text-red-600 mt-1">{errors.startTime}</div>}
                        </div>

                        <div>
                            <label className="text-sm font-medium">Voting end time</label>
                            <input
                                type="datetime-local"
                                name="endTime"
                                value={form.endTime}
                                onChange={handleChange}
                                className="w-full mt-1 px-3 py-2 border rounded"
                            />
                            {errors.endTime && <div className="text-xs text-red-600 mt-1">{errors.endTime}</div>}
                        </div>
                    </div>

                    <div className="pt-4">
                        <div className="text-sm font-medium mb-2">Timeline Preview</div>
                        <ElectionTimeline election={timelineElection} />
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-4 bg-white p-4 rounded shadow">
                    <div>
                        <h3 className="text-md font-semibold">Review</h3>
                        <div className="mt-2 text-sm text-gray-700">
                            <div><strong>Name:</strong> {form.name}</div>
                            <div className="mt-1"><strong>Description:</strong> {form.description || "—"}</div>
                            <div className="mt-1"><strong>Registration deadline:</strong> {form.registrationDeadline ? formatDate(new Date(form.registrationDeadline)) : "—"}</div>
                            <div className="mt-1"><strong>Voting start:</strong> {form.startTime ? formatDate(new Date(form.startTime)) : "—"}</div>
                            <div className="mt-1"><strong>Voting end:</strong> {form.endTime ? formatDate(new Date(form.endTime)) : "—"}</div>
                            <div className="mt-2 text-xs text-gray-500">Time until start: {form.startTime ? calculateTimeRemaining(new Date(form.startTime)) : "—"}</div>
                        </div>
                    </div>

                    <div>
                        <ElectionTimeline election={timelineElection} compact />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    {step > 1 && <Button variant="outline" size="medium" onClick={previous}>Previous</Button>}
                </div>
                <div className="flex items-center gap-2">
                    {step < 3 && <Button variant="primary" size="medium" onClick={next}>Next</Button>}
                    {step === 3 && <Button type="submit" variant="primary" size="medium" loading={isSubmitting}>Submit</Button>}
                </div>
            </div>
        </form>
    );
}
