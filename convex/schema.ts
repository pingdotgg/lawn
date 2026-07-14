import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerClerkId: v.string(),
    plan: v.union(v.literal("basic"), v.literal("pro"), v.literal("free"), v.literal("team")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    billingStatus: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userClerkId: v.string(),
    userEmail: v.string(),
    userName: v.string(),
    userAvatarUrl: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member"), v.literal("viewer")),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userClerkId"])
    .index("by_team_and_user", ["teamId", "userClerkId"])
    .index("by_team_and_email", ["teamId", "userEmail"]),

  teamInvites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
    invitedByClerkId: v.string(),
    invitedByName: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"])
    .index("by_team_and_email", ["teamId", "email"]),

  projects: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    description: v.optional(v.string()),
    // Self-reference for nested folders. undefined/missing == top-level (a root
    // folder). Existing rows have no parentId, so they are already roots and no
    // backfill is needed.
    parentId: v.optional(v.id("projects")),
  })
    // Kept: team-wide flat listing (storage usage, team deletion).
    .index("by_team", ["teamId"])
    // Lists the children of a folder, or — with parentId == undefined — the
    // roots of a team.
    .index("by_team_and_parent", ["teamId", "parentId"]),

  videos: defineTable({
    projectId: v.id("projects"),
    uploadedByClerkId: v.string(),
    uploaderName: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    visibility: v.union(v.literal("public"), v.literal("private")),
    publicId: v.string(),
    // When false, public viewers only ever see the latest ready version and the
    // version switcher is hidden. Unset/true means viewers can browse versions.
    // Kept consistent across every version in a stack (see setPublicVersionBrowsing).
    allowPublicVersionBrowsing: v.optional(v.boolean()),
    // Mux video references
    muxUploadId: v.optional(v.string()),
    muxAssetId: v.optional(v.string()),
    muxPlaybackId: v.optional(v.string()),
    muxAssetStatus: v.optional(
      v.union(v.literal("preparing"), v.literal("ready"), v.literal("errored")),
    ),
    // Metadata
    s3Key: v.optional(v.string()),
    s3MultipartUploadId: v.optional(v.string()),
    s3MultipartPartSizeBytes: v.optional(v.number()),
    s3MultipartPartCount: v.optional(v.number()),
    uploadUpdatedAt: v.optional(v.number()),
    muxLastPolledAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    contentType: v.optional(v.string()),
    uploadError: v.optional(v.string()),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    workflowStatus: v.union(v.literal("review"), v.literal("rework"), v.literal("done")),
    // Existing rows are implicit v1 videos. These fields are materialized when
    // the first additional version is created, so no backfill is required.
    // versionStackId is an opaque stable identity and can keep referencing a
    // deleted original v1 row.
    versionStackId: v.optional(v.id("videos")),
    versionNumber: v.optional(v.number()),
    supersededByVideoId: v.optional(v.id("videos")),
  })
    .index("by_project", ["projectId"])
    .index("by_project_and_superseded_by_video_id", ["projectId", "supersededByVideoId"])
    .index("by_project_id_and_superseded_by_video_id_and_title", [
      "projectId",
      "supersededByVideoId",
      "title",
    ])
    .index("by_version_stack_id_and_version_number", ["versionStackId", "versionNumber"])
    .index("by_superseded_by_video_id", ["supersededByVideoId"])
    .index("by_public_id", ["publicId"])
    .index("by_mux_upload_id", ["muxUploadId"])
    .index("by_mux_asset_id", ["muxAssetId"])
    .index("by_mux_playback_id", ["muxPlaybackId"])
    .index("by_status_and_upload_updated_at", ["status", "uploadUpdatedAt"])
    .index("by_status_and_mux_last_polled_at", ["status", "muxLastPolledAt"]),

  cronLocks: defineTable({
    name: v.string(),
    owner: v.string(),
    expiresAt: v.number(),
  }).index("by_name", ["name"]),

  comments: defineTable({
    videoId: v.id("videos"),
    userClerkId: v.string(),
    userName: v.string(),
    userAvatarUrl: v.optional(v.string()),
    text: v.string(),
    timestampSeconds: v.number(),
    parentId: v.optional(v.id("comments")),
    resolved: v.boolean(),
  })
    .index("by_video", ["videoId"])
    .index("by_video_and_timestamp", ["videoId", "timestampSeconds"])
    .index("by_parent", ["parentId"]),

  shareLinks: defineTable({
    videoId: v.id("videos"),
    token: v.string(),
    createdByClerkId: v.string(),
    createdByName: v.string(),
    expiresAt: v.optional(v.number()),
    allowDownload: v.boolean(),
    password: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    failedAccessAttempts: v.optional(v.number()),
    lockedUntil: v.optional(v.number()),
    viewCount: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_video", ["videoId"]),

  shareAccessGrants: defineTable({
    shareLinkId: v.id("shareLinks"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_share_link", ["shareLinkId"])
    .index("by_expires_at", ["expiresAt"]),

  // Ephemeral gang-playback leader for a video room. Last claim wins.
  // Presence payloads mirror `leading` for cheap client reads; this table is
  // the auth-backed source of truth for who may drive play/pause/seek.
  videoLeaders: defineTable({
    videoId: v.id("videos"),
    leaderUserId: v.string(),
    displayName: v.string(),
    claimedAt: v.number(),
  }).index("by_video", ["videoId"]),
});
