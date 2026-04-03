import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const CourseDoubtsPanel = ({
  courseId,
  courseTitle,
  backendURL,
  token,
  mode = "student",
  canAsk = false,
  className = "",
}) => {
  const [doubts, setDoubts] = useState([]);
  const [question, setQuestion] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [replyingId, setReplyingId] = useState(null);

  const fetchDoubts = async () => {
    if (!courseId || !token) {
      setDoubts([]);
      return;
    }

    try {
      setLoading(true);

      const endpoint =
        mode === "educator"
          ? `${backendURL}/educators/courses/${courseId}/doubts`
          : `${backendURL}/users/course_doubts?course_id=${courseId}`;

      const { data } = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        const doubtsData = data.doubts || [];
        setDoubts(doubtsData);
        setReplyDrafts(
          doubtsData.reduce((accumulator, doubt) => {
            accumulator[doubt.id] = doubt.reply || "";
            return accumulator;
          }, {})
        );
      } else {
        toast.error(data.message || "Failed to load doubts");
      }
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || "Failed to load doubts";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, token, mode]);

  const handleQuestionSubmit = async (event) => {
    event.preventDefault();

    if (!question.trim()) {
      toast.error("Question cannot be empty");
      return;
    }

    try {
      setSubmittingQuestion(true);

      const { data } = await axios.post(
        `${backendURL}/users/course_doubts`,
        {
          course_id: courseId,
          question: question.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.success) {
        toast.success("Doubt posted successfully");
        setQuestion("");
        await fetchDoubts();
      } else {
        toast.error(data.message || "Failed to post doubt");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post doubt");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleReplySubmit = async (doubtId) => {
    const reply = (replyDrafts[doubtId] || "").trim();

    if (!reply) {
      toast.error("Reply cannot be empty");
      return;
    }

    try {
      setReplyingId(doubtId);

      const { data } = await axios.post(
        `${backendURL}/educators/courses/${courseId}/doubts/${doubtId}/reply`,
        { reply },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.success) {
        toast.success("Reply saved successfully");
        await fetchDoubts();
      } else {
        toast.error(data.message || "Failed to save reply");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save reply");
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <section className={`mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Course discussion</p>
        <h3 className="mt-1 text-xl font-semibold text-slate-900">
          {courseTitle ? `${courseTitle} doubts` : "Course doubts"}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Ask questions about the lessons and keep the answers attached to this course.
        </p>
      </div>

      <div className="space-y-5 p-5">
        {mode === "student" && canAsk && (
          <form onSubmit={handleQuestionSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Ask a doubt</label>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="Write your question here..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submittingQuestion}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submittingQuestion ? "Posting..." : "Post doubt"}
              </button>
            </div>
          </form>
        )}

        {!token ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Sign in to view and post doubts for this course.
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Loading doubts...
          </div>
        ) : doubts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No doubts have been posted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {doubts.map((doubt) => (
              <article key={doubt.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{doubt.user_name || "Student"}</p>
                    <p className="text-xs text-slate-500">
                      {doubt.created_at ? new Date(doubt.created_at).toLocaleString() : "Just now"}
                    </p>
                  </div>
                  {doubt.answered ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      Answered
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                      Pending
                    </span>
                  )}
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{doubt.question}</p>

                {doubt.reply ? (
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Reply</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{doubt.reply}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {doubt.educator_name ? `Replied by ${doubt.educator_name}` : "Replied"}
                      {doubt.replied_at ? ` • ${new Date(doubt.replied_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                ) : mode === "educator" ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={replyDrafts[doubt.id] || ""}
                      onChange={(event) =>
                        setReplyDrafts((previous) => ({
                          ...previous,
                          [doubt.id]: event.target.value,
                        }))
                      }
                      rows={4}
                      placeholder="Write your reply here..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleReplySubmit(doubt.id)}
                        disabled={replyingId === doubt.id}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {replyingId === doubt.id ? "Saving..." : "Save reply"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                    Waiting for educator reply.
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CourseDoubtsPanel;