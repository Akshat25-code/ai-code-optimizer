"""
Language Validation System for AI Code Optimizer
Ensures only programming languages are accepted for code analysis
"""

from typing import Dict, List, Set
from enum import Enum
from pydantic import BaseModel, validator, ValidationError

class LanguageCategory(str, Enum):
    """Categories of supported programming languages"""
    POPULAR = "popular"
    COMPILED = "compiled" 
    INTERPRETED = "interpreted"
    WEB = "web"
    SYSTEM = "system"
    DATABASE = "database"

class LanguageInfo(BaseModel):
    """Information about a supported programming language"""
    name: str
    category: LanguageCategory
    extensions: List[str]
    description: str
    is_popular: bool = False

# Comprehensive list of supported programming languages
SUPPORTED_LANGUAGES: Dict[str, LanguageInfo] = {
    # Popular Languages (Top Priority)
    "Python": LanguageInfo(
        name="Python",
        category=LanguageCategory.POPULAR,
        extensions=[".py", ".pyw"],
        description="High-level, interpreted programming language",
        is_popular=True
    ),
    "JavaScript": LanguageInfo(
        name="JavaScript", 
        category=LanguageCategory.POPULAR,
        extensions=[".js", ".jsx", ".mjs"],
        description="Dynamic programming language for web development",
        is_popular=True
    ),
    "Java": LanguageInfo(
        name="Java",
        category=LanguageCategory.POPULAR, 
        extensions=[".java"],
        description="Object-oriented, platform-independent language",
        is_popular=True
    ),
    "C++": LanguageInfo(
        name="C++",
        category=LanguageCategory.COMPILED,
        extensions=[".cpp", ".cxx", ".cc", ".hpp"],
        description="General-purpose programming language",
        is_popular=True
    ),
    "TypeScript": LanguageInfo(
        name="TypeScript",
        category=LanguageCategory.WEB,
        extensions=[".ts", ".tsx"],
        description="Typed superset of JavaScript",
        is_popular=True
    ),
    "C#": LanguageInfo(
        name="C#",
        category=LanguageCategory.COMPILED,
        extensions=[".cs"],
        description="Object-oriented programming language by Microsoft",
        is_popular=True
    ),
    
    # System Languages
    "Go": LanguageInfo(
        name="Go",
        category=LanguageCategory.SYSTEM,
        extensions=[".go"],
        description="Systems programming language by Google",
        is_popular=False
    ),
    "Rust": LanguageInfo(
        name="Rust", 
        category=LanguageCategory.SYSTEM,
        extensions=[".rs"],
        description="Systems programming language focused on safety",
        is_popular=False
    ),
    "C": LanguageInfo(
        name="C",
        category=LanguageCategory.SYSTEM,
        extensions=[".c", ".h"],
        description="Low-level programming language",
        is_popular=False
    ),
    
    # Web Technologies
    "PHP": LanguageInfo(
        name="PHP",
        category=LanguageCategory.WEB,
        extensions=[".php"],
        description="Server-side scripting language",
        is_popular=False
    ),
    "HTML": LanguageInfo(
        name="HTML", 
        category=LanguageCategory.WEB,
        extensions=[".html", ".htm"],
        description="Markup language for web pages",
        is_popular=False
    ),
    "CSS": LanguageInfo(
        name="CSS",
        category=LanguageCategory.WEB,
        extensions=[".css"],
        description="Stylesheet language for web design",
        is_popular=False
    ),
    
    # Other Languages
    "Ruby": LanguageInfo(
        name="Ruby",
        category=LanguageCategory.INTERPRETED,
        extensions=[".rb"],
        description="Dynamic, object-oriented programming language",
        is_popular=False
    ),
    "Swift": LanguageInfo(
        name="Swift",
        category=LanguageCategory.COMPILED,
        extensions=[".swift"],
        description="Programming language for iOS/macOS development",
        is_popular=False
    ),
    "Kotlin": LanguageInfo(
        name="Kotlin",
        category=LanguageCategory.COMPILED,
        extensions=[".kt", ".kts"],
        description="Modern programming language for JVM",
        is_popular=False
    ),
    "Scala": LanguageInfo(
        name="Scala", 
        category=LanguageCategory.COMPILED,
        extensions=[".scala"],
        description="Functional and object-oriented language for JVM",
        is_popular=False
    ),
    "R": LanguageInfo(
        name="R",
        category=LanguageCategory.INTERPRETED,
        extensions=[".r", ".R"],
        description="Statistical computing and graphics language",
        is_popular=False
    ),
    "MATLAB": LanguageInfo(
        name="MATLAB",
        category=LanguageCategory.INTERPRETED,
        extensions=[".m"],
        description="Technical computing language",
        is_popular=False
    ),
    "SQL": LanguageInfo(
        name="SQL",
        category=LanguageCategory.DATABASE,
        extensions=[".sql"],
        description="Database query language",
        is_popular=False
    ),
    "Perl": LanguageInfo(
        name="Perl",
        category=LanguageCategory.INTERPRETED,
        extensions=[".pl", ".pm"],
        description="High-level programming language",
        is_popular=False
    ),
    "Dart": LanguageInfo(
        name="Dart",
        category=LanguageCategory.COMPILED,
        extensions=[".dart"],
        description="Programming language for Flutter apps",
        is_popular=False
    ),
    "Julia": LanguageInfo(
        name="Julia",
        category=LanguageCategory.INTERPRETED,
        extensions=[".jl"],
        description="High-performance language for technical computing",
        is_popular=False
    )
}

# Common aliases from editors, file extensions, and API clients.
LANGUAGE_ALIASES: Dict[str, str] = {
    "py": "Python",
    "python3": "Python",
    "js": "JavaScript",
    "node": "JavaScript",
    "nodejs": "JavaScript",
    "ts": "TypeScript",
    "tsx": "TypeScript",
    "jsx": "JavaScript",
    "cpp": "C++",
    "cxx": "C++",
    "cc": "C++",
    "c++": "C++",
    "hpp": "C++",
    "cs": "C#",
    "csharp": "C#",
    "golang": "Go",
    "rb": "Ruby",
    "rscript": "R",
}

# Common non-programming languages that users might mistakenly enter
NON_PROGRAMMING_LANGUAGES: Set[str] = {
    # Natural Languages
    "English", "Spanish", "French", "German", "Chinese", "Japanese", "Korean",
    "Hindi", "Arabic", "Portuguese", "Russian", "Italian", "Dutch", "Swedish",
    "Norwegian", "Danish", "Finnish", "Polish", "Turkish", "Hebrew", "Thai",
    
    # Other Non-Programming Terms
    "Text", "Document", "Word", "Excel", "PowerPoint", "PDF", "Image",
    "Audio", "Video", "Music", "Art", "Design", "Writing", "Literature",
    "Math", "Mathematics", "Science", "Physics", "Chemistry", "Biology",
    "History", "Geography", "Philosophy", "Psychology", "Sociology",
    
    # Common Mistakes
    "Code", "Programming", "Computer", "Software", "Algorithm", "Function",
    "Variable", "Loop", "Condition", "Array", "Object", "Class", "Method"
}

class LanguageValidationError(ValueError):
    """Custom exception for language validation errors"""
    
    def __init__(self, language: str, message: str = None):
        self.language = language
        if message is None:
            message = self._generate_error_message(language)
        super().__init__(message)
    
    def _generate_error_message(self, language: str) -> str:
        """Generate a helpful error message for invalid language"""
        popular_languages = [name for name, info in SUPPORTED_LANGUAGES.items() if info.is_popular]
        
        if language in NON_PROGRAMMING_LANGUAGES:
            return (
                f"❌ Invalid Language: '{language}' is not a programming language.\n"
                f"✅ Supported programming languages: {', '.join(popular_languages)}\n"
                f"💡 Tip: Select from the dropdown or choose a programming language like Python, JavaScript, Java, etc."
            )
        else:
            return (
                f"❌ Unsupported Language: '{language}' is not currently supported.\n"
                f"✅ Supported languages: {', '.join(SUPPORTED_LANGUAGES.keys())}\n"
                f"🔥 Popular choices: {', '.join(popular_languages)}"
            )

def validate_programming_language(language: str) -> LanguageInfo:
    """
    Validate that the provided language is a supported programming language
    
    Args:
        language: The language name to validate
        
    Returns:
        LanguageInfo: Information about the validated language
        
    Raises:
        LanguageValidationError: If the language is not supported or not a programming language
    """
    if not language or not isinstance(language, str):
        raise LanguageValidationError("", "Language is required and must be a string")
    
    # Normalize input (handle case insensitive matching)
    language = language.strip()
    normalized_language = language.lower()

    # Resolve common aliases first (e.g., cpp -> C++).
    canonical = LANGUAGE_ALIASES.get(normalized_language)
    if canonical:
        return SUPPORTED_LANGUAGES[canonical]
    
    # Check for exact matches first (case insensitive)
    for supported_lang, info in SUPPORTED_LANGUAGES.items():
        if supported_lang.lower() == normalized_language:
            return info
    
    # Check if it's a known non-programming language
    for non_prog_lang in NON_PROGRAMMING_LANGUAGES:
        if non_prog_lang.lower() == normalized_language:
            raise LanguageValidationError(language)
    
    # If not found in either list, it's unsupported
    raise LanguageValidationError(language)


def normalize_programming_language(language: str) -> str:
    """Normalize user input to canonical language key used across the backend."""
    info = validate_programming_language(language)
    return info.name

def get_supported_languages() -> Dict[str, LanguageInfo]:
    """Get all supported programming languages"""
    return SUPPORTED_LANGUAGES.copy()

def get_popular_languages() -> List[str]:
    """Get list of popular programming languages"""
    return [name for name, info in SUPPORTED_LANGUAGES.items() if info.is_popular]

def get_languages_by_category(category: LanguageCategory) -> List[str]:
    """Get languages filtered by category"""
    return [name for name, info in SUPPORTED_LANGUAGES.items() if info.category == category]

def is_valid_programming_language(language: str) -> bool:
    """
    Check if a language is valid without raising exceptions
    
    Args:
        language: Language to check
        
    Returns:
        bool: True if valid, False otherwise
    """
    try:
        validate_programming_language(language)
        return True
    except LanguageValidationError:
        return False

# Pydantic validator for use in request models
def programming_language_validator(v: str) -> str:
    """Pydantic validator for programming languages"""
    validate_programming_language(v)
    return v

if __name__ == "__main__":
    # Test cases
    test_cases = [
        "Python",      # Valid
        "JavaScript",  # Valid  
        "English",     # Invalid - natural language
        "French",      # Invalid - natural language
        "Rust",        # Valid
        "InvalidLang", # Invalid - unsupported
        "java",        # Valid - case insensitive
        "PYTHON",      # Valid - case insensitive
    ]
    
    for test_lang in test_cases:
        try:
            info = validate_programming_language(test_lang)
            print(f"✅ {test_lang}: Valid ({info.description})")
        except LanguageValidationError as e:
            print(f"❌ {test_lang}: {e}")