import { describe, expect, test } from "bun:test";
import {
  displayShareUrl,
  getTeamShareBaseUrl,
  isReservedShareSubdomain,
  isShareRootHost,
  parseTeamShareSubdomain,
  publicWatchUrl,
  restrictedShareUrl,
  teamShareOrigin,
} from "./shareHost";

describe("parseTeamShareSubdomain", () => {
  test("extracts team subdomain from branded host", () => {
    expect(parseTeamShareSubdomain("acme.lawn.video")).toBe("acme");
    expect(parseTeamShareSubdomain("ACME.lawn.video")).toBe("acme");
  });

  test("returns null for apex and non-lawn hosts", () => {
    expect(parseTeamShareSubdomain("lawn.video")).toBeNull();
    expect(parseTeamShareSubdomain("localhost")).toBeNull();
    expect(parseTeamShareSubdomain("lawn.video.evil.com")).toBeNull();
    expect(parseTeamShareSubdomain("preview.vercel.app")).toBeNull();
  });

  test("rejects reserved and multi-level subdomains", () => {
    expect(parseTeamShareSubdomain("www.lawn.video")).toBeNull();
    expect(parseTeamShareSubdomain("clerk.lawn.video")).toBeNull();
    expect(parseTeamShareSubdomain("a.b.lawn.video")).toBeNull();
  });
});

describe("share URL generation", () => {
  test("builds branded team origins", () => {
    expect(teamShareOrigin("acme")).toBe("https://acme.lawn.video");
  });

  test("uses team subdomain on lawn.video hosts", () => {
    expect(getTeamShareBaseUrl("acme", "https://lawn.video")).toBe("https://acme.lawn.video");
    expect(getTeamShareBaseUrl("acme", "https://other.lawn.video")).toBe("https://acme.lawn.video");
    expect(publicWatchUrl("acme", "vid123", "https://lawn.video")).toBe(
      "https://acme.lawn.video/watch/vid123",
    );
    expect(restrictedShareUrl("acme", "tok", "https://lawn.video")).toBe(
      "https://acme.lawn.video/share/tok",
    );
  });

  test("falls back to current origin outside production", () => {
    expect(getTeamShareBaseUrl("acme", "http://localhost:5296")).toBe("http://localhost:5296");
    expect(publicWatchUrl("acme", "vid123", "http://localhost:5296")).toBe(
      "http://localhost:5296/watch/vid123",
    );
  });

  test("falls back when team slug is missing", () => {
    expect(getTeamShareBaseUrl(null, "https://lawn.video")).toBe("https://lawn.video");
  });

  test("displayShareUrl strips protocol", () => {
    expect(displayShareUrl("https://acme.lawn.video/watch/abc")).toBe("acme.lawn.video/watch/abc");
  });
});

describe("reserved share subdomains", () => {
  test("blocks infrastructure names", () => {
    expect(isReservedShareSubdomain("www")).toBe(true);
    expect(isReservedShareSubdomain("clerk")).toBe(true);
    expect(isReservedShareSubdomain("acme")).toBe(false);
  });

  test("isShareRootHost recognizes lawn hosts", () => {
    expect(isShareRootHost("lawn.video")).toBe(true);
    expect(isShareRootHost("acme.lawn.video")).toBe(true);
    expect(isShareRootHost("localhost")).toBe(false);
  });
});
