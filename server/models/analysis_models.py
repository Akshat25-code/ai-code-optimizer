"""Pydantic request/response models for analysis and execution endpoints."""
from __future__ import annotations

import os
from typing import Any, List

from pydantic import BaseModel, Field, field_validator

from models.requests import (
    normalize_programming_language,
    validate_programming_language,
    LanguageValidationError,
)

MAX_CODE_LENGTH = int(os.getenv("MAX_CODE_LENGTH", "50000"))


class AnalyzeReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    task: str
    provider: str | None = None
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None

    @field_validator("language")
    def validate_language(cls, v):
        try:
            return normalize_programming_language(v)
        except LanguageValidationError as e:
            raise ValueError(str(e))


class AnalyzeRes(BaseModel):
    provider_used: str
    result: Any
    analysis: Any = None
    optimized_code: str | None = None
    provider_metadata: dict | None = None
    result_text: str | None = None
    tokens_in: int | None = 0
    tokens_out: int | None = 0
    from_cache: bool = False


class InspectCodeReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    optimized_code: str | None = Field(default=None, max_length=MAX_CODE_LENGTH)

    @field_validator("language")
    def validate_language(cls, v):
        try:
            return normalize_programming_language(v)
        except LanguageValidationError as e:
            raise ValueError(str(e))


class InspectReportReq(InspectCodeReq):
    project_name: str | None = Field(default=None, max_length=120)


class RunCodeReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    stdin: str | None = None
    timeout_ms: int | None = 5000

    @field_validator("language")
    def validate_language(cls, v):
        try:
            return normalize_programming_language(v)
        except LanguageValidationError as e:
            raise ValueError(str(e))


class RunCompareReq(BaseModel):
    original_code: str = Field(..., max_length=MAX_CODE_LENGTH)
    optimized_code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str = "Python"
    stdin: str | None = None
    timeout_ms: int | None = 5000
    timeout: int | None = None

    @field_validator("language")
    def validate_language(cls, v):
        try:
            return normalize_programming_language(v)
        except LanguageValidationError as e:
            raise ValueError(str(e))


class EvaluateOptimizationReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    provider: str | None = None
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None


class EnhancedOptimizeReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str = "python"
    provider: str | None = None
    test_inputs: list = []
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None


class CompareReq(BaseModel):
    code: str = Field(..., max_length=MAX_CODE_LENGTH)
    language: str
    task: str
    providers: list[str] | None = None
    user_instructions: str | None = None
    optimization_focus: list[str] | None = None

    @field_validator("language")
    def validate_language(cls, v):
        try:
            validate_programming_language(v)
            return v
        except LanguageValidationError as e:
            raise ValueError(str(e))


class CompareResItem(BaseModel):
    status: str
    provider_used: str | None = None
    result: str | None = None
    error: str | None = None
    duration_ms: int | None = None
    tokens_in: int | None = 0
    tokens_out: int | None = 0
