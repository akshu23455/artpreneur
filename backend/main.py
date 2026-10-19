
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_agent import artwork_graph

# Create FastAPI application
app = FastAPI(title="Artpreneur AI Backend")

# Connect React frontend with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "https://artpreneur-lyart.vercel.app",
    "http://127.0.0.1:5173",
],
allow_origin_regex=r"https://artpreneur-[a-zA-Z0-9-]+\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# Artwork request structure
class ArtworkRequest(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    idea: str = Field(min_length=1, max_length=2000)


# Home route
@app.get("/")
def home():
    return {
        "message": "Artpreneur AI Backend is running!"
    }


# Gemini AI artwork description generator
@app.post("/generate-description")
def generate_artwork_description(request: ArtworkRequest):

    try:
        result = artwork_graph.invoke({
            "title": request.title,
            "idea": request.idea,
            "description": ""
        })

        return {
            "description": result["description"]
        }

    except Exception as e:
        print(
    "GEMINI ERROR:",
    type(e).__name__,
    str(e),
    flush=True
)
        raise HTTPException(
            status_code=502,
            detail="AI generation failed. Check backend logs."
        )
