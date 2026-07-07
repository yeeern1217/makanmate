"use client";
import { useEffect, useRef } from "react";
import { requestCameraStream } from "@/lib/camera";

export default function CameraViewport({
  onStream,
  onError,
  videoRef,
}: {
  onStream: () => void;
  onError: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    requestCameraStream()
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          onStream();
        }
      })
      .catch(onError);

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [onStream, onError, videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
    />
  );
}
