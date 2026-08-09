"use client";

import { useState } from "react";

const API_URL = "http://localhost:8000";

export default function InterviewChat() {
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState("");
  const [day, setDay] = useState<number | null>(null);

  const [answer, setAnswer] = useState("");
  const [interviewId, setInterviewId] = useState("");

  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(8);

  const [evaluation, setEvaluation] = useState("");

  const [finalFeedback, setFinalFeedback] = useState("");
  const [finalScore, setFinalScore] = useState<number | null>(null);

  // ==========================================================
  // START INTERVIEW
  // ==========================================================

  async function startInterview() {
    try {
      setLoading(true);
      setCompleted(false);
      setEvaluation("");
      setFinalFeedback("");
      setFinalScore(null);

      console.log("Starting interview...");
      console.log("Backend:", API_URL);

      const response = await fetch(
        `${API_URL}/interview/start?candidate_id=candidate_001`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const text = await response.text();

      console.log("START STATUS:", response.status);
      console.log("START RESPONSE:", text);

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Backend returned invalid response: ${text}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail
            ? JSON.stringify(data.detail)
            : `Start failed: ${response.status}`
        );
      }

      setInterviewId(data.interview_id || "");
      setQuestion(data.question || "");
      setTopic(data.topic || "");
      setDay(data.day ?? null);

      setQuestionNumber(data.question_number || 1);
      setTotalQuestions(data.total_questions || 8);

      setStarted(true);
    } catch (error) {
      console.error("START ERROR:", error);

      if (error instanceof TypeError) {
        alert(
          "Could not connect to FastAPI.\n\n" +
            "Make sure the backend is running on http://localhost:8000"
        );
      } else if (error instanceof Error) {
        alert(
          `Could not start interview.\n\n${error.message}`
        );
      } else {
        alert("Could not start interview.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // GET FINAL FEEDBACK
  // ==========================================================

  async function getFinalFeedback(id: string) {
    try {
      console.log("Getting final feedback...");
      console.log("Interview ID:", id);

      const response = await fetch(
        `${API_URL}/interview/feedback/${id}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const text = await response.text();

      console.log("FEEDBACK STATUS:", response.status);
      console.log("FEEDBACK RESPONSE:", text);

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Invalid feedback response: ${text}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail
            ? JSON.stringify(data.detail)
            : `Feedback failed: ${response.status}`
        );
      }

      console.log("FINAL FEEDBACK DATA:", data);

      setFinalFeedback(data.feedback || "");

      setFinalScore(
        data.average_score ?? null
      );
    } catch (error) {
      console.error(
        "FINAL FEEDBACK ERROR:",
        error
      );

      if (error instanceof Error) {
        alert(
          `Could not load final feedback.\n\n${error.message}`
        );
      } else {
        alert("Could not load final feedback.");
      }
    }
  }

  // ==========================================================
  // SUBMIT ANSWER
  // ==========================================================

  async function submitAnswer() {
    if (completed) {
      return;
    }

    if (!answer.trim()) {
      alert("Please enter your answer first.");
      return;
    }

    if (!interviewId) {
      alert("Interview has not started.");
      return;
    }

    try {
      setLoading(true);

      console.log("Sending answer:", answer);
      console.log("Interview ID:", interviewId);

      const response = await fetch(
        `${API_URL}/interview/answer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            interview_id: interviewId,
            answer: answer,
          }),
        }
      );

      const text = await response.text();

      console.log(
        "ANSWER STATUS:",
        response.status
      );

      console.log(
        "ANSWER RESPONSE:",
        text
      );

      let data: any;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Backend returned invalid response: ${text}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail
            ? JSON.stringify(data.detail)
            : `Answer submission failed: ${response.status}`
        );
      }

      console.log(
        "ANSWER DATA:",
        data
      );

      // ======================================================
      // SHOW CURRENT AI EVALUATION
      // ======================================================

      if (data.ai_response) {
        setEvaluation(data.ai_response);
      }

      // ======================================================
      // INTERVIEW COMPLETED
      // ======================================================

      if (
        data.interview_completed === true
      ) {
        console.log(
          "Interview completed. Getting final feedback..."
        );

        setCompleted(true);
        setAnswer("");

        setQuestionNumber(8);
        setTotalQuestions(8);

        setQuestion(
          "Interview Completed!"
        );

        // Get final Gemini feedback
        await getFinalFeedback(
          interviewId
        );

        return;
      }

      // ======================================================
      // NEXT QUESTION
      // ======================================================

      if (data.next_question) {
        setQuestion(
          data.next_question
        );
      } else if (data.question) {
        setQuestion(
          data.question
        );
      }

      // ======================================================
      // UPDATE TOPIC
      // ======================================================

      if (
        data.topic !== undefined
      ) {
        setTopic(data.topic);
      }

      // ======================================================
      // UPDATE DAY
      // ======================================================

      if (
        data.day !== undefined
      ) {
        setDay(data.day);
      }

      // ======================================================
      // UPDATE QUESTION NUMBER
      // ======================================================

      if (
        data.question_number !== undefined
      ) {
        setQuestionNumber(
          data.question_number
        );
      }

      // ======================================================
      // UPDATE TOTAL QUESTIONS
      // ======================================================

      if (
        data.total_questions !== undefined
      ) {
        setTotalQuestions(
          data.total_questions
        );
      }

      setAnswer("");

    } catch (error) {
      console.error(
        "SUBMIT ERROR:",
        error
      );

      if (
        error instanceof TypeError
      ) {
        alert(
          "Could not connect to FastAPI.\n\n" +
            "Make sure the backend is running on http://localhost:8000"
        );
      } else if (
        error instanceof Error
      ) {
        alert(
          `Could not submit answer.\n\n${error.message}`
        );
      } else {
        alert(
          "Could not submit answer."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div>

      {/* =====================================================
          BEFORE INTERVIEW
      ===================================================== */}

      {!started ? (
        <div className="text-center">

          <h1 className="text-3xl font-bold mb-6">
            AI Interviewer
          </h1>

          <button
            type="button"
            onClick={startInterview}
            disabled={loading}
            className="
              bg-blue-600
              hover:bg-blue-700
              disabled:bg-gray-400
              text-white
              font-semibold
              px-6
              py-3
              rounded-lg
            "
          >
            {loading
              ? "Starting..."
              : "Start Interview"}
          </button>

        </div>
      ) : (

        <div>

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="mb-6">

            <h1 className="
              text-2xl
              font-bold
              text-gray-800
            ">
              AI Interview
            </h1>

            <p className="
              text-gray-600
              mt-2
            ">
              Topic: {topic}
            </p>

            {day !== null && (
              <p className="
                text-sm
                text-gray-500
              ">
                Day: {day}
              </p>
            )}

            <p className="
              text-sm
              text-gray-500
              mt-2
            ">
              Question {questionNumber} / {totalQuestions}
            </p>

          </div>


          {/* =================================================
              QUESTION
          ================================================= */}

          {!completed && (
            <div className="
              bg-gray-100
              rounded-lg
              p-5
            ">

              <h2 className="
                text-xl
                font-semibold
                text-gray-800
              ">
                {question}
              </h2>

            </div>
          )}


          {/* =================================================
              CURRENT AI EVALUATION
          ================================================= */}

          {evaluation && !completed && (
            <div className="
              mt-6
              bg-blue-50
              border
              border-blue-200
              rounded-lg
              p-5
            ">

              <h3 className="
                text-lg
                font-semibold
                text-blue-800
                mb-2
              ">
                AI Evaluation
              </h3>

              <p className="
                whitespace-pre-wrap
                text-gray-700
              ">
                {evaluation}
              </p>

            </div>
          )}


          {/* =================================================
              ANSWER AREA
          ================================================= */}

          {!completed ? (

            <>

              <textarea
                value={answer}
                onChange={(e) =>
                  setAnswer(e.target.value)
                }
                placeholder="Type your answer here..."
                disabled={loading}
                className="
                  w-full
                  mt-6
                  p-4
                  border
                  border-gray-300
                  rounded-lg
                  min-h-[150px]
                  text-gray-800
                "
              />

              <button
                type="button"
                onClick={submitAnswer}
                disabled={loading}
                className="
                  mt-4
                  bg-green-600
                  hover:bg-green-700
                  disabled:bg-gray-400
                  text-white
                  font-semibold
                  px-6
                  py-3
                  rounded-lg
                "
              >
                {loading
                  ? "Evaluating..."
                  : "Submit Answer"}
              </button>

            </>

          ) : (

            /* =================================================
               FINAL FEEDBACK
            ================================================= */

            <div className="
              mt-6
              bg-green-50
              border
              border-green-300
              rounded-lg
              p-6
            ">

              <h2 className="
                text-2xl
                font-bold
                text-green-700
                text-center
              ">
                🎉 Interview Completed
              </h2>

              <p className="
                mt-2
                text-gray-700
                text-center
              ">
                Thank you for completing
                the interview.
              </p>


              {/* =============================================
                  FINAL SCORE
              ============================================= */}

              {finalScore !== null && (
                <div className="
                  mt-6
                  text-center
                ">

                  <p className="
                    text-lg
                    font-semibold
                    text-gray-700
                  ">
                    Final Score
                  </p>

                  <p className="
                    text-4xl
                    font-bold
                    text-green-700
                    mt-2
                  ">
                    {finalScore}/10
                  </p>

                </div>
              )}


              {/* =============================================
                  FINAL AI FEEDBACK
              ============================================= */}

              {finalFeedback ? (

                <div className="
                  mt-8
                  bg-white
                  border
                  border-gray-200
                  rounded-lg
                  p-6
                ">

                  <h3 className="
                    text-xl
                    font-bold
                    text-gray-800
                    mb-4
                  ">
                    📋 Final AI Feedback
                  </h3>

                  <p className="
                    whitespace-pre-wrap
                    text-gray-700
                    leading-relaxed
                  ">
                    {finalFeedback}
                  </p>

                </div>

              ) : (

                <div className="
                  mt-8
                  text-center
                  text-gray-600
                ">
                  Generating final feedback...
                </div>

              )}

            </div>

          )}

        </div>
      )}

    </div>
  );
}
