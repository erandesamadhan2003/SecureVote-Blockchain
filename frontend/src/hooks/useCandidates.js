import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    registerCandidate,
    validateCandidate,
    fetchCandidates
} from '../redux/thunks/candidateThunks';
import { selectAccount } from '../redux/slices/web3Slice';

/**
 * Hook for candidate-related operations
 */
export const useCandidates = (electionId = null) => {
    const dispatch = useDispatch();
    const account = useSelector(selectAccount);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pendingCandidates, setPendingCandidates] = useState([]);

    // Register as candidate
    const register = useCallback(async (candidateData) => {
        if (!electionId) {
            throw new Error('Election ID is required');
        }

        try {
            setLoading(true);
            setError(null);

            const result = await dispatch(registerCandidate({
                ...candidateData,
                electionId
            })).unwrap();

            return result;
        } catch (err) {
            console.error('Error registering candidate:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [dispatch, electionId]);

    // Validate candidate (approve/reject)
    const validate = useCallback(async (candidateId, approved, electionAddress = null) => {
        if (!electionAddress) {
            throw new Error('Election address is required');
        }

        try {
            setLoading(true);
            setError(null);

            const result = await dispatch(validateCandidate({
                electionAddress,
                candidateId,
                approved
            })).unwrap();

            // Update pending candidates list
            setPendingCandidates(prev =>
                prev.filter(candidate => candidate.candidateId !== candidateId)
            );

            return result;
        } catch (err) {
            console.error('Error validating candidate:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    // Load candidates for election
    const loadCandidates = useCallback(async (targetElectionId = electionId, status = null) => {
        if (!targetElectionId) return;

        try {
            setLoading(true);
            setError(null);

            const result = await dispatch(fetchCandidates(targetElectionId)).unwrap();

            // Filter by status if provided
            let filteredCandidates = result.candidates || [];
            if (status) {
                filteredCandidates = filteredCandidates.filter(candidate => candidate.status === status);
            }

            // Update pending candidates
            if (status === 'Pending' || !status) {
                setPendingCandidates(filteredCandidates.filter(c => c.status === 'Pending'));
            }

            return filteredCandidates;
        } catch (err) {
            console.error('Error loading candidates:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [dispatch, electionId]);

    // Check if user is candidate in this election
    const isUserCandidate = useCallback((candidatesList = []) => {
        if (!account) return false;

        return candidatesList.some(
            candidate => candidate.candidateAddress?.toLowerCase() === account.toLowerCase()
        );
    }, [account]);

    // Get candidate by ID
    const getCandidateById = useCallback((candidateId, candidatesList = []) => {
        return candidatesList.find(candidate =>
            candidate.candidateId === candidateId || candidate._id === candidateId
        );
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        loading,
        error,
        pendingCandidates,

        // Actions
        registerCandidate: register,
        validateCandidate: validate,
        loadCandidates,
        isUserCandidate,
        getCandidateById,
        clearError,
    };
};