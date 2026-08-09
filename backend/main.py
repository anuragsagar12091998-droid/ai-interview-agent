from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.interview import router as interview_router

app = FastAPI(
    title="AI Interview Agent API",
    version="1.0.0",
    description="Backend for the AI Technical Interview Agent",
)

# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ai-interview-agent-2-93mo.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTES
# ============================================================

app.include_router(interview_router)


@app.get("/")
def root():
    return {
        "message": "AI Interview Agent API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }