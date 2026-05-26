"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, SwitchCamera, Zap, ZapOff } from "lucide-react";
import { setReportBlob } from "./reportStore";
import "./reportIssue.css";

interface CameraCaptureProps {
  nextPath: string;
}

type ExtendedCapabilities = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
};

export default function CameraCapture({ nextPath }: CameraCaptureProps) {
  const router = useRouter();
  const [step, setStep] = useState<"live" | "captured">("live");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  const [zoomSupported, setZoomSupported] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoom, setZoom] = useState<1 | 2>(1);
  const [torchOn, setTorchOn] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  function checkCapabilities(stream: MediaStream) {
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities?.() as ExtendedCapabilities | undefined;
      setZoomSupported(!!caps?.zoom);
      setTorchSupported(!!caps?.torch);
    } catch {
      // getCapabilities not available
    }
  }

  const startStream = useCallback(
    async (facing: "environment" | "user") => {
      stopStream();
      setZoomSupported(false);
      setTorchSupported(false);
      setZoom(1);
      setTorchOn(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        checkCapabilities(stream);
        return stream;
      } catch {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        checkCapabilities(stream);
        return stream;
      }
    },
    [stopStream],
  );

  useEffect(() => {
    let cancelled = false;
    startStream(facingMode)
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => router.back());
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showCapError(msg: string) {
    setCapError(msg);
    setTimeout(() => setCapError(null), 3000);
  }

  async function applyZoom(level: 1 | 2) {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({ advanced: [{ zoom: level }] });
      setZoom(level);
    } catch {
      showCapError("Zoom is not supported on this device");
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      showCapError("Flash is not supported on this device");
    }
  }

  async function switchCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    const stream = await startStream(next);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setCapturedUrl(url);
        setStep("captured");
      },
      "image/jpeg",
      0.9,
    );
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setStep("live");
    startStream(facingMode).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    });
  }

  function usePhoto() {
    if (!capturedBlob || !capturedUrl) return;
    setReportBlob(capturedBlob, capturedUrl);
    router.push(nextPath);
  }

  return (
    <div className="rc-page">
      <div className="rc-viewfinder">
        {step === "live" ? (
          <video ref={videoRef} autoPlay playsInline muted className="rc-video" />
        ) : capturedUrl ? (
          <img src={capturedUrl} alt="Captured" className="rc-video" />
        ) : null}
      </div>

      {capError && (
        <div className="rc-cap-error">{capError}</div>
      )}

      {step === "live" ? (
        <div className="rc-controls">
          <div className="rc-controls-top">
            {torchSupported && (
              <button
                className={`rc-icon-btn${torchOn ? " rc-icon-btn--active" : ""}`}
                aria-label={torchOn ? "Flash on" : "Flash off"}
                onClick={toggleTorch}
              >
                {torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
              </button>
            )}
            <button className="rc-icon-btn rc-icon-btn--right" onClick={switchCamera} aria-label="Switch camera">
              <SwitchCamera size={20} />
            </button>
          </div>
          <div className="rc-controls-bottom">
            {zoomSupported ? (
              <span className="rc-zoom-label">Zoom: {zoom}.0x</span>
            ) : (
              <span className="rc-zoom-label" />
            )}
            <button className="rc-shutter" onClick={capturePhoto} aria-label="Take photo">
              <span className="rc-shutter-inner" />
            </button>
            {zoomSupported ? (
              <div className="rc-zoom-btns">
                <button
                  className={`rc-zoom-btn${zoom === 1 ? " rc-zoom-btn--active" : ""}`}
                  onClick={() => applyZoom(1)}
                >
                  1x
                </button>
                <button
                  className={`rc-zoom-btn${zoom === 2 ? " rc-zoom-btn--active" : ""}`}
                  onClick={() => applyZoom(2)}
                >
                  2x
                </button>
              </div>
            ) : (
              <div className="rc-zoom-btns" />
            )}
          </div>
          <p className="rc-tap-hint">Tap to capture</p>
        </div>
      ) : (
        <div className="rc-post-capture">
          <button className="rc-retake-btn" onClick={retake}>
            <RotateCcw size={16} />
            Retake
          </button>
          <button className="rc-use-btn" onClick={usePhoto}>
            Use Photo →
          </button>
        </div>
      )}
    </div>
  );
}
