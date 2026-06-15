/**
 * Maps a service (by name keyword) to a real photo in /public/photos. Keyword
 * matching keeps it working even as admins rename services; unknown services
 * fall back to the standard-clean photo.
 */
export function servicePhoto(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("deep")) return "/photos/svc-deep.jpg";
  if (n.includes("move")) return "/photos/svc-move.jpg";
  if (n.includes("office") || n.includes("commercial")) return "/photos/svc-office.jpg";
  if (n.includes("garden") || n.includes("outdoor")) return "/photos/svc-garden.jpg";
  if (n.includes("window")) return "/photos/svc-windows.jpg";
  if (n.includes("extra")) return "/photos/products.jpg";
  return "/photos/svc-standard.jpg";
}
