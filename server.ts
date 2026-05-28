import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const upload = multer({ dest: "/tmp/" });

// Initialize GenAI
const getAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

app.post("/api/transcribe", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided." });
    }

    const ai = getAI();
    
    // We will read the file manually and pass it as inlineData.
    // If the file is too large for inlineData it might fail. Gemini supports inlineData up to certain size limit.
    // For "any MB" we would normally use ai.files.upload, but the SDK here handles inlineData elegantly for our demo constraints.
    // Let's actually use ai.files.upload to be robust if available, or just read the first few MB.
    // Wait, let's just use ai.files.upload according to the latest @google/genai SDK:
    const uploadResult = await ai.files.upload({
      file: req.file.path,
      config: { mimeType: req.file.mimetype }
    });

    // We must poll until the file is active.
    let fileInfo = await ai.files.get({ name: uploadResult.name });
    while (fileInfo.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fileInfo = await ai.files.get({ name: uploadResult.name });
    }

    if (fileInfo.state === "FAILED") {
      return res.status(500).json({ error: "Video processing failed in Gemini backend." });
    }

    // Now request transcription with word-level timestamps.
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
    
    // Clean up potential markdown formatting
    if (text.startsWith('```')) {
      text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      text = text.trim();
    }
    
    const words = JSON.parse(text);

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    // Option to also delete the file from Gemini if needed using ai.files.delete, but we can skip that or do it async.
    ai.files.delete({ name: uploadResult.name }).catch(() => {});

    return res.json({ words });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "An error occurred during transcription." });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
