/**
 * @sre/stt — speech-to-text via Deepgram.
 *
 * Wraps Deepgram's prerecorded transcription API behind a small client, plus a
 * ready-to-mount multer upload middleware for the /stt route. Boots without a
 * key: `configured` is false and `transcribe` throws a 503 SttError per-request,
 * so the rest of the app stays usable.
 */
export {
  createSttClient,
  SttError,
  type SttClient,
  type SttConfig,
  type TranscriptionResult,
} from "./deepgram";
export {
  sttAudioUpload,
  MulterError,
  AUDIO_FIELD,
  STT_MAX_UPLOAD_BYTES,
} from "./upload";
