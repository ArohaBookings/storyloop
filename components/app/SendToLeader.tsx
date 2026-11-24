"use client";

import type { ClassPiece } from "@/lib/class-set";

/**
 * "Check with my leader": one story, or a whole room's statements as one set
 * (25 Nov 2026, switches LEADER_EMAIL_ON and CLASS_SET_ON).
 *
 * STUB: the final props contract, rendering nothing. Lane A owns the body;
 * lane B mounts it from the statement wall.
 */
export type SendToLeaderProps = ({ kind: "story"; storyId: string } | { kind: "set"; pieces: ClassPiece[] }) & {
  onSent?: () => void;
};

export default function SendToLeader(props: SendToLeaderProps) {
  void props;
  return null;
}
