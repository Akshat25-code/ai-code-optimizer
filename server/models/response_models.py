from pydantic import BaseModel

class AIResponse(BaseModel):
    output: str
