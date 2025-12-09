"use client";

import React, { useEffect, useState } from "react";
import DownloadHistory from "./DownloadHistory";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";

const DownloadContent = () => {
    const { user } = useUser();
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsReady(true);
    }, []);

    if (!isReady) {
        return <div className="text-center py-12">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Please log in to view your downloads
                </h2>
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

    return <DownloadHistory userId={userId} />;
};

export default DownloadContent;
