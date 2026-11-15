import { describe, expect, it } from "vitest";
import { parseEventSlug } from "./ManageEventForm";

describe("parseEventSlug", () => {
  it("reads guest links, host links and bare codes", () => {
    expect(parseEventSlug("http://192.168.1.35:3000/e/ploy-krit-7fq2k9")).toBe("ploy-krit-7fq2k9");
    expect(parseEventSlug("https://x.vercel.app/host/ploy-krit-7fq2k9/qr")).toBe("ploy-krit-7fq2k9");
    expect(parseEventSlug("https://x.vercel.app/e/ploy-krit-7fq2k9/camera?x=1")).toBe("ploy-krit-7fq2k9");
    expect(parseEventSlug("  Ploy-Krit-7fq2k9 ")).toBe("ploy-krit-7fq2k9");
  });
  it("rejects junk", () => {
    expect(parseEventSlug("")).toBeNull();
    expect(parseEventSlug("abc")).toBeNull();
    expect(parseEventSlug("https://example.com/")).toBeNull();
  });
});
