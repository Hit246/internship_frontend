"use client";

import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface CommentType {
  _id: string;
  videoid: string;
  userid: string;
  usercommented: string;
  commentbody: string;
  city?: string;
  likes?: number;
  dislikes?: number;
  deleted?: boolean;
  commentedon: string;
  translatedText?: string;
}

const COMMENT_ALLOWED_REGEX = new RegExp(
  String.raw`^[\p{L}\p{N}\s.,?!:;'"\-()/]+$`,
  "u"
);

const Comments = ({ videoId }: { videoId: string }) => {
  const { user } = useUser();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [translateTo, setTranslateTo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // -------------------------------
  // LOAD COMMENTS
  // -------------------------------
  const loadComments = async () => {
    setLoading(true);
    try {
      const query = translateTo ? `?translateTo=${translateTo}` : "";
      const res = await axiosInstance.get(`/comment/${videoId}${query}`);

      setComments(res.data.comments || res.data); // handle both array and {comments:[]}
    } catch (error) {
      console.error("loadComments error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [videoId, translateTo]);

  // -------------------------------
  // CREATE COMMENT
  // -------------------------------
  const handleSubmitComment = async () => {
    if (!user) return;
    const cleaned = newComment.trim();

    if (!cleaned) return;
    if (!COMMENT_ALLOWED_REGEX.test(cleaned)) {
      alert("Comment contains forbidden characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: cleaned,
        usercommented: user.name,
      });

      const saved = res.data.comment;

      setComments((prev) => [saved, ...prev]);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------
  // EDIT COMMENT
  // -------------------------------
  const handleEdit = (comment: CommentType) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    const cleaned = editText.trim();
    if (!cleaned) return;

    if (!COMMENT_ALLOWED_REGEX.test(cleaned)) {
      alert("Comment contains forbidden characters.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: cleaned,
      });

      setComments((prev) =>
        prev.map((c) =>
          c._id === editingCommentId ? { ...c, commentbody: cleaned } : c
        )
      );
      setEditingCommentId(null);
      setEditText("");
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  // -------------------------------
  // DELETE COMMENT
  // -------------------------------
  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // -------------------------------
  // LIKE / DISLIKE COMMENT
  // -------------------------------
  const reactComment = async (id: string, type: "like" | "dislike") => {
    try {
      const res = await axiosInstance.post(`/comment/react/${id}`, { type });

      const updated = res.data.comment;
      const autoDeleted = res.data.autoDeleted;

      if (autoDeleted || updated.deleted) {
        // remove from UI
        setComments((prev) => prev.filter((c) => c._id !== id));
      } else {
        // update counts
        setComments((prev) =>
          prev.map((c) => (c._id === id ? updated : c))
        );
      }
    } catch (error) {
      console.error("reactComment error:", error);
    }
  };

  // -------------------------------
  // RENDER UI
  // -------------------------------
  if (loading) return <div>Loading comments...</div>;

  return (
    <div className="space-y-6">
      {/* COMMENT HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

        {/* TRANSLATE DROPDOWN */}
        <select
          className="border p-1 text-sm"
          value={translateTo}
          onChange={(e) => setTranslateTo(e.target.value)}
        >
          <option value="">Original</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="es">Spanish</option>
        </select>
      </div>

      {/* COMMENT INPUT */}
      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none"
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !newComment.trim()}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENT LIST */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 italic">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarFallback>{comment.usercommented?.[0] || "U"}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                {/* USER + TIME + CITY */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.usercommented}</span>
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                  {comment.city && (
                    <span className="text-xs text-gray-500">• {comment.city}</span>
                  )}
                </div>

                {/* EDIT / NORMAL VIEW */}
                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button onClick={handleUpdateComment}>Save</Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* COMMENT TEXT (translated or original) */}
                    <p className="text-sm">
                      {comment.translatedText ?? comment.commentbody}
                    </p>

                    {/* ACTIONS */}
                    <div className="flex gap-4 mt-2 text-sm text-gray-600">
                      <button onClick={() => reactComment(comment._id, "like")}>
                        👍 {comment.likes || 0}
                      </button>
                      <button onClick={() => reactComment(comment._id, "dislike")}>
                        👎 {comment.dislikes || 0}
                      </button>

                      {user?._id === comment.userid && (
                        <>
                          <button onClick={() => handleEdit(comment)}>Edit</button>
                          <button onClick={() => handleDelete(comment._id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
