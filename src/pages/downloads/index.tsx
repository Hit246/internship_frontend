import React, { Suspense } from "react";
import DownloadContent from "@/components/DownloadContent";

const index = () => {
    return (
        <main className="flex-1 p-6">
            <div className="max-w-5xl">
                <h1 className="text-2xl font-bold mb-6">Downloads</h1>
                <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
                    <DownloadContent />
                </Suspense>
            </div>
        </main>
    );
};

export default index;
