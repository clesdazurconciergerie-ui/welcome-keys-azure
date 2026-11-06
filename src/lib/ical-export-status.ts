export type ICalExportConnectionState = "disabled" | "waiting" | "connected";

export function getICalExportConnectionState({
  isActive,
  lastAccessedAt,
}: {
  isActive: boolean;
  lastAccessedAt: string | null;
}): ICalExportConnectionState {
  if (!isActive) return "disabled";
  return lastAccessedAt ? "connected" : "waiting";
}
