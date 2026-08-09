"use client";

import { useState } from "react";

export default function CandidateSelector() {
  const [candidate, setCandidate] = useState("Sarah Johnson");

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <label className="block font-semibold text-gray-800 mb-2">
        Select Candidate
      </label>

      <select
        value={candidate}
        onChange={(e) => setCandidate(e.target.value)}
        className="w-full border border-gray-300 rounded-lg p-3 text-gray-700"
      >
        <option>Sarah Johnson</option>
        <option>Alex Brown</option>
        <option>John Smith</option>
      </select>

      <p className="mt-3 text-sm text-gray-500">
        Selected candidate:{" "}
        <span className="font-semibold text-blue-600">
          {candidate}
        </span>
      </p>
    </div>
  );
}