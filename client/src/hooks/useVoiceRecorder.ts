import { useCallback, useRef, useState } from "react";

/** Records a short voice note with the browser's own `MediaRecorder` - nothing reaches the server until the Tutor or Admin stops and the clip is ready to attach. */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mimeType = ["audio/webm", "audio/ogg"].find(type => MediaRecorder.isTypeSupported(type)) ?? "";
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data); };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }, []);

  const stop = useCallback((): Promise<File | null> => new Promise(resolve => {
    const recorder = recorderRef.current;
    if (!recorder) { resolve(null); return; }
    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      setRecording(false);
      const type = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      resolve(blob.size > 0 ? new File([blob], `voice-note.${type.includes("ogg") ? "ogg" : "webm"}`, { type }) : null);
    };
    recorder.stop();
  }), []);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    setRecording(false);
    chunksRef.current = [];
  }, []);

  const supported = typeof window !== "undefined" && "MediaRecorder" in window && Boolean(navigator.mediaDevices?.getUserMedia);
  return { recording, start, stop, cancel, supported };
}
