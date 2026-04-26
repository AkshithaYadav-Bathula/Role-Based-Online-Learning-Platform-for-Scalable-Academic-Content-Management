import { useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const aiServiceURL = import.meta.env.VITE_AI_SERVICE_URL || "http://127.0.0.1:8000";

const AITutorPanel = ({ courseId, courseTitle, sourceHint }) => {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("qa");
  const [answer, setAnswer] = useState("");
  const [retrievedChunks, setRetrievedChunks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const normalizedCourseId = useMemo(() => String(courseId || "").trim(), [courseId]);

  const askTutor = async (event) => {
    event.preventDefault();

    if (!normalizedCourseId) {
      toast.error("Course context is not available yet.");
      return;
    }

    if (!question.trim()) {
      toast.error("Enter a question or request first.");
      return;
    }

    try {
      setIsLoading(true);
      setAnswer("");
      setRetrievedChunks([]);

      const { data } = await axios.post(`${aiServiceURL}/v1/chat`, {
        course_id: normalizedCourseId,
        question: question.trim(),
        mode,
      });

      if (data?.success) {
        setAnswer(data.answer || "");
        setRetrievedChunks(Array.isArray(data.retrieved_chunks) ? data.retrieved_chunks : []);
      } else {
        toast.error(data?.message || "Failed to get an AI response");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "AI tutor request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const modeLabels = {
    qa: "Ask a question",
    summary: "Summarize",
    explain: "Explain simply",
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-300">AI Tutor</p>
          <h3 className="mt-1 text-xl font-semibold">Course-aware assistant</h3>
          <p className="mt-1 text-sm text-slate-300">
            Ask about {courseTitle || "this course"}, request a summary, or ask for a simple explanation.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {sourceHint || "AI Service"}
        </span>
      </div>

      <form onSubmit={askTutor} className="mt-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(modeLabels).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                mode === value
                  ? "bg-sky-400 text-slate-950"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          rows={4}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask something about the lecture, request a summary, or ask for a simple explanation..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {isLoading ? "Thinking..." : "Ask AI Tutor"}
          </button>
          <p className="text-xs text-slate-400">
            Responses come from the course vector store when content has been indexed.
          </p>
        </div>
      </form>

      {answer && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Answer</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{answer}</p>
        </div>
      )}

      {retrievedChunks.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Retrieved context</p>
          <div className="mt-2 space-y-2">
            {retrievedChunks.slice(0, 3).map((chunk, index) => (
              <div key={`${chunk.chunk_index || index}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <p className="text-xs text-slate-400">
                  Chunk {chunk.chunk_index ?? index + 1} {typeof chunk.score === "number" ? `· score ${chunk.score.toFixed(3)}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{chunk.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITutorPanel;