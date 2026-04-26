// // import { useMemo, useState } from "react";
// // import axios from "axios";
// // import { toast } from "react-toastify";

// // const aiServiceURL = import.meta.env.VITE_AI_SERVICE_URL || "http://127.0.0.1:8000";

// // const AITutorPanel = ({ courseId, courseTitle, sourceHint }) => {
// //   const [question, setQuestion] = useState("");
// //   const [mode, setMode] = useState("qa");
// //   const [answer, setAnswer] = useState("");
// //   const [retrievedChunks, setRetrievedChunks] = useState([]);
// //   const [isLoading, setIsLoading] = useState(false);

// //   const normalizedCourseId = useMemo(() => String(courseId || "").trim(), [courseId]);

// //   const askTutor = async (event) => {
// //     event.preventDefault();

// //     if (!normalizedCourseId) {
// //       toast.error("Course context is not available yet.");
// //       return;
// //     }

// //     if (!question.trim()) {
// //       toast.error("Enter a question or request first.");
// //       return;
// //     }

// //     try {
// //       setIsLoading(true);
// //       setAnswer("");
// //       setRetrievedChunks([]);

// //       const { data } = await axios.post(`${aiServiceURL}/v1/chat`, {
// //         course_id: normalizedCourseId,
// //         question: question.trim(),
// //         mode,
// //       });

// //       if (data?.success) {
// //         setAnswer(data.answer || "");
// //         setRetrievedChunks(Array.isArray(data.retrieved_chunks) ? data.retrieved_chunks : []);
// //       } else {
// //         toast.error(data?.message || "Failed to get an AI response");
// //       }
// //     } catch (error) {
// //       toast.error(error.response?.data?.detail || error.response?.data?.message || "AI tutor request failed");
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const modeLabels = {
// //     qa: "Ask a question",
// //     summary: "Summarize",
// //     explain: "Explain simply",
// //   };

// //   return (
// //     <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-xl">
// //       <div className="flex flex-wrap items-start justify-between gap-3">
// //         <div>
// //           <p className="text-xs uppercase tracking-[0.22em] text-sky-300">AI Tutor</p>
// //           <h3 className="mt-1 text-xl font-semibold">Course-aware assistant</h3>
// //           <p className="mt-1 text-sm text-slate-300">
// //             Ask about {courseTitle || "this course"}, request a summary, or ask for a simple explanation.
// //           </p>
// //         </div>
// //         <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
// //           {sourceHint || "AI Service"}
// //         </span>
// //       </div>

// //       <form onSubmit={askTutor} className="mt-5 space-y-3">
// //         <div className="flex flex-wrap gap-2">
// //           {Object.entries(modeLabels).map(([value, label]) => (
// //             <button
// //               key={value}
// //               type="button"
// //               onClick={() => setMode(value)}
// //               className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
// //                 mode === value
// //                   ? "bg-sky-400 text-slate-950"
// //                   : "bg-white/5 text-slate-200 hover:bg-white/10"
// //               }`}
// //             >
// //               {label}
// //             </button>
// //           ))}
// //         </div>

// //         <textarea
// //           rows={4}
// //           value={question}
// //           onChange={(event) => setQuestion(event.target.value)}
// //           placeholder="Ask something about the lecture, request a summary, or ask for a simple explanation..."
// //           className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-400"
// //         />

// //         <div className="flex flex-wrap items-center gap-3">
// //           <button
// //             type="submit"
// //             disabled={isLoading}
// //             className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-500"
// //           >
// //             {isLoading ? "Thinking..." : "Ask AI Tutor"}
// //           </button>
// //           <p className="text-xs text-slate-400">
// //             Responses come from the course vector store when content has been indexed.
// //           </p>
// //         </div>
// //       </form>

// //       {answer && (
// //         <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
// //           <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Answer</p>
// //           <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{answer}</p>
// //         </div>
// //       )}

// //       {retrievedChunks.length > 0 && (
// //         <div className="mt-4">
// //           <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Retrieved context</p>
// //           <div className="mt-2 space-y-2">
// //             {retrievedChunks.slice(0, 3).map((chunk, index) => (
// //               <div key={`${chunk.chunk_index || index}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
// //                 <p className="text-xs text-slate-400">
// //                   Chunk {chunk.chunk_index ?? index + 1} {typeof chunk.score === "number" ? `· score ${chunk.score.toFixed(3)}` : ""}
// //                 </p>
// //                 <p className="mt-1 whitespace-pre-wrap">{chunk.text}</p>
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default AITutorPanel;
// // frontend/src/components/course/AITutorPanel.jsx

// import { useState, useRef, useEffect, useContext } from 'react';
// import axios from 'axios';
// import { AppContext } from '../../context/AppContext';

// const AITutorPanel = ({ courseId, courseTitle, sourceHint }) => {

//   const { backendURL, token } = useContext(AppContext);

//   // messages = array of { role: 'user' | 'bot', text: string }
//   const [messages, setMessages] = useState([
//     {
//       role: 'bot',
//       text: `Hi! I'm your AI tutor for this course. Ask me anything about the lecture content, or any general topic you're studying.`
//     }
//   ]);

//   const [inputText, setInputText]   = useState('');
//   const [isLoading, setIsLoading]   = useState(false);
//   const bottomRef                    = useRef(null);

//   // Auto scroll to bottom whenever messages update
//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//   const sendMessage = async () => {

//     // Don't send empty messages
//     const question = inputText.trim();
//     if (!question || isLoading) return;

//     console.log('[AITutorPanel] Sending question:', question);
//     console.log('[AITutorPanel] Course ID:', courseId);

//     // Add user message to chat immediately
//     setMessages(prev => [...prev, { role: 'user', text: question }]);
//     setInputText('');
//     setIsLoading(true);

//     try {
//       const { data } = await axios.post(
//         `${backendURL}/ai/chat`,
//         {
//           question:  question,
//           course_id: courseId
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           },
//           timeout: 90000 // 90 seconds — LLM can be slow
//         }
//       );

//       console.log('[AITutorPanel] Answer received:', data.answer);

//       // Add bot answer to chat
//       setMessages(prev => [
//         ...prev,
//         { role: 'bot', text: data.answer || 'Sorry, I could not generate an answer.' }
//       ]);

//     } catch (error) {
//       console.error('[AITutorPanel] Error:', error);

//       const errorMsg = error.response?.data?.error
//         || 'AI service is currently unavailable. Make sure the AI service is running.';

//       setMessages(prev => [
//         ...prev,
//         { role: 'bot', text: `⚠️ ${errorMsg}` }
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Send on Enter key
//   const handleKeyDown = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   return (
//     <div className="bg-white rounded-lg shadow-lg p-6 mt-8">

//       {/* Header */}
//       <div className="flex items-center gap-3 mb-4">
//         <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
//           AI
//         </div>
//         <div>
//           <h3 className="text-lg font-semibold text-gray-800">AI Tutor</h3>
//           {sourceHint && (
//             <p className="text-xs text-gray-400">{sourceHint}</p>
//           )}
//         </div>
//       </div>

//       {/* Chat messages */}
//       <div className="h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50 mb-4">

//         {messages.map((msg, index) => (
//           <div
//             key={index}
//             className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
//           >
//             <div
//               className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
//                 msg.role === 'user'
//                   ? 'bg-blue-600 text-white rounded-br-sm'
//                   : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
//               }`}
//             >
//               {msg.text}
//             </div>
//           </div>
//         ))}

//         {/* Loading indicator */}
//         {isLoading && (
//           <div className="flex justify-start">
//             <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
//               <div className="flex gap-1 items-center">
//                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
//                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
//                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Invisible div to scroll to */}
//         <div ref={bottomRef} />
//       </div>

//       {/* Input area */}
//       <div className="flex gap-2">
//         <input
//           type="text"
//           value={inputText}
//           onChange={(e) => setInputText(e.target.value)}
//           onKeyDown={handleKeyDown}
//           placeholder="Ask about this course..."
//           disabled={isLoading}
//           className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
//         />
//         <button
//           onClick={sendMessage}
//           disabled={isLoading || !inputText.trim()}
//           className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
//         >
//           {isLoading ? '...' : 'Send'}
//         </button>
//       </div>

//       {/* Hint text */}
//       <p className="text-xs text-gray-400 mt-2">
//         Press Enter to send. Answers are based on your course lecture content.
//       </p>

//     </div>
//   );
// };

// export default AITutorPanel;
import { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

const AITutorPanel = ({ courseId, courseTitle, sourceHint }) => {

  const { backendURL, token } = useContext(AppContext);

  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hi! I'm your AI tutor. Ask me anything about this course content or any related topic."
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const question = inputText.trim();
    if (!question || isLoading) return;

    console.log('[AITutorPanel] Question:', question);
    console.log('[AITutorPanel] Course ID:', courseId);

    // Show user message immediately
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setInputText('');
    setIsLoading(true);

    try {
      const { data } = await axios.post(
        `${backendURL}/ai/chat`,
        {
          question:  question,
          course_id: courseId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 90000
        }
      );

      console.log('[AITutorPanel] Answer:', data.answer);

      setMessages(prev => [
        ...prev,
        { role: 'bot', text: data.answer || 'Sorry, I could not generate an answer.' }
      ]);

    } catch (error) {
      console.error('[AITutorPanel] Error:', error);

      const errorMsg = error.response?.data?.error
        || 'AI service is currently unavailable. Make sure all 3 servers are running.';

      setMessages(prev => [
        ...prev,
        { role: 'bot', text: `⚠️ ${errorMsg}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          AI
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">AI Tutor</h3>
          <p className="text-xs text-gray-400">
            {sourceHint || 'Powered by Llama 3.2 + RAG pipeline'}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50 mb-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Animated loading dots while waiting for LLM */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this course..."
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !inputText.trim()}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Press Enter to send. Answers are grounded in your course lecture content.
      </p>
    </div>
  );
};

export default AITutorPanel;