let available: boolean | undefined;

export function webgl2Available(): boolean {
  if (available !== undefined) return available;
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    available = Boolean(context);
  } catch {
    available = false;
  }
  return available;
}
