

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LearningContent, AdvancedSettings } from "../types";

// Define the strict schema for the flashcard content
const flashcardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A title for the flashcard deck",
    },
    summary: {
      type: Type.STRING,
      description: "A brief 1-2 sentence description of the content covered.",
    },
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: {
            type: Type.STRING,
            description: "The term, concept, or question. Keep it concise.",
          },
          back: {
            type: Type.STRING,
            description: "The definition, explanation, or answer.",
          },
        },
        required: ["front", "back"],
      },
      description: "A comprehensive set of flashcards covering the key concepts.",
    },
  },
  required: ["title", "summary", "flashcards"],
};

interface GenerateOptions {
  type: 'youtube' | 'file';
  data: string; // Title for youtube, Base64 for file
  mimeType?: string;
  settings: AdvancedSettings;
}

export const generateFlashcards = async (options: GenerateOptions): Promise<LearningContent> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY is missing from environment variables.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let contents: any = [];
    const { cardCount, difficulty, customInstructions } = options.settings;

    // Construct the context string based on settings
    const contextInstruction = `
      Difficulty Level: ${difficulty}.
      Quantity: Generate exactly ${cardCount} flashcards.
      Custom Formatting Instructions: ${customInstructions || "Standard flashcard format (Term on front, Definition on back)"}.
      
      IMPORTANT: Follow the "Custom Formatting Instructions" strictly. 
      If the user asks for "equations only", ensure the front is the equation name/problem and back is the formula/solution.
      If the user asks for "single word terms", ensure the front is only one word.
    `;

    if (options.type === 'youtube') {
      // Text-based generation from title
      const prompt = `
        I have a YouTube video titled: "${options.data}".
        
        Please generate a comprehensive set of flashcards based on what would likely be covered in a video with this specific title.
        Focus on extracting key terms, definitions, and core concepts.
        
        ${contextInstruction}
      `;
      contents = [{ text: prompt }];
    } else {
      // Multimodal generation from file
      contents = [
        {
          inlineData: {
            mimeType: options.mimeType || 'application/pdf',
            data: options.data
          }
        },
        {
          text: `Analyze this document and generate a comprehensive set of flashcards covering the most important concepts, terms, and definitions found within it. ${contextInstruction}`
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: flashcardSchema,
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");

    return JSON.parse(text) as LearningContent;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};