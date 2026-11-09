/**
 * Shrinks a photo in the browser before it is uploaded ("Photo of my notes").
 * A phone photo is 3 to 8 MB and the server accepts at most 4.5 MB per request;
 * redrawing it also drops the location and device details a camera embeds, so
 * nothing but the picture leaves the phone. 1800px on the long edge keeps
 * handwriting readable.
 */
export async function shrinkPhoto(file: File, maxEdge = 1800, quality = 0.82): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("We could not open that photo. Try a JPG or PNG."));
      el.src = url;
    });
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (!longest) throw new Error("We could not open that photo. Try a JPG or PNG.");
    const scale = Math.min(1, maxEdge / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo. Type the note instead.");
    // White behind a transparent PNG, so pencil on a cut-out page stays readable.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("This browser could not prepare the photo. Type the note instead."))), "image/jpeg", quality),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
