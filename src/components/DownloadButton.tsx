"use client";

import React, { useState, useEffect } from "react";
import { Download, Lock, AlertCircle, Crown } from "lucide-react";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";
import PremiumCheckout from "./PremiumCheckout";

interface DownloadButtonProps {
  videoId: string;
  videoTitle: string;
  userId?: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  videoId,
  videoTitle,
  userId: propUserId,
}) => {
  const userContext = useUser();
  const userId = propUserId || userContext?.user?._id;
  const [canDownload, setCanDownload] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  useEffect(() => {
    if (userId) {
      checkDownloadLimit();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const checkDownloadLimit = async () => {
    try {
      const res = await axiosInstance.post("/download/check-limit", { userid: userId });
      setCanDownload(res.data.canDownload);
      setRemaining(res.data.remaining);
      setIsPremium(res.data.isPremium);
    } catch (error: any) {
      console.error("Error checking download limit:", error);
      toast.error("Failed to check download limit");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!userId) {
      toast.error("Please login to download videos");
      return;
    }

    if (!canDownload && !isPremium) {
      setShowPremiumModal(true);
      return;
    }

    setDownloading(true);
    try {
      const res = await axiosInstance.post("/download/download", {
        videoid: videoId,
        userid: userId,
      });

      if (res.data.success) {
        // Download the video file
        const link = document.createElement("a");
        link.href = res.data.downloadData.filepath;
        link.download = res.data.downloadData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("✓ Video downloaded successfully!");
        await checkDownloadLimit();
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setShowPremiumModal(true);
        toast.error("Daily limit reached. Upgrade to premium!");
      } else {
        toast.error(error.response?.data?.message || "Download failed");
      }
    } finally {
      setDownloading(false);
    }
  };

  if (!userId) {
    return (
      <Button disabled className="gap-2 w-full sm:w-auto">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Login to Download</span>
        <span className="sm:hidden">Login</span>
      </Button>
    );
  }

  if (loading) {
    return (
      <Button disabled className="gap-2 w-full sm:w-auto">
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Loading...</span>
        <span className="sm:hidden">...</span>
      </Button>
    );
  }

  return (
    <>
      <div className="space-y-2 sm:space-y-3">
        <Button
          onClick={handleDownload}
          disabled={downloading || (!canDownload && !isPremium)}
          variant={canDownload || isPremium ? "default" : "outline"}
          className={`gap-2 w-full sm:w-auto text-xs sm:text-sm ${isPremium ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""
            }`}
        >
          <Download className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">
            {downloading ? "Downloading..." : "Download Video"}
          </span>
          <span className="sm:hidden">
            {downloading ? "..." : "Download"}
          </span>
          {isPremium && <Crown className="w-3 h-3 sm:w-4 sm:h-4" />}
        </Button>

        {!isPremium && (
          <>
            {remaining > 0 && (
              <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded text-xs sm:text-sm text-blue-700 flex items-center gap-1 sm:gap-2">
                <span className="text-base sm:text-lg">ℹ️</span>
                <span>
                  {remaining} free download{remaining !== 1 ? "s" : ""} left
                </span>
              </div>
            )}

            {remaining === 0 && (
              <>
                <div className="p-2 sm:p-3 bg-orange-50 border border-orange-200 rounded flex items-center gap-1 sm:gap-2">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-orange-700 leading-tight">
                    Limit reached. Upgrade for unlimited!
                  </span>
                </div>

                <Button
                  onClick={() => setShowPremiumModal(true)}
                  variant="outline"
                  className="gap-1 sm:gap-2 w-full border-purple-500 text-purple-600 hover:bg-purple-50 text-xs sm:text-sm"
                >
                  <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Upgrade to Premium</span>
                  <span className="sm:hidden">Upgrade</span>
                </Button>
              </>
            )}
          </>
        )}

        {isPremium && (
          <div className="p-2 sm:p-3 bg-purple-50 border border-purple-200 rounded text-xs sm:text-sm text-purple-700 flex items-center gap-1 sm:gap-2">
            <Crown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>✓ Premium - Unlimited</span>
          </div>
        )}
      </div>

      {/* Premium Checkout Modal */}
      {showPremiumModal && userId && (
        <PremiumCheckout
          userId={userId}
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onSuccess={() => {
            setShowPremiumModal(false);
            checkDownloadLimit();
          }}
        />
      )}
    </>
  );
};

export default DownloadButton;
