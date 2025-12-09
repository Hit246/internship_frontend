"use client";

import React, { useState, useEffect } from "react";
import { Download, Trash2, Calendar, Play } from "lucide-react";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import Link from "next/link";

interface DownloadRecord {
    _id: string;
    videoid: {
        _id: string;
        videotitle: string;
        thumbnail: string;
        views: number;
        createdAt: string;
    };
    downloadedAt: string;
}

interface DownloadHistoryProps {
    userId: string;
}

const DownloadHistory: React.FC<DownloadHistoryProps> = ({ userId }) => {
    const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (userId) {
            fetchDownloadHistory();
        }
    }, [userId]);

    const fetchDownloadHistory = async () => {
        try {
            setError("");
            const response = await axiosInstance.get(`/download/history/${userId}`);
            setDownloads(response.data.downloads || []);
        } catch (err: any) {
            const errorMsg =
                err.response?.data?.message || "Failed to fetch download history";
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (downloadId: string) => {
        if (!confirm("Are you sure you want to remove this from download history?"))
            return;

        try {
            await axiosInstance.delete(`/download/delete/${downloadId}`, {
                data: { userid: userId },
            });

            setDownloads(downloads.filter((d) => d._id !== downloadId));
            toast.success("Removed from download history");
        } catch (err: any) {
            const errorMsg =
                err.response?.data?.message || "Failed to delete download";
            toast.error(errorMsg);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <p className="text-gray-500">Loading download history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {error}
            </div>
        );
    }

    if (downloads.length === 0) {
        return (
            <div className="text-center py-12">
                <Download className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No downloaded videos yet</p>
                <p className="text-gray-400 text-sm">
                    Videos you download will appear here
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Download History</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {downloads.length} downloaded video{downloads.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <Button onClick={fetchDownloadHistory} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4">
                {downloads.map((download) => (
                    <div
                        key={download._id}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="flex flex-col sm:flex-row gap-4 p-4">
                            {/* Thumbnail */}
                            <div className="flex-shrink-0">
                                {download.videoid.thumbnail ? (
                                    <img
                                        src={download.videoid.thumbnail}
                                        alt={download.videoid.videotitle}
                                        className="w-full sm:w-32 h-24 object-cover rounded"
                                    />
                                ) : (
                                    <div className="w-full sm:w-32 h-24 bg-gray-300 rounded flex items-center justify-center">
                                        <Play className="w-8 h-8 text-gray-500" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <Link href={`/watch/${download.videoid._id}`}>
                                    <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate cursor-pointer">
                                        {download.videoid.videotitle}
                                    </h3>
                                </Link>

                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                        <Download className="w-4 h-4" />
                                        <span>Downloaded {formatDate(download.downloadedAt)}</span>
                                    </div>
                                    {download.videoid.views !== undefined && (
                                        <div className="flex items-center gap-1">
                                            <span>👁️ {download.videoid.views} views</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Link href={`/watch/${download.videoid._id}`}>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <Play className="w-4 h-4" />
                                        Watch
                                    </Button>
                                </Link>
                                <Button
                                    onClick={() => handleDelete(download._id)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DownloadHistory;
