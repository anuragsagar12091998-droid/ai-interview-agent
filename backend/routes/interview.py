from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

import os
import json
import re


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env")

client = genai.Client(api_key=api_key)

GEMINI_MODEL = "gemini-3.5-flash-lite"


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/interview",
    tags=["Interview"]
)


# ============================================================
# STORAGE
# ============================================================

interviews = {}


# ============================================================
# REQUEST MODEL
# ============================================================

class AnswerRequest(BaseModel):
    interview_id: str
    answer: str


# ============================================================
# LOAD DATA
# ============================================================

def load_candidates():

    with open(
        "data/candidates.json",
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


def load_curriculum():

    with open(
        "data/curriculum.json",
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


# ============================================================
# START INTERVIEW
# ============================================================

@router.post("/start")
def start_interview(candidate_id: str):

    candidates = load_candidates()

    candidate = next(
        (
            c
            for c in candidates
            if c["id"] == candidate_id
        ),
        None
    )

    if not candidate:

        raise HTTPException(
            status_code=404,
            detail="Candidate not found"
        )

    curriculum = load_curriculum()

    if not curriculum:

        raise HTTPException(
            status_code=500,
            detail="Curriculum is empty"
        )

    completed_days = set(
        candidate.get("completed_days", [])
    )

    available_questions = [
        q
        for q in curriculum
        if q["day"] in completed_days
    ]

    if len(available_questions) < 8:

        raise HTTPException(
            status_code=400,
            detail=(
                "Candidate does not have at least "
                "8 completed curriculum topics."
            )
        )

    interview_id = (
        f"interview_{len(interviews) + 1:03d}"
    )

    selected_questions = available_questions[:8]

    interviews[interview_id] = {

        "candidate_id": candidate_id,

        "candidate": candidate,

        "questions": selected_questions,

        # Current main question index
        "current_question": 0,

        # Number shown to user
        "question_count": 1,

        "answers": [],

        "scores": [],

        "conversation": [],

        "followups": [],

        "topics_covered": [],

        "completed": False,

        # Has current main question already received
        # a follow-up?
        "followup_used": False
    }

    first_question = selected_questions[0]

    return {

        "success": True,

        "interview_id": interview_id,

        "candidate": candidate,

        "question_number": 1,

        "total_questions": 8,

        "topic": first_question["topic"],

        "day": first_question["day"],

        "question": first_question["question"],

        "is_follow_up": False
    }


# ============================================================
# SUBMIT ANSWER
# ============================================================

@router.post("/answer")
def submit_answer(request: AnswerRequest):

    interview = interviews.get(
        request.interview_id
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found"
        )

    if interview["completed"]:

        raise HTTPException(
            status_code=400,
            detail="Interview already completed"
        )

    current_index = interview["current_question"]

    questions = interview["questions"]

    if current_index >= len(questions):

        raise HTTPException(
            status_code=400,
            detail="No more questions available"
        )

    current_question_data = questions[current_index]

    current_question = current_question_data["question"]

    current_topic = current_question_data["topic"]

    current_day = current_question_data["day"]


    # ========================================================
    # SAVE CANDIDATE ANSWER
    # ========================================================

    interview["conversation"].append({

        "role": "candidate",

        "content": request.answer
    })

    interview["answers"].append(
        request.answer
    )


    # ========================================================
    # BUILD CONVERSATION
    # ========================================================

    conversation_text = ""

    for message in interview["conversation"]:

        conversation_text += (
            f'{message["role"].upper()}: '
            f'{message["content"]}\n'
        )


    # ========================================================
    # AI INTERVIEWER PROMPT
    # ========================================================

    prompt = f"""
You are an expert AI technical interviewer.

You are conducting a realistic technical interview
for an AI engineering candidate.

The interview has EXACTLY 8 MAIN QUESTIONS.

Each main question can have AT MOST ONE follow-up.

Do NOT create more than one follow-up for the same
main question.

CANDIDATE PROFILE:
{json.dumps(interview["candidate"], indent=2)}

CURRENT TOPIC:
{current_topic}

CURRENT DAY:
{current_day}

CURRENT MAIN QUESTION:
{current_question}

CANDIDATE ANSWER:
{request.answer}

PREVIOUS CONVERSATION:
{conversation_text}

Evaluate the candidate's answer.

Determine:

1. Technical correctness
2. Strengths
3. Weaknesses
4. Score from 0 to 10
5. Whether one follow-up question is useful
6. Generate a follow-up question only if useful

IMPORTANT RULES:

- The follow-up must be based on the candidate's actual answer.
- Do not repeat the current question.
- If the answer is strong, ask a deeper engineering question.
- If the answer is weak, ask a clarification question.
- Keep the question conversational.
- Test technical understanding.
- Do not generate unnecessary follow-ups.
- Only ONE follow-up is allowed for each main question.

Return exactly:

EVALUATION:


STRENGTHS:


WEAKNESSES:


SCORE:
/10

FOLLOW_UP_NEEDED:
YES or NO

FOLLOW_UP:

"""


    # ========================================================
    # GEMINI REQUEST
    # ========================================================

    try:

        print("========================================")
        print("Calling Gemini...")
        print("Model:", GEMINI_MODEL)

        response = client.models.generate_content(

            model=GEMINI_MODEL,

            contents=prompt
        )

        ai_response = response.text or ""

        print("Gemini response received.")
        print(ai_response)
        print("========================================")

    except Exception as error:

        print("========================================")
        print("GEMINI ERROR:")
        print(error)
        print("========================================")

        raise HTTPException(

            status_code=500,

            detail=f"Gemini API error: {str(error)}"
        )


    # ========================================================
    # EXTRACT SCORE
    # ========================================================

    score_match = re.search(

        r"SCORE:\s*(\d+(?:\.\d+)?)\s*/\s*10",

        ai_response,

        re.IGNORECASE
    )

    score = None

    if score_match:

        score = float(
            score_match.group(1)
        )

        score = max(
            0,
            min(10, score)
        )

    interview["scores"].append(score)


    # ========================================================
    # ADD TOPIC
    # ========================================================

    if current_day not in interview["topics_covered"]:

        interview["topics_covered"].append(
            current_day
        )


    # ========================================================
    # EXTRACT FOLLOW-UP NEEDED
    # ========================================================

    followup_needed_match = re.search(

        r"FOLLOW_UP_NEEDED:\s*(YES|NO)",

        ai_response,

        re.IGNORECASE
    )

    followup_needed = False

    if followup_needed_match:

        followup_needed = (
            followup_needed_match
            .group(1)
            .upper()
            == "YES"
        )


    # ========================================================
    # EXTRACT FOLLOW-UP QUESTION
    # ========================================================

    followup_question = None

    followup_match = re.search(

        r"FOLLOW_UP:\s*(.*?)(?=\n[A-Z_]+:|\Z)",

        ai_response,

        re.IGNORECASE | re.DOTALL
    )

    if followup_match:

        extracted = (
            followup_match
            .group(1)
            .strip()
        )

        if extracted and extracted.upper() != "NONE":

            followup_question = extracted


    # ========================================================
    # ONE FOLLOW-UP ONLY
    # ========================================================

    if (
        followup_needed
        and followup_question
        and not interview["followup_used"]
    ):

        interview["followup_used"] = True

        interview["followups"].append(
            followup_question
        )

        interview["conversation"].append({

            "role": "interviewer",

            "content": followup_question
        })

        return {

            "success": True,

            "message":
                "AI generated adaptive follow-up",

            "ai_response":
                ai_response,

            "interview_completed":
                False,

            "question_number":
                interview["question_count"],

            "total_questions":
                8,

            "topic":
                current_topic,

            "day":
                current_day,

            "next_question":
                followup_question,

            "score":
                score,

            "is_follow_up":
                True
        }


    # ========================================================
    # FOLLOW-UP FINISHED
    # MOVE TO NEXT MAIN QUESTION
    # ========================================================

    next_index = current_index + 1

    interview["current_question"] = next_index

    interview["followup_used"] = False


    # ========================================================
    # EXACTLY 8 MAIN QUESTIONS COMPLETED
    # ========================================================

    if next_index >= len(questions):

        interview["completed"] = True

        valid_scores = [

            s
            for s in interview["scores"]
            if s is not None
        ]

        average_score = None

        if valid_scores:

            average_score = round(

                sum(valid_scores)
                / len(valid_scores),

                2
            )

        return {

            "success": True,

            "message":
                "Interview completed",

            "ai_response":
                ai_response,

            "interview_completed":
                True,

            "question_number":
                8,

            "total_questions":
                8,

            "score":
                score,

            "average_score":
                average_score,

            "topics_covered":
                interview["topics_covered"],

            "is_follow_up":
                False
        }


    # ========================================================
    # NEXT MAIN QUESTION
    # ========================================================

    next_question = questions[next_index]

    interview["question_count"] += 1

    return {

        "success": True,

        "message":
            "Answer evaluated by Gemini",

        "ai_response":
            ai_response,

        "interview_completed":
            False,

        "question_number":
            interview["question_count"],

        "total_questions":
            8,

        "topic":
            next_question["topic"],

        "day":
            next_question["day"],

        "next_question":
            next_question["question"],

        "score":
            score,

        "is_follow_up":
            False
    }


# ============================================================
# FINAL FEEDBACK
# ============================================================

@router.get("/feedback/{interview_id}")
def get_feedback(interview_id: str):

    interview = interviews.get(
        interview_id
    )

    if not interview:

        raise HTTPException(
            status_code=404,
            detail="Interview not found"
        )

    if not interview["completed"]:

        raise HTTPException(
            status_code=400,
            detail="Interview is not completed yet"
        )


    # ========================================================
    # CALCULATE SCORE
    # ========================================================

    scores = [

        s
        for s in interview["scores"]
        if s is not None
    ]

    average_score = 0

    if scores:

        average_score = round(

            sum(scores) / len(scores),

            2
        )


    # ========================================================
    # FINAL FEEDBACK PROMPT
    # ========================================================

    prompt = f"""
You are an expert technical interview evaluator.

Analyze the candidate's COMPLETE technical interview.

CANDIDATE:
{json.dumps(interview["candidate"], indent=2)}

INTERVIEW CONVERSATION:
{json.dumps(interview["conversation"], indent=2)}

SCORES:
{json.dumps(interview["scores"])}

TOPICS COVERED:
{json.dumps(interview["topics_covered"])}

AVERAGE SCORE:
{average_score}/10

Generate useful and actionable final feedback.

Return exactly:

OVERALL_ASSESSMENT:

Give a concise overall assessment of the candidate.

STRENGTHS:

List the candidate's strongest technical areas.

WEAKNESSES:

List the areas where the candidate needs improvement.

RECOMMENDED_REVISION:

Give specific topics or concepts the candidate should revise.

ACTION_PLAN:

Give a practical step-by-step improvement plan.

FINAL_SCORE:
{average_score}/10
"""


    # ========================================================
    # GEMINI FINAL EVALUATION
    # ========================================================

    try:

        print("========================================")
        print("Generating FINAL INTERVIEW FEEDBACK...")
        print("Interview:", interview_id)

        response = client.models.generate_content(

            model=GEMINI_MODEL,

            contents=prompt
        )

        feedback = response.text or ""

        print("FINAL FEEDBACK:")
        print(feedback)
        print("========================================")

    except Exception as error:

        print("========================================")
        print("FINAL FEEDBACK GEMINI ERROR:")
        print(error)
        print("========================================")

        raise HTTPException(

            status_code=500,

            detail=f"Gemini API error: {str(error)}"
        )


    # ========================================================
    # RETURN FINAL FEEDBACK
    # ========================================================

    return {

        "success": True,

        "interview_id":
            interview_id,

        "candidate":
            interview["candidate"]["name"],

        "completed":
            True,

        "total_questions":
            8,

        "average_score":
            average_score,

        "topics_covered":
            interview["topics_covered"],

        "scores":
            interview["scores"],

        "feedback":
            feedback
    }
