export async function shareTrailCard(element: HTMLElement): Promise<void> {
  try {
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(element, {
      backgroundColor: "#faf3e0",
      pixelRatio: 2,
    });

    if (!blob) throw new Error("Failed to generate image");

    if (navigator.share && navigator.canShare) {
      const file = new File([blob], "makanmate-trail.png", { type: "image/png" });
      const shareData = { files: [file], title: "My MakanMate Heritage Trail" };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "makanmate-trail.png";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      console.error("Share failed:", err);
    }
  }
}
