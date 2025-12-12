"use client";

import React, { useEffect, useState } from "react";
import DownloadHistory from "./DownloadHistory";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import PremiumCheckout from "./PremiumCheckout";

const DownloadContent = () => {
    const { user } = useUser();
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    const [canDownload, setCanDownload] = useState<boolean | null>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [checkingLimit, setCheckingLimit] = useState(true);
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    useEffect(() => {
        setIsReady(true);
    }, []);

    useEffect(() => {
        const fetchLimit = async (userid: string) => {
            setCheckingLimit(true);
            try {
                const res = await axiosInstance.post("/download/check-limit", { userid });
                setCanDownload(res.data.canDownload ?? false);
                setRemaining(typeof res.data.remaining === "number" ? res.data.remaining : null);
                setIsPremium(!!res.data.isPremium);
            } catch (err: any) {
                console.error("Failed to fetch download limit:", err);
                toast.error("Could not check download limit");
            } finally {
                setCheckingLimit(false);
            }
        };

        if (user && (user._id || user.id)) {
            fetchLimit(user._id || user.id);
        } else {
            setCheckingLimit(false);
        }
    }, [user]);

    if (!isReady) {
        return <div className="text-center py-12">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view your downloads</h2>
                <button
                    onClick={() => router.push("/")}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Go to Home
                </button>
            </div>
        );
    }

    const userId = user._id || user.id;

    if (!userId) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Error: User ID not found</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                {checkingLimit ? (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">Checking download allowance...</div>
                ) : isPremium ? (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-700 flex items-center justify-between">
                        <div>✓ Premium user — unlimited downloads</div>
                    </div>
                ) : remaining !== null && remaining > 0 ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700 flex items-center justify-between">
                        <div>{remaining} free download{remaining !== 1 ? "s" : ""} left today</div>
                        <button onClick={() => setShowPremiumModal(true)} className="text-sm text-purple-600 hover:underline">Upgrade</button>
                    </div>
                ) : (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700 flex items-center justify-between">
                        <div>Daily download limit reached. Upgrade for unlimited downloads.</div>
                        <button onClick={() => setShowPremiumModal(true)} className="text-sm text-purple-600 hover:underline">Upgrade</button>
                    </div>
                )}
            </div>

            <DownloadHistory userId={userId} />

            {showPremiumModal && (
                <PremiumCheckout
                    userId={userId}
                    isOpen={showPremiumModal}
                    onClose={() => setShowPremiumModal(false)}
                    onSuccess={() => {
                        setShowPremiumModal(false);
                        setCheckingLimit(true);
                        axiosInstance.post("/download/check-limit", { userid: userId })
                            .then((res) => {
                                setCanDownload(res.data.canDownload ?? false);
                                setRemaining(typeof res.data.remaining === "number" ? res.data.remaining : null);
                                setIsPremium(!!res.data.isPremium);
                            })
                            .catch(() => { })
                            .finally(() => setCheckingLimit(false));
                    }}
                />
            )}
        </div>
    );
};

export default DownloadContent;
