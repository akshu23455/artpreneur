
import os
from typing import TypedDict

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END

# Load Google API key from backend/.env
load_dotenv()


# Define the LangGraph state
class ArtworkState(TypedDict):
    title: str
    idea: str
    description: str


# Gemini AI description generator
def generate_description(state: ArtworkState):

    model = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash",
        temperature=0.7,
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )

    prompt = f"""
You are a creative art description writer.

Artwork title: {state['title']}
Artist's inspiration: {state['idea']}

Write a beautiful, meaningful description
in 2-3 sentences.

Preserve the artist's original emotions.
Do not invent details about the artwork.
Use natural and expressive language.
Return only the description.
"""

    response = model.invoke(prompt)

    # Extract text without metadata
    content = response.content

    if isinstance(content, str):
        description = content

    elif isinstance(content, list):
        description = "\n".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict)
            and part.get("type") == "text"
        )

    else:
        description = str(content)

    return {
        "description": description.strip()
    }


# Build the LangGraph workflow
workflow = StateGraph(ArtworkState)

workflow.add_node(
    "generate_description",
    generate_description
)

workflow.set_entry_point("generate_description")

workflow.add_edge("generate_description", END)

# Compile the AI workflow
artwork_graph = workflow.compile()
