import { ethers } from 'ethers';
import { getContract, connectWallet } from './contract';
import { supabase } from '@/integrations/supabase/client';

export const recordBlockchainVote = async (
  eventId: string,
  itemId: string,
  voterCode: string
): Promise<string> => {
  try {
    const { signer } = await connectWallet();
    const contract = getContract(signer);

    // Convert eventId to uint256 (use first 8 chars of UUID as number)
    const sessionId = parseInt(eventId.replace(/-/g, '').substring(0, 8), 16);
    
    // Convert itemId to uint256
    const filmId = parseInt(itemId.replace(/-/g, '').substring(0, 8), 16);

    // Record vote on blockchain
    const tx = await contract.recordVote(sessionId, filmId);
    const receipt = await tx.wait();

    return receipt.hash;
  } catch (error) {
    console.error('Blockchain vote error:', error);
    throw error;
  }
};

export const verifyBlockchainVote = async (
  eventId: string,
  voterAddress: string
): Promise<boolean> => {
  try {
    const contract = getContract(ethers.getDefaultProvider());
    const sessionId = parseInt(eventId.replace(/-/g, '').substring(0, 8), 16);
    
    return await contract.hasVoted(sessionId, voterAddress);
  } catch (error) {
    console.error('Blockchain verification error:', error);
    return false;
  }
};

export const getBlockchainResults = async (eventId: string) => {
  try {
    const contract = getContract(ethers.getDefaultProvider());
    const sessionId = parseInt(eventId.replace(/-/g, '').substring(0, 8), 16);
    
    const [filmIds, voteCounts] = await contract.getSessionResults(sessionId);
    
    return filmIds.map((id: bigint, index: number) => ({
      filmId: id.toString(),
      voteCount: voteCounts[index].toString()
    }));
  } catch (error) {
    console.error('Blockchain results error:', error);
    return [];
  }
};
