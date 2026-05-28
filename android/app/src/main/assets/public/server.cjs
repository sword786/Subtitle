var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_fs = __toESM(require("fs"), 1);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var multerFn = typeof import_multer.default === "function" ? import_multer.default : import_multer.default.default || import_multer.default;
var upload = multerFn({ dest: "/tmp/" });
var getAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new import_genai.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
app.post("/api/transcribe", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided." });
    }
    const ai = getAI();
    const uploadResult = await ai.files.upload({
      file: req.file.path,
      config: { mimeType: req.file.mimetype }
    });
    let fileInfo = await ai.files.get({ name: uploadResult.name });
    while (fileInfo.state === "PROCESSING") {
      await new Promise((resolve) => setTimeout(resolve, 2e3));
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
            { text: "Analyze the audio in this video and provide a word-by-word transcript. Return a JSON array where each object has 'word' (string), 'start' (number in seconds), and 'end' (number in seconds). Be extremely accurate with timestamps. Do not group words together; each 'word' MUST be a single word without spaces. If there is no speech, return an empty array." }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              word: { type: import_genai.Type.STRING },
              start: { type: import_genai.Type.NUMBER },
              end: { type: import_genai.Type.NUMBER }
            },
            required: ["word", "start", "end"]
          }
        }
      }
    });
    let text = response.text;
    if (!text) throw new Error("No text returned from model");
    if (text.startsWith("```")) {
      text = text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
      text = text.trim();
    }
    const words = JSON.parse(text);
    import_fs.default.unlink(req.file.path, () => {
    });
    ai.files.delete({ name: uploadResult.name }).catch(() => {
    });
    return res.json({ words });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message || "An error occurred during transcription." });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
