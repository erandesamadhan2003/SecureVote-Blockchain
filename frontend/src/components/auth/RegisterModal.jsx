import React, { useEffect, useState } from "react";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";
import useWallet from "../../hooks/useWallet.js";
import authService from "../../services/authService.js";
import useToast from "../../hooks/useToast.js";

/*
  RegisterModal props:
   - isOpen: boolean
   - onClose: function
   - onOpenLogin: optional function to open login modal after register
*/
export default function RegisterModal({ isOpen, onClose, onOpenLogin }) {
    const { walletAddress } = useWallet();
    const { showSuccess, showError } = useToast();

    const [form, setForm] = useState({
        walletAddress: "",
        name: "",
        email: "",
        voterId: "",
        aadharNumber: "",
        terms: false
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setForm((f) => ({ ...f, walletAddress: walletAddress || "" }));
            setErrors({});
            setSubmitting(false);
        }
    }, [isOpen, walletAddress]);

    const validators = {
        name: (v) => {
            if (!v || v.trim().length < 3) return "Name is required (min 3 chars)";
            if (!/^[A-Za-z\s]+$/.test(v.trim())) return "Name can only include letters and spaces";
            return null;
        },
        email: (v) => {
            if (!v) return "Email is required";
            // simple email regex
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Invalid email";
            return null;
        },
        voterId: (v) => {
            if (!v) return null;
            if (!/^[a-zA-Z0-9]+$/.test(v)) return "Voter ID must be alphanumeric";
            return null;
        },
        aadharNumber: (v) => {
            if (!v) return null;
            if (!/^\d{12}$/.test(v)) return "Aadhar must be 12 digits";
            return null;
        },
        terms: (v) => (v ? null : "You must accept terms")
    };

    const validateField = (name, value) => {
        const fn = validators[name];
        if (!fn) return null;
        return fn(value);
    };

    const handleBlur = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;
        const err = validateField(name, val);
        setErrors((s) => ({ ...s, [name]: err }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;
        setForm((s) => ({ ...s, [name]: val }));
        // clear error for field while typing
        setErrors((s) => ({ ...s, [name]: undefined }));
    };

    const validateAll = () => {
        const newErrors = {};
        Object.keys(validators).forEach((k) => {
            const err = validateField(k, form[k]);
            if (err) newErrors[k] = err;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        if (!validateAll()) return;

        setSubmitting(true);
        try {
            // backend register expects: { walletAddress, name, aadharNumber }
            const payload = {
                walletAddress: form.walletAddress,
                name: form.name,
                aadharNumber: form.aadharNumber || form.voterId || ""
                // include email and voterId as extras if backend needs them
            };
            const res = await authService.register({
                walletAddress: payload.walletAddress,
                name: payload.name,
                aadharNumber: payload.aadharNumber
            });
            showSuccess("Registration successful");
            // close and optionally open login modal
            onClose && onClose();
            if (onOpenLogin) {
                onOpenLogin();
            }
        } catch (err) {
            const msg = err?.message || "Registration failed";
            showError(msg);
            setErrors((s) => ({ ...s, submit: msg }));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Register" size="small" showCloseButton>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-medium">Wallet Address</label>
                    <input name="walletAddress" value={form.walletAddress || ""} readOnly className="w-full mt-1 px-3 py-2 rounded border bg-gray-50 text-sm" />
                </div>

                <div>
                    <label className="text-xs font-medium">Full name</label>
                    <input name="name" value={form.name} onChange={handleChange} onBlur={handleBlur} className="w-full mt-1 px-3 py-2 rounded border text-sm" />
                    {errors.name && <div className="text-xs text-red-600 mt-1">{errors.name}</div>}
                </div>

                <div>
                    <label className="text-xs font-medium">Email</label>
                    <input name="email" value={form.email} onChange={handleChange} onBlur={handleBlur} className="w-full mt-1 px-3 py-2 rounded border text-sm" />
                    {errors.email && <div className="text-xs text-red-600 mt-1">{errors.email}</div>}
                </div>

                <div>
                    <label className="text-xs font-medium">Voter ID (optional)</label>
                    <input name="voterId" value={form.voterId} onChange={handleChange} onBlur={handleBlur} className="w-full mt-1 px-3 py-2 rounded border text-sm" />
                    {errors.voterId && <div className="text-xs text-red-600 mt-1">{errors.voterId}</div>}
                </div>

                <div>
                    <label className="text-xs font-medium">Aadhar number (optional)</label>
                    <input name="aadharNumber" value={form.aadharNumber} onChange={handleChange} onBlur={handleBlur} className="w-full mt-1 px-3 py-2 rounded border text-sm" />
                    {errors.aadharNumber && <div className="text-xs text-red-600 mt-1">{errors.aadharNumber}</div>}
                </div>

                <div className="flex items-center gap-2">
                    <input type="checkbox" name="terms" checked={!!form.terms} onChange={handleChange} onBlur={handleBlur} />
                    <label className="text-sm">I agree to the <a className="underline" href="/terms">terms and conditions</a></label>
                </div>
                {errors.terms && <div className="text-xs text-red-600">{errors.terms}</div>}

                {errors.submit && <div className="text-sm text-red-600">{errors.submit}</div>}

                <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <div className="text-sm">
                        Already registered?{" "}
                        <button type="button" className="underline" onClick={() => {
                            onClose && onClose();
                            if (onOpenLogin) onOpenLogin();
                        }}>
                            Login
                        </button>
                    </div>

                    <div>
                        <Button type="submit" variant="primary" size="medium" loading={submitting}>Register</Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
