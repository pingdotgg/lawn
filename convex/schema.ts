import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("team")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"]),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_and_user", ["teamId", "userId"]),

  teamInvites: defineTable({
    teamId: v.id("teams"),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
    invitedBy: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"]),

  projects: defineTable({
    teamId: v.id("teams"),
    name: v.string(),
    description: v.optional(v.string()),
  }).index("by_team", ["teamId"]),

  videos: defineTable({
    projectId: v.id("projects"),
    uploadedBy: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    // S3 storage
    s3Key: v.optional(v.string()),
    s3UploadId: v.optional(v.string()), // For tracking multipart uploads
    // Metadata
    duration: v.optional(v.number()),
    thumbnailUrl: v.optional(v.string()),
    thumbnailKey: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    contentType: v.optional(v.string()),
    status: v.union(
      v.literal("uploading"),
      v.literal("processing"),
      v.literal("ready"),
      v.literal("failed")
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_s3_key", ["s3Key"]),

  comments: defineTable({
    videoId: v.id("videos"),
    userId: v.id("users"),
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
    createdBy: v.id("users"),
    expiresAt: v.optional(v.number()),
    allowDownload: v.boolean(),
    password: v.optional(v.string()),
    viewCount: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_video", ["videoId"]),
});
