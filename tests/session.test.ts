// @vitest-environment node
import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/session-token";

describe("session tokens", () => {
  const user = { id: 1, name: "Dr. Maya Rao", email: "admin@medmatch.test", role: "ADMIN" as const };

  it("accepts a token it signed", async () => {
    const token = await signSessionToken(user);
    expect(await verifySessionToken(token)).toEqual(user);
  });
  it("rejects a tampered token", async () => {
    const token = await signSessionToken(user);
    expect(await verifySessionToken(token.slice(0, -4) + "abcd")).toBeNull();
  });
  it("rejects garbage", async () => expect(await verifySessionToken("not-a-token")).toBeNull());
});
