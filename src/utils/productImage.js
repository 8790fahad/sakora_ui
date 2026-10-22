const PRESETS = {
  thumb: "c_fill,g_auto,w_160,h_160,f_auto,q_auto",
  sale: "c_fill,g_auto,w_400,h_128,f_auto,q_auto",
  preview: "c_limit,w_640,f_auto,q_auto",
};

const TRANSFORM_SEGMENT = /^(?:[a-z]{1,3}_[^/]+\/)+/i;

export const productImageSrc = (url, preset = "thumb") => {
  const value = String(url || "").trim();
  const transform = PRESETS[preset] || PRESETS.thumb;
  const match = value.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i
  );
  if (!match) return value;
  const rest = match[2].replace(TRANSFORM_SEGMENT, "");
  return `${match[1]}${transform}/${rest}`;
};
