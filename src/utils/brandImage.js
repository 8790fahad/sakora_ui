const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function validateBrandImage(file, { maxSizeInMB = 5 } = {}) {
  if (!file) return { isValid: false, errors: ["No file selected"] };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      errors: ["Use PNG, JPG, or WebP"],
    };
  }
  if (file.size > maxSizeInMB * 1024 * 1024) {
    return {
      isValid: false,
      errors: [`Image must be under ${maxSizeInMB}MB`],
    };
  }
  return { isValid: true, errors: [] };
}

export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

/** Resize image to a max edge and return a PNG/JPEG data URL (FlowBooks-style). */
export function resizeBrandImage(file, { maxEdge = 800, quality = 0.85 } = {}) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const mime =
          file.type === "image/png" || file.type === "image/webp"
            ? "image/png"
            : "image/jpeg";
        const dataUrl = canvas.toDataURL(mime, quality);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not process image"));
    };
    img.src = url;
  });
}

export function applyBrandColors({
  primaryColor = "#0D9488",
  secondaryColor = "#134E4A",
} = {}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = primaryColor || "#0D9488";
  const secondary = secondaryColor || "#134E4A";
  root.style.setProperty("--ios-blue", primary);
  root.style.setProperty("--ios-indigo", secondary);
  root.style.setProperty("--ios-teal", primary);
  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
}
