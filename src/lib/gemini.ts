import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const RESUME_MODEL = "gemini-3-flash-preview";
