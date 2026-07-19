export function getEdgeMargins(el) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: Math.max(rect.top, 0),
    bottom: Math.max(window.innerHeight - rect.bottom, 0),
    left: Math.max(rect.left, 0),
    right: Math.max(window.innerWidth - rect.right, 0)
  };
}
