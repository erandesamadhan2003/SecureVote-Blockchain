import React, { useState } from "react";
import Modal from "../common/Modal.jsx";
import Button from "../common/Button.jsx";
import useWallet from "../../hooks/useWallet.js";
import useAuth from "../../hooks/useAuth.js";
import useToast from "../../hooks/useToast.js";

export default function LoginModal({ isOpen, onClose, onOpenRegister }) {
  const { connect, isConnected, isConnecting, walletAddress, switchToSepolia, chainId } = useWallet();
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setStep(1);
    setLoading(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose && onClose();
  };

  const handleConnect = async () => {
    setError(null);
    try {
      setLoading(true);
      await connect();
      setStep(2);
    } catch (e) {
      setError(e?.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  const handleSignAndLogin = async () => {
    setError(null);
    try {
      setLoading(true);
      // delegate to useAuth.login which will perform signing + backend login (connectWallet thunk)
      await login();
      showSuccess("Logged in successfully");
      handleClose();
    } catch (e) {
      const msg = e?.message || "Authentication failed";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const needSwitchNetwork = () => {
    const desired = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
    return chainId && Number(chainId) !== Number(desired);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Login" size="small" showCloseButton>
      <div className="space-y-4">
        {/* Steps indicator */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-xs ${step >= 1 ? "bg-blue-200" : "bg-gray-200"}`}>1</div>
          <div className={`text-sm ${step === 1 ? "font-semibold" : "text-gray-600"}`}>Connect Wallet</div>
          <div className={`px-3 py-1 rounded-full text-xs ${step >= 2 ? "bg-blue-200" : "bg-gray-200"}`}>2</div>
          <div className={`text-sm ${step === 2 ? "font-semibold" : "text-gray-600"}`}>Sign & Authenticate</div>
        </div>

        {/* Step content */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Connect your MetaMask wallet to begin.</p>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="medium"
                loading={loading || isConnecting}
                onClick={handleConnect}
              >
                {isConnected ? "Connected" : "Connect Wallet"}
              </Button>
              {isConnected && <div className="text-sm text-gray-600">Address: {walletAddress}</div>}
            </div>
            {needSwitchNetwork() && (
              <div className="text-sm text-yellow-700">
                Wrong network.{" "}
                <button className="underline" onClick={() => switchToSepolia().catch(()=>{})}>Switch to Sepolia</button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Sign the message with your wallet to authenticate.</p>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="medium" loading={loading} onClick={handleSignAndLogin}>
                Sign & Login
              </Button>
              <Button variant="outline" size="medium" onClick={() => setStep(1)} disabled={loading}>
                Back
              </Button>
            </div>
            <div className="text-xs text-gray-500">No private keys leave your wallet — only a signature is requested.</div>
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t mt-2">
          <div className="text-sm">
            Don't have an account?{" "}
            <button
              className="underline text-sm"
              onClick={() => {
                // open register modal if provided
                if (onOpenRegister) {
                  onOpenRegister();
                } else {
                  // fallback: just close
                  handleClose();
                }
              }}
              disabled={loading}
            >
              Register
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="small" onClick={handleClose} disabled={loading}>Cancel</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
