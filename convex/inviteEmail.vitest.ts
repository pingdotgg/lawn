import { describe, expect, test } from "vitest";
import {
  buildInviteEmailHtml,
  buildInviteEmailSubject,
  buildInviteEmailText,
  buildInviteUrl,
  getSiteUrl,
} from "./inviteEmail";

describe("invite email helpers", () => {
  test("getSiteUrl prefers SITE_URL, then APP_URL, then default", () => {
    expect(getSiteUrl({ SITE_URL: "https://app.example.com/" })).toBe("https://app.example.com");
    expect(getSiteUrl({ APP_URL: "https://staging.example.com" })).toBe(
      "https://staging.example.com",
    );
    expect(getSiteUrl({ SITE_URL: "  https://a.test  ", APP_URL: "https://b.test" })).toBe(
      "https://a.test",
    );
    expect(getSiteUrl({})).toBe("https://lawn.video");
  });

  test("buildInviteUrl joins origin and token", () => {
    expect(buildInviteUrl("abc123", "https://lawn.video")).toBe("https://lawn.video/invite/abc123");
  });

  test("buildInviteEmailSubject includes inviter and team", () => {
    expect(buildInviteEmailSubject("Ada", "Lawn HQ")).toBe(
      "Ada invited you to Lawn HQ on Lawn",
    );
  });

  test("buildInviteEmailText includes invite URL and context", () => {
    const text = buildInviteEmailText({
      inviterName: "Ada",
      teamName: "Lawn HQ",
      inviteUrl: "https://lawn.video/invite/tok",
    });
    expect(text).toContain("Ada invited you to join Lawn HQ on Lawn.");
    expect(text).toContain("https://lawn.video/invite/tok");
    expect(text).toContain("expires in 7 days");
  });

  test("buildInviteEmailHtml escapes untrusted names and includes CTA", () => {
    const html = buildInviteEmailHtml({
      inviterName: `Ada <script>alert(1)</script>`,
      teamName: `Team & "Crew"`,
      inviteUrl: "https://lawn.video/invite/tok",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Ada &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Team &amp; &quot;Crew&quot;");
    expect(html).toContain('href="https://lawn.video/invite/tok"');
    expect(html).toContain("Accept invite");
  });
});
