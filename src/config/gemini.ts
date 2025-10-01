import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEYS = [
  'AIzaSyDceOzQlv1eetqLxgpL03QezDSQ74-Rrp4',
  'AIzaSyAdOZgBD2D5Yzh_ckPML1ZhCe2wRAvfQlM'
];

let currentKeyIndex = 0;

const getNextApiKey = () => {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
};

export const createGeminiClient = () => {
  const apiKey = getNextApiKey();
  return new GoogleGenerativeAI(apiKey);
};

export const generateQuizQuestions = async (documentText: string, numberOfQuestions: number) => {
  const genAI = createGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const prompt = `
    Based on the following document content, generate exactly ${numberOfQuestions} multiple choice questions.
    
    Document content:
    ${documentText}
    
    Please format your response as a JSON array where each question has:
    - questionText: string
    - options: array of 4 options (A, B, C, D)
    - correctOption: number (0-3 index)
    - explanation: string explaining why the answer is correct
    
    Make sure questions cover different aspects of the content and vary in difficulty.
  `;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON response
    const cleanedText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw new Error('Failed to generate quiz questions');
  }
};

export const getAIHelp = async (question: string, context?: string) => {
  const genAI = createGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const prompt = context 
    ? `Context: ${context}\n\nQuestion: ${question}\n\nPlease provide a detailed, educational answer.`
    : `Question: ${question}\n\nPlease provide a detailed, educational answer.`;
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error getting AI help:', error);
    throw new Error('Failed to get AI assistance');
  }
};