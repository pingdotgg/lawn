import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api";
import schema from "./schema";

const migrations = new Migrations(components.migrations, { schema });

export function tokenIdentifierFromLegacySubject(issuer: string, subject: string) {
  return `${issuer}|${subject}`;
}

function legacyTokenIdentifier(subject: string) {
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
  if (!issuer) throw new Error("Missing CLERK_JWT_ISSUER_DOMAIN");
  return tokenIdentifierFromLegacySubject(issuer, subject);
}

export const backfillTeamOwnerIdentity = migrations.define({
  table: "teams",
  migrateOne: (_ctx, team) =>
    team.ownerIdentity === undefined
      ? { ownerIdentity: legacyTokenIdentifier(team.ownerClerkId) }
      : undefined,
});

export const backfillTeamMemberIdentity = migrations.define({
  table: "teamMembers",
  migrateOne: (_ctx, member) =>
    member.userIdentity === undefined
      ? { userIdentity: legacyTokenIdentifier(member.userClerkId) }
      : undefined,
});

export const backfillTeamInviteIdentity = migrations.define({
  table: "teamInvites",
  migrateOne: (_ctx, invite) =>
    invite.invitedByIdentity === undefined
      ? { invitedByIdentity: legacyTokenIdentifier(invite.invitedByClerkId) }
      : undefined,
});

export const backfillVideoUploaderIdentity = migrations.define({
  table: "videos",
  migrateOne: (_ctx, video) =>
    video.uploadedByIdentity === undefined
      ? { uploadedByIdentity: legacyTokenIdentifier(video.uploadedByClerkId) }
      : undefined,
});

export const backfillCommentIdentity = migrations.define({
  table: "comments",
  migrateOne: (_ctx, comment) =>
    comment.userIdentity === undefined
      ? { userIdentity: legacyTokenIdentifier(comment.userClerkId) }
      : undefined,
});

export const backfillShareLinkCreatorIdentity = migrations.define({
  table: "shareLinks",
  migrateOne: (_ctx, link) =>
    link.createdByIdentity === undefined
      ? { createdByIdentity: legacyTokenIdentifier(link.createdByClerkId) }
      : undefined,
});

export const run = migrations.runner();
