/**
 * POST /stt — multipart/form-data with an "audio" file field (the frontend sends
 * the MediaRecorder blob). Forwards the in-memory buffer to Deepgram and returns
 * { transcript, confidence, model, language }.
 *
 * The multer upload middleware comes from @sre/stt, so this app doesn't take on
 * the dependency directly.
 */
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { sttAudioUpload, MulterError, SttError } from "@sre/stt";
import { getSttClient } from "../clients/stt";

export const sttRouter = Router();

sttRouter.post(
  "/stt",
  sttAudioUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file || !file.buffer?.length) {
        res
          .status(400)
          .json({ error: 'No audio uploaded. Send a file in the "audio" field.' });
        return;
      }

      const result = await getSttClient().transcribe(file.buffer, file.mimetype);

      if (!result.transcript) {
        res.status(422).json({
          error: "Could not transcribe audio — no speech detected.",
          ...result,
        });
        return;
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Local error handler — maps multer (upload) and Deepgram (SttError) failures to
// JSON status codes before they reach the app-level 500 handler.
sttRouter.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next(err);
  if (err instanceof MulterError) {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  if (err instanceof SttError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  next(err);
});

export default sttRouter;
