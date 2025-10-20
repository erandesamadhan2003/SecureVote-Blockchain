import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    getElectionContractInstance
} from '../redux/thunks/electionThunks';
import { selectContracts, selectSigner } from '../redux/slices/web3Slice';
import { callContractMethod, sendTransaction } from '../redux/utils/contractHelper';

/**
 * Hook for contract interactions
 */
export const useContract = (contractType, address = null) => {
    const dispatch = useDispatch();
    const contracts = useSelector(selectContracts);
    const signer = useSelector(selectSigner);
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load contract based on type and address
    useEffect(() => {
        const loadContract = async () => {
            if (!signer) {
                setContract(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                let contractInstance;

                switch (contractType) {
                    case 'roles':
                        contractInstance = contracts.roles;
                        break;

                    case 'factory':
                        contractInstance = contracts.factory;
                        break;

                    case 'election':
                        if (!address) {
                            throw new Error('Election contract address is required');
                        }

                        // Check if already in cache
                        if (contracts.elections[address]) {
                            contractInstance = contracts.elections[address];
                        } else {
                            // Load and cache the contract
                            contractInstance = await dispatch(getElectionContractInstance(address)).unwrap();
                        }
                        break;

                    default:
                        throw new Error(`Unknown contract type: ${contractType}`);
                }

                setContract(contractInstance);
            } catch (err) {
                console.error('Error loading contract:', err);
                setError(err.message);
                setContract(null);
            } finally {
                setLoading(false);
            }
        };

        loadContract();
    }, [contractType, address, contracts, signer, dispatch]);

    // Read from contract
    const read = useCallback(async (method, args = []) => {
        if (!contract) {
            throw new Error('Contract not loaded');
        }

        try {
            setLoading(true);
            setError(null);
            const result = await callContractMethod(contract, method, args);
            return result;
        } catch (err) {
            console.error(`Error reading ${method}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [contract]);

    // Write to contract
    const write = useCallback(async (method, args = [], options = {}) => {
        if (!contract) {
            throw new Error('Contract not loaded');
        }

        try {
            setLoading(true);
            setError(null);
            const result = await sendTransaction(contract, method, args, options);
            return result;
        } catch (err) {
            console.error(`Error writing ${method}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [contract]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        contract,
        loading,
        error,
        read,
        write,
        clearError,
        isLoaded: !!contract && !loading,
    };
};