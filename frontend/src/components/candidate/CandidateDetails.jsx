import React from "react";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
import { truncateText, formatNumber, truncateAddress } from "../../utils/helpers.js";
import { Copy } from "lucide-react";
import useToast from "../../hooks/useToast.js";

/**
 * Props:
 * - candidate: object { name, party, manifesto, imageHash, candidateAddress, voteCount, totalVotes, rank, status }
 * - showVoteButton: boolean
 * - onVote: (candidate) => void
 */
export default function CandidateDetails({ candidate = {}, showVoteButton = false, onVote = () => {} }) {
  const { showSuccess, showError } = useToast();
  const {
    name = "Unnamed",
    party = "Independent",
    manifesto = "",
    imageHash,
    candidateAddress,
    voteCount = 0,
    totalVotes = 0,
    rank = null,
    status = ""
  } = candidate;

  const pct = totalVotes > 0 ? ((Number(voteCount) / Number(totalVotes)) * 100).toFixed(2) : "0.00";

  const handleCopy = async () => {
    try {
      if (!candidateAddress) return;
      await navigator.clipboard.writeText(candidateAddress);
      showSuccess("Address copied");
    } catch (e) {
      showError("Copy failed");
    }
  };

  const imageUrl = imageHash ? `https://ipfs.io/ipfs/${imageHash}` : null;

  return (
    <Card className="max-w-3xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-48 flex-shrink-0">
          <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {imageUrl ? <img src={imageUrl} alt={`${name} photo`} className="object-cover w-full h-full" /> : <div className="text-gray-500">No photo</div>}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold">{name}</h2>
              <div className="text-sm text-gray-600">{party}</div>
            </div>

            <div className="text-right space-y-2">
              {status && <div className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">{status}</div>}
              {rank != null && <div className="text-sm font-medium">Rank #{rank}</div>}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">Wallet:</div>
              <div className="font-mono text-sm">{truncateAddress(candidateAddress)}</div>
              <button onClick={handleCopy} className="p-1 rounded hover:bg-gray-100" title="Copy address">
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium">Manifesto</h3>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{truncateText(manifesto, 5000)}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-xs text-gray-500">Votes</div>
                <div className="font-medium">{formatNumber(voteCount)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-xs text-gray-500">Share</div>
                <div className="font-medium">{pct}%</div>
              </div>
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-xs text-gray-500">Total</div>
                <div className="font-medium">{formatNumber(totalVotes)}</div>
              </div>
            </div>

            {showVoteButton && (
              <div className="mt-4">
                <Button variant="primary" size="medium" onClick={() => onVote(candidate)}>Vote</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
