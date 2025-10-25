import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { addToast } from "../redux/slices/uiSlice.js";

export default function useToast() {
	const dispatch = useDispatch();

	const show = useCallback((type, message, duration = 5000) => {
		if (!message) return;
		dispatch(addToast({ type, message, duration }));
	}, [dispatch]);

	const showSuccess = useCallback((message, duration = 4000) => show("success", message, duration), [show]);
	const showError = useCallback((message, duration = 6000) => show("error", message, duration), [show]);
	const showWarning = useCallback((message, duration = 5000) => show("warning", message, duration), [show]);
	const showInfo = useCallback((message, duration = 4000) => show("info", message, duration), [show]);

	return { showSuccess, showError, showWarning, showInfo };
}
