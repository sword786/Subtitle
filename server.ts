import express from "express";
import path from "path";
import multer from "multer";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const multerFn = typeof multer === "function" ? multer : ((multer as any).default || multer);
const upload = multerFn({ dest: "/tmp/" });

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

app.post("/api/transcribe", (req, res) => {
  console.log("Received POST request to /api/transcribe");
  upload.single("video")(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message || "File upload error." });
    }
    try {
      console.log("File parsed:", req.file ? req.file.path : "No file");
      if (!req.file) {
        return res.status(400).json({ error: "No video file provided." });
      }

      const ai = getAI();

    
    const stats = fs.statSync(req.file.path);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    let parts: any[] = [];
    let cleanupGeminiFile: (() => Promise<void>) | null = null;

    if (fileSizeMB < 12) {
      console.log(`Audio/Video file size is ${fileSizeMB.toFixed(2)}MB. Using direct inlineData.`);
      const base64Data = fs.readFileSync(req.file.path).toString("base64");
      parts = [
        {
          inlineData: {
            data: base64Data,
            mimeType: req.file.mimetype
          }
        },
        {
          text: "Analyze the audio in this file and provide a word-by-word transcript. " +
                "Return a JSON array where each object has 'word' (string), 'start' (number in seconds), and 'end' (number in seconds). " +
                "Be extremely accurate with timestamps. Do not group words together; each 'word' MUST be a single word without spaces. " + 
                "If there is no speech, return an empty array."
        }
      ];
    } else {
      console.log(`File size is ${fileSizeMB.toFixed(2)}MB. Using files.upload with polling.`);
      const uploadResult = await ai.files.upload({
        file: req.file.path,
        config: { mimeType: req.file.mimetype }
      });

      let fileInfo = await ai.files.get({ name: uploadResult.name });
      while (fileInfo.state === "PROCESSING") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        fileInfo = await ai.files.get({ name: uploadResult.name });
      }

      if (fileInfo.state === "FAILED") {
        return res.status(500).json({ error: "Video processing failed in Gemini backend." });
      }

      parts = [
        { fileData: { fileUri: uploadResult.uri, mimeType: req.file.mimetype } },
        {
          text: "Analyze the audio in this file and provide a word-by-word transcript. " +
                "Return a JSON array where each object has 'word' (string), 'start' (number in seconds), and 'end' (number in seconds). " +
                "Be extremely accurate with timestamps. Do not group words together; each 'word' MUST be a single word without spaces. " + 
                "If there is no speech, return an empty array."
        }
      ];

      cleanupGeminiFile = async () => {
        try {
          await ai.files.delete({ name: uploadResult.name });
        } catch (_) {}
      };
    }

    // Now request transcription with word-level timestamps.
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: parts
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

    if (cleanupGeminiFile) {
      cleanupGeminiFile().catch(() => {});
    }

    return res.json({ words });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "An error occurred during transcription." });
  }
  });
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

  // Global error handler for API routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
