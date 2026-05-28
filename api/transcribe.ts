import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const multerFn = typeof multer === "function" ? multer : ((multer as any).default || multer);
const upload = multerFn({ dest: "/tmp/" });

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await runMiddleware(req, res, upload.single("video"));
  } catch (e: any) {
    return res.status(500).json({ error: "File upload failed", details: e.message });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided." });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    
    const uploadResult = await ai.files.upload({
      file: req.file.path,
      config: { mimeType: req.file.mimetype }
    });

    let fileInfo = await ai.files.get({ name: uploadResult.name });
    // Note: Vercel serverless has a 10s timeout on hobby plan. 
    // Video processing could take longer. This polling loop will run until resolving.
    while (fileInfo.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fileInfo = await ai.files.get({ name: uploadResult.name });
    }

    if (fileInfo.state === "FAILED") {
      return res.status(500).json({ error: "Video processing failed in Gemini backend." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { fileData: { fileUri: uploadResult.uri, mimeType: req.file.mimetype } },
            { text: "Analyze the audio in this video and provide a word-by-word transcript. " +
                    "Return a JSON array where each object has 'word' (string), 'start' (number in seconds), and 'end' (number in seconds). " +
                    "Be extremely accurate with timestamps. Do not group words together; each 'word' MUST be a single word without spaces. " + 
                    "If there is no speech, return an empty array." }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER }
            },
            required: ["word", "start", "end"]
          }
        }
      }
    });

    let text = response.text;
    if (!text) throw new Error("No text returned from model");
    
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      text = text.trim();
    }
    
    const words = JSON.parse(text);

    fs.unlink(req.file.path, () => {});
    ai.files.delete({ name: uploadResult.name }).catch(() => {});

    return res.json({ words });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "An error occurred during transcription." });
  }
}
