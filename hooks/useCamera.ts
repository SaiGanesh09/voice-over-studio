"use client";

import { useRef, useState, useCallback } from "react";

export type CameraFacing = "user" | "environment";

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [permissionState, setPermissionState] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const loadDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === "videoinput"));
  }, []);

  const startCamera = useCallback(
    async (facingMode: CameraFacing = "user") => {
      setPermissionState("requesting");
      try {
        if (stream) stream.getTracks().forEach((t) => t.stop());

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        };

        const s = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(s);
        setFacing(facingMode);
        setPermissionState("granted");

        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        await loadDevices();
        return s;
      } catch {
        setPermissionState("denied");
        return null;
      }
    },
    [stream, loadDevices]
  );

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setPermissionState("idle");
  }, [stream]);

  const flipCamera = useCallback(() => {
    const next: CameraFacing = facing === "user" ? "environment" : "user";
    startCamera(next);
  }, [facing, startCamera]);

  return {
    stream,
    videoRef,
    facing,
    permissionState,
    devices,
    startCamera,
    stopCamera,
    flipCamera,
  };
}
