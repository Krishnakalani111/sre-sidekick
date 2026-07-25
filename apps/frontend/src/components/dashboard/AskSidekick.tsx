/**
 * Ask Sidekick — type a question or dictate it, edit the text, then send it to
 * POST /investigate for an RCA.
 *
 * Voice is an input method, not a separate path: the /stt transcript lands in
 * the same textarea you can type into, so it can be corrected before sending
 * (transcription of service names and error codes is rarely perfect).
 *
 * Mic capture needs a secure context: localhost counts, a plain-HTTP LAN IP
 * does not (getUserMedia is undefined there, which the error state explains).
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DiagnosisPlaceholder,
  DiagnosisResult,
} from "@/components/dashboard/DiagnosisResult";
import {
  getHealth,
  investigate,
  transcribeAudio,
  type Diagnosis,
} from "@/lib/api";

type Phase = "idle" | "recording" | "transcribing" | "investigating";

export function AskSidekick() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sttReady, setSttReady] = useState<boolean | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Ask the backend whether Deepgram is configured, so a missing key shows up
  // as a disabled mic instead of a failure after the user has spoken.
  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((h) => !cancelled && setSttReady(h.stt === "configured"))
      .catch(() => !cancelled && setSttReady(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function startRecording() {
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Mic unavailable — needs https or localhost.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Release the mic (drops the browser's recording indicator).
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setPhase("transcribing");
        try {
          const { transcript } = await transcribeAudio(blob);
          // Append rather than replace, so dictating twice builds one question
          // and anything already typed survives.
          setQuery((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setPhase("idle");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setPhase("recording");
    } catch {
      setError("Mic permission denied.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function send() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setError(null);
    setDiagnosis(null);
    setPhase("investigating");
    try {
      setDiagnosis(await investigate(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase("idle");
    }
  }

  const recording = phase === "recording";
  const busy = phase === "transcribing" || phase === "investigating";

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border/60 bg-card p-6">
      <p className="text-xs text-muted-foreground">
        Type a question, or dictate it and edit before sending.
      </p>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        // Enter sends; Shift+Enter makes a new line.
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send();
          }
        }}
        rows={3}
        placeholder="e.g. checkout is throwing 5xx errors"
        disabled={busy}
        className="mt-3 w-full resize-y rounded-md border border-border/60 bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {recording ? (
            <span className="flex items-center gap-2">
              <span className="size-2 animate-pulse rounded-full bg-destructive" />
              Recording… press Stop when you're done.
            </span>
          ) : phase === "transcribing" ? (
            "Transcribing…"
          ) : phase === "investigating" ? (
            "Investigating…"
          ) : sttReady === false ? (
            "Voice input unavailable — backend reports no Deepgram key."
          ) : (
            ""
          )}
        </span>

        <div className="flex items-center gap-2">
          {recording ? (
            <Button variant="destructive" onClick={stopRecording}>
              <Square />
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={startRecording}
              disabled={busy || sttReady === false}
              aria-label="Dictate a question"
            >
              {phase === "transcribing" ? <Loader2 className="animate-spin" /> : <Mic />}
              Dictate
            </Button>
          )}

          <Button onClick={send} disabled={busy || recording || !query.trim()}>
            {phase === "investigating" ? <Loader2 className="animate-spin" /> : <Send />}
            Send
          </Button>
        </div>
      </div>

        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </div>

      {diagnosis ? <DiagnosisResult diagnosis={diagnosis} /> : <DiagnosisPlaceholder />}
    </div>
  );
}
