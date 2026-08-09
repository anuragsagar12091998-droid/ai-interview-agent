"use client";

import { useState } from "react";

import Header from "@/components/Header";
import CandidateSelector from "@/components/CandidateSelector";
import InterviewChat from "@/components/InterviewChat";

export default function Home() {
  const [interviewStarted, setInterviewStarted] = useState(false);

  return (
    <main className="min-h-screen bg-gray-100 p-8">

      <Header />

      <div className="max-w-4xl mx-auto mt-8">

        {!interviewStarted ? (
          <>
            {/* Introduction */}

            <div className="bg-white rounded-xl shadow-lg p-8">

              <h2 className="text-2xl font-bold text-gray-800">
                AI Technical Interview
              </h2>

              <p className="mt-2 text-gray-600">
                Test your understanding of modern AI engineering concepts.
              </p>

            </div>

            {/* Candidate */}

            <div className="mt-6">
              <CandidateSelector />
            </div>

            {/* Topics */}

            <div className="mt-6 bg-white rounded-xl shadow p-6">

              <h3 className="text-lg font-semibold">
                Interview Topics
              </h3>

              <div className="flex flex-wrap gap-3 mt-4">

                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full">
                  RAG
                </span>

                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full">
                  Vector Databases
                </span>

                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full">
                  Prompt Engineering
                </span>

                <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full">
                  Agentic AI
                </span>

                <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full">
                  MCP
                </span>

              </div>

            </div>

            {/* Start Interview */}

            <button
              onClick={() => setInterviewStarted(true)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl shadow"
            >
              Start Interview
            </button>
          </>
        ) : (
          <>
            {/* Interview */}

            <InterviewChat />

          </>
        )}

      </div>

    </main>
  );
}
