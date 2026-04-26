from __future__ import annotations

from typing import List
from litellm import completion

from app.core.config import settings
from app.services.store import KnowledgeChunk

def generate_answer(system_prompt: str, user_prompt: str) -> str:
    """
    Generate an answer using standard LLM pipelines (via litellm).
    This handles OpenAI, local Ollama, etc. properly.
    """
    model = settings.llm_model if settings.llm_provider != "openai" else settings.openai_model
    if settings.llm_provider == "ollama":
        model = f"ollama/{model}"
        api_base = settings.ollama_base_url
        api_key = "dummy" # Ollama does not require one but config might
    elif settings.llm_provider == "openai":
        api_base = settings.openai_base_url
        api_key = settings.openai_api_key
    elif settings.llm_provider == "test":
        # For our pytest mocks
        if 'summary' in system_prompt.lower():
            return "Here is a summary based on the course material."
        if 'explain left joins simply' in user_prompt.lower():
            return "A left join keeps all records from the left table."
        if "dependency injection" in user_prompt.lower():
            return "Based on the course material, dependency injection helps manage objects."
        
        return "Test response."
    else:
        # Default back to openai format local proxy if unknown
        model = settings.llm_model
        api_base = settings.openai_base_url
        api_key = settings.openai_api_key

    try:
        response = completion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            api_base=api_base,
            api_key=api_key,
            temperature=0.2,
            max_tokens=800
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"LLM Generation Error: {e}")
        return "I encountered an error generating the response."
