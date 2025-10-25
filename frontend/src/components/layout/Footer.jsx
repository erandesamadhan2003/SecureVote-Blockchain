import React from "react";

export default function Footer() {
    const theme = {
        flax: "#F7E091",
        oldLace: "#F5EFE3",
        lightBlue: "#BAD4D3",
        aliceBlue: "#E5ECF2",
        silver: "#C3C5C4"
    };

    return (
        <footer style={{ background: theme.oldLace }} className="mt-12 border-t">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <h4 className="text-sm font-semibold mb-3" style={{ color: "#243a3a" }}>About</h4>
                        <p className="text-sm text-gray-700">
                            SecureVote is a decentralized elections platform leveraging blockchain for transparency and trust.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-3" style={{ color: "#243a3a" }}>Links</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/elections" className="hover:underline">Elections</a></li>
                            <li><a href="/results" className="hover:underline">Results</a></li>
                            <li><a href="/candidates" className="hover:underline">Candidates</a></li>
                            <li><a href="/about" className="hover:underline">About</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-3" style={{ color: "#243a3a" }}>Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/terms" className="hover:underline">Terms of Service</a></li>
                            <li><a href="/privacy" className="hover:underline">Privacy Policy</a></li>
                            <li><a href="/security" className="hover:underline">Security</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-3" style={{ color: "#243a3a" }}>Contact</h4>
                        <p className="text-sm text-gray-700">Email: <a href="mailto:hello@securevote.example" className="hover:underline">hello@securevote.example</a></p>
                        <p className="text-sm text-gray-700 mt-2">Address: 123 Blockchain Ave, Web3 City</p>
                    </div>
                </div>
            </div>

            <div style={{ background: theme.lightBlue }} className="border-t">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-700">
                    <div>© {new Date().getFullYear()} SecureVote. All rights reserved.</div>
                    <div className="mt-2 sm:mt-0">
                        <span className="px-2">Design inspired by Flax & Light Blue palette</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
