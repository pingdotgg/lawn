const SITE_URL = "https://lawn.video";
const SITE_NAME = "lawn";
const DEFAULT_OG_IMAGE = "/og/default.png";
const TWITTER_HANDLE = "@theo";

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  type?: string;
  noIndex?: boolean;
};

export function seoHead({
  title,
  description,
  path,
  ogImage = DEFAULT_OG_IMAGE,
  type = "website",
  noIndex = false,
}: SeoOptions) {
  const fullTitle = title.toLowerCase().includes("lawn")
    ? title
    : `${title} | lawn`;
  const url = `${SITE_URL}${path}`;
  const imageUrl = ogImage.startsWith("http")
    ? ogImage
    : `${SITE_URL}${ogImage}`;

  const meta: Array<Record<string, string>> = [
    { title: fullTitle },
    { name: "description", content: description },
    // Open Graph
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:url", content: url },
    { property: "og:type", content: type },
    { property: "og:site_name", content: SITE_NAME },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:site", content: TWITTER_HANDLE },
  ];

  if (noIndex) {
    meta.push({ name: "robots", content: "noindex,nofollow" });
  }

  const links = [{ rel: "canonical", href: url }];

  return { meta, links };
}
