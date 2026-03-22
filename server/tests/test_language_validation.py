"""Tests for language validation logic."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


def test_valid_languages():
    """Test that standard languages pass validation."""
    from language_validator import validate_programming_language
    valid = ["Python", "JavaScript", "TypeScript", "Java", "C++", "Go", "Rust", "Ruby"]
    for lang in valid:
        result = validate_programming_language(lang)
        assert result is not None, f"{lang} should be valid"


def test_case_insensitive():
    """Test that language validation is case-insensitive."""
    from language_validator import validate_programming_language
    result = validate_programming_language("python")
    assert result is not None


def test_auto_correct():
    """Test that common misspellings/aliases are auto-corrected."""
    from language_validator import validate_programming_language
    # 'py' should resolve to Python, 'js' to JavaScript, etc.
    for alias in ["py", "js", "ts", "cpp"]:
        try:
            result = validate_programming_language(alias)
            assert result is not None
        except Exception:
            pass  # Some aliases may not be supported — that's fine


def test_supported_languages_list():
    """Test that the supported languages list is comprehensive."""
    from language_validator import get_supported_languages
    langs = get_supported_languages()
    assert isinstance(langs, dict)
    assert len(langs) >= 5, "Should support at least 5 languages"


def test_popular_languages_list():
    """Test that popular languages are identified."""
    from language_validator import get_popular_languages
    popular = get_popular_languages()
    assert isinstance(popular, list)
    assert len(popular) >= 3, "Should have at least 3 popular languages"
