/**
 * Multer upload middleware for the /stt endpoint.
 *
 * The uploaded audio is kept in memory — we only need the buffer to forward to
 * Deepgram, never touching disk. 25 MB is plenty for a spoken query. The host
 * app mounts `sttAudioUpload` on its route; multer lives here so the app doesn't
 * take on the dependency directly.
 */
import multer from "multer";
import type { RequestHandler } from "express";

/** Max upload size (bytes). */
export const STT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** multipart/form-data field name the frontend sends the audio blob under. */
export const AUDIO_FIELD = "audio";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: STT_MAX_UPLOAD_BYTES },
});

/** Express middleware: parses a single in-memory "audio" file upload. */
export const sttAudioUpload: RequestHandler = upload.single(AUDIO_FIELD);

/** Re-exported so the route can detect multer errors without its own dep. */
export const MulterError = multer.MulterError;
