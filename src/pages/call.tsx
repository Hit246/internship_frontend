"use client";

import CallPanel from "@/components/CallPanel";

export default function CallPage() {
  return (
    <div className="w-full">
      <div className="p-4">
        <h1 className="text-2xl font-semibold mb-4 text-white">Call & Screen Share</h1>
        <CallPanel />
      </div>
    </div>
  );
}

