import { API_BASE } from '../config';

export const askGemini = async (prompt) => {
  try {
    const res = await fetch(
      `${API_BASE}/ask-gemini/?prompt=${encodeURIComponent(prompt)}`,
      { method: "POST" }
    );
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    return { error: "⚠️ Something went wrong while connecting to the server." };
  }
};
