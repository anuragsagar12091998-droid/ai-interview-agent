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
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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