/**
 * Client re-exports of project asset type helpers.
 * Source of truth lives in convex/projectAssetTypes.ts (pure, no Node).
 */
export {
  PROJECT_ASSET_ACCEPT,
  classifyProjectAssetKind,
  describeAllowedProjectAssets,
  getFileExtension,
  isAllowedProjectAsset,
  isVideoUploadFile,
  normalizeContentType,
  resolveProjectAssetContentType,
  titleFromFilename,
  type ProjectAssetKind,
} from "@convex/projectAssetTypes";
