import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = '0x1d2fe923a55b0d195baaee6da329229a2d55c165';

export const CONTRACT_ABI = [
  "function recordVote(uint256 sessionId, uint256 filmId) public",
  "function getFilmVoteCount(uint256 sessionId, uint256 filmId) public view returns (uint256)",
  "function getSessionResults(uint256 sessionId) public view returns (uint256[] memory filmIds, uint256[] memory voteCounts)",
  "function hasVoted(uint256 sessionId, address voter) public view returns (bool)",
  "function isSessionActive(uint256 sessionId) public view returns (bool)",
  "event VoteRecorded(uint256 indexed sessionId, address indexed voterAddress, uint256 filmId, uint32 timestamp)"
];

export const getProvider = () => {
  // Using a public RPC endpoint - you can configure this for your network
  return new ethers.JsonRpcProvider('https://polygon-amoy.g.alchemy.com/v2/demo');
};

export const getContract = (signerOrProvider: ethers.Signer | ethers.Provider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};

export const connectWallet = async () => {
  if (typeof (window as any).ethereum === 'undefined') {
    throw new Error('Please install MetaMask to vote on blockchain');
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  return { provider, signer };
};
