import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchElections,
  fetchElectionDetail,
  createElection,
  changeElectionStatus,
  fetchElectionsFromChain,
  getElectionContractInstance
} from '../redux/thunks/electionThunks';
import { fetchCandidates } from '../redux/thunks/candidateThunks';
import { checkVoteStatus, castVote } from '../redux/thunks/voteThunks';
import { selectAccount } from '../redux/slices/web3Slice';

/**
 * Hook for election-related operations
 */
export const useElection = (electionId = null) => {
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);
  
  // State from Redux
  const elections = useSelector(state => state.elections.list);
  const currentElection = useSelector(state => state.elections.currentElection);
  const loading = useSelector(state => state.elections.loading);
  const error = useSelector(state => state.elections.error);

  // Local state
  const [candidates, setCandidates] = useState([]);
  const [voteStatus, setVoteStatus] = useState(null);
  const [electionContract, setElectionContract] = useState(null);

  // Load elections
  const loadElections = useCallback(async (filters = {}) => {
    try {
      await dispatch(fetchElections(filters)).unwrap();
    } catch (error) {
      console.error('Error loading elections:', error);
      throw error;
    }
  }, [dispatch]);

  // Load election details
  const loadElectionDetail = useCallback(async (id = electionId) => {
    if (!id) return;

    try {
      const election = await dispatch(fetchElectionDetail(id)).unwrap();
      
      // Load candidates for this election
      if (election?.electionId) {
        const candidatesResult = await dispatch(fetchCandidates(election.electionId)).unwrap();
        setCandidates(candidatesResult.candidates || []);
      }

      return election;
    } catch (error) {
      console.error('Error loading election detail:', error);
      throw error;
    }
  }, [dispatch, electionId]);

  // Create new election
  const createNewElection = useCallback(async (electionData) => {
    try {
      const result = await dispatch(createElection(electionData)).unwrap();
      return result;
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  }, [dispatch]);

  // Change election status
  const changeStatus = useCallback(async (newStatus, electionAddress = null) => {
    const targetAddress = electionAddress || currentElection?.contractAddress;
    
    if (!targetAddress) {
      throw new Error('Election address is required');
    }

    try {
      const result = await dispatch(changeElectionStatus({
        electionAddress: targetAddress,
        newStatus
      })).unwrap();
      return result;
    } catch (error) {
      console.error('Error changing election status:', error);
      throw error;
    }
  }, [dispatch, currentElection]);

  // Load elections from blockchain
  const loadFromBlockchain = useCallback(async () => {
    try {
      const elections = await dispatch(fetchElectionsFromChain()).unwrap();
      return elections;
    } catch (error) {
      console.error('Error loading elections from blockchain:', error);
      throw error;
    }
  }, [dispatch]);

  // Check if user has voted
  const checkUserVoteStatus = useCallback(async (targetElectionId = electionId) => {
    if (!account || !targetElectionId) return;

    try {
      const result = await dispatch(checkVoteStatus(targetElectionId)).unwrap();
      setVoteStatus(result.hasVoted);
      return result.hasVoted;
    } catch (error) {
      console.error('Error checking vote status:', error);
      setVoteStatus(false);
      return false;
    }
  }, [dispatch, account, electionId]);

  // Cast vote
  const vote = useCallback(async (candidateId, targetElectionId = electionId) => {
    if (!targetElectionId) {
      throw new Error('Election ID is required');
    }

    try {
      const result = await dispatch(castVote({
        electionAddress: targetElectionId,
        candidateId
      })).unwrap();

      // Update vote status after voting
      setVoteStatus(true);
      
      return result;
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  }, [dispatch, electionId]);

  // Load election contract
  const loadContract = useCallback(async (electionAddress = null) => {
    const targetAddress = electionAddress || currentElection?.contractAddress;
    
    if (!targetAddress) {
      throw new Error('Election address is required');
    }

    try {
      const contract = await dispatch(getElectionContractInstance(targetAddress)).unwrap();
      setElectionContract(contract);
      return contract;
    } catch (error) {
      console.error('Error loading election contract:', error);
      throw error;
    }
  }, [dispatch, currentElection]);

  // Load data when electionId changes
  useEffect(() => {
    if (electionId) {
      loadElectionDetail(electionId);
      checkUserVoteStatus(electionId);
    }
  }, [electionId, loadElectionDetail, checkUserVoteStatus]);

  // Load contract when currentElection changes
  useEffect(() => {
    if (currentElection?.contractAddress) {
      loadContract(currentElection.contractAddress);
    }
  }, [currentElection, loadContract]);

  return {
    // State
    elections,
    currentElection,
    candidates,
    voteStatus,
    electionContract,
    loading,
    error,

    // Actions
    loadElections,
    loadElectionDetail,
    createElection: createNewElection,
    changeElectionStatus: changeStatus,
    loadFromBlockchain,
    checkVoteStatus: checkUserVoteStatus,
    castVote: vote,
    loadContract,

    // Derived state
    canVote: currentElection?.status === 'Voting' && !voteStatus && account,
    canRegister: currentElection?.status === 'Registration' && account,
    isElectionManager: currentElection?.creatorAddress === account,
    isElectionActive: currentElection?.status === 'Voting',
  };
};