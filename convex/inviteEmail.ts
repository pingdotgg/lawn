import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const DEFAULT_SITE_URL = "https://lawn.video";
const DEFAULT_FROM_EMAIL = "Lawn <invites@lawn.video>";

export type InviteEmailContentInput = {
  inviterName: string;
  teamName: string;
  inviteUrl: string;
};

/** Resolve the public site origin for invite links. */
export function getSiteUrl(
  env: { SITE_URL?: string | undefined; APP_URL?: string | undefined } = {
    SITE_URL: process.env.SITE_URL,
    APP_URL: process.env.APP_URL,
  },
): string {
  const raw = env.SITE_URL?.trim() || env.APP_URL?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

export function buildInviteUrl(token: string, siteUrl: string = getSiteUrl()): string {
  return `${siteUrl}/invite/${token}`;
}

export function buildInviteEmailSubject(inviterName: string, teamName: string): string {
  return `${inviterName} invited you to ${teamName} on Lawn`;
}

export function buildInviteEmailText(input: InviteEmailContentInput): string {
  const { inviterName, teamName, inviteUrl } = input;
  return [
    `${inviterName} invited you to join ${teamName} on Lawn.`,
    "",
    "Accept the invite:",
    inviteUrl,
    "",
    "This invite expires in 7 days.",
    "",
    "If you weren't expecting this, you can ignore this email.",
  ].join("\n");
}

export function buildInviteEmailHtml(input: InviteEmailContentInput): string {
  const { inviterName, teamName, inviteUrl } = input;
  // Keep markup minimal and inline so it renders without external CSS.
  const safeInviter = escapeHtml(inviterName);
  const safeTeam = escapeHtml(teamName);
  const safeUrl = escapeHtml(inviteUrl);
  return [
    `<!DOCTYPE html>`,
    `<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a1a1a;background:#f0f0e8;padding:24px;">`,
    `<div style="max-width:480px;margin:0 auto;border:2px solid #1a1a1a;padding:24px;background:#f0f0e8;">`,
    `<p style="margin:0 0 16px;font-size:16px;"><strong>${safeInviter}</strong> invited you to join <strong>${safeTeam}</strong> on Lawn.</p>`,
    `<p style="margin:0 0 24px;">`,
    `<a href="${safeUrl}" style="display:inline-block;background:#2d5a2d;color:#f0f0e8;text-decoration:none;font-weight:700;padding:12px 16px;border:2px solid #1a1a1a;">Accept invite</a>`,
    `</p>`,
    `<p style="margin:0 0 8px;font-size:14px;color:#888;">Or copy this link:</p>`,
    `<p style="margin:0 0 16px;font-size:13px;word-break:break-all;"><a href="${safeUrl}" style="color:#2d5a2d;">${safeUrl}</a></p>`,
    `<p style="margin:0;font-size:12px;color:#888;">This invite expires in 7 days. If you weren't expecting this, you can ignore this email.</p>`,
    `</div></body></html>`,
  ].join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Best-effort invite email via Resend.
 * Skips silently when RESEND_API_KEY is unset; never throws to callers of inviteMember.
 */
export const sendInviteEmail = internalAction({
  args: {
    toEmail: v.string(),
    inviterName: v.string(),
    teamName: v.string(),
    token: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.log(
        "[inviteEmail] RESEND_API_KEY not set; skipping email send (invite link still works)",
      );
      return null;
    }

    const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
    const inviteUrl = buildInviteUrl(args.token);
    const subject = buildInviteEmailSubject(args.inviterName, args.teamName);
    const content = {
      inviterName: args.inviterName,
      teamName: args.teamName,
      inviteUrl,
    };

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [args.toEmail],
          subject,
          text: buildInviteEmailText(content),
          html: buildInviteEmailHtml(content),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(
          `[inviteEmail] Resend API error status=${response.status} body=${body.slice(0, 500)}`,
        );
        return null;
      }
    } catch (error) {
      console.error("[inviteEmail] Failed to send invite email:", error);
    }

    return null;
  },
});
