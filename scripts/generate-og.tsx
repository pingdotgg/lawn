import satori from "satori";
import sharp from "sharp";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

const WIDTH = 1200;
const HEIGHT = 630;

async function loadFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch font from ${url}: ${res.status}`);
  return res.arrayBuffer();
}

async function prepareBackground(): Promise<Buffer> {
  const grassPath = join(process.cwd(), "public", "grassy-bg.avif");
  const grassBuf = readFileSync(grassPath);

  // Resize/crop grass to OG dimensions, then darken for text readability
  const bg = await sharp(grassBuf)
    .resize(WIDTH, HEIGHT, { fit: "cover" })
    .toBuffer();

  // Create a semi-transparent dark overlay
  const overlay = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0.4 },
    },
  })
    .png()
    .toBuffer();

  // Composite the overlay on top of the grass
  return sharp(bg).composite([{ input: overlay }]).png().toBuffer();
}

function TextOverlay({
  title,
  titleSize = 72,
  subtitle,
}: {
  title: string;
  titleSize?: number;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "60px",
        fontFamily: "Geist Mono",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 700,
            color: "#f0f0e8",
            lineHeight: 0.9,
            letterSpacing: "-0.04em",
            textShadow: "4px 4px 0 #1a1a1a, 0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              display: "flex",
            }}
          >
            <div
              style={{
                display: "flex",
                backgroundColor: "#f0f0e8",
                color: "#1a1a1a",
                padding: "14px 24px",
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                border: "2px solid #1a1a1a",
                boxShadow: "4px 4px 0 #1a1a1a",
              }}
            >
              {subtitle}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const images: { name: string; jsx: ReturnType<typeof TextOverlay> }[] = [
  {
    name: "default",
    jsx: (
      <TextOverlay
        title="lawn"
        titleSize={200}
        subtitle="Video review that doesn't suck"
      />
    ),
  },
  {
    name: "home",
    jsx: (
      <TextOverlay
        title="lawn"
        titleSize={200}
        subtitle="Video review that doesn't suck"
      />
    ),
  },
  {
    name: "compare-frameio",
    jsx: (
      <TextOverlay
        title="lawn vs Frame.io"
        titleSize={96}
        subtitle="$5/mo flat vs $19/user/mo"
      />
    ),
  },
  {
    name: "compare-wipster",
    jsx: (
      <TextOverlay
        title="lawn vs Wipster"
        titleSize={96}
        subtitle="Simpler. Cheaper. Open source."
      />
    ),
  },
  {
    name: "for-editors",
    jsx: (
      <TextOverlay
        title="Video review for editors"
        titleSize={84}
        subtitle="Frame-accurate feedback"
      />
    ),
  },
  {
    name: "for-agencies",
    jsx: (
      <TextOverlay
        title="Video review for agencies"
        titleSize={84}
        subtitle="Stop paying per seat"
      />
    ),
  },
  {
    name: "pricing",
    jsx: (
      <TextOverlay title="$5/mo" titleSize={220} subtitle="Unlimited everything" />
    ),
  },
];

async function main() {
  console.log("Loading fonts...");
  const [fontRegular, fontBold] = await Promise.all([
    loadFont(
      "https://fonts.gstatic.com/s/geistmono/v4/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeE9KJ5T.ttf",
    ),
    loadFont(
      "https://fonts.gstatic.com/s/geistmono/v4/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeHaL55T.ttf",
    ),
  ]);

  console.log("Preparing background...");
  const bgPng = await prepareBackground();

  const outDir = join(process.cwd(), "public", "og");
  mkdirSync(outDir, { recursive: true });

  const fonts = [
    { name: "Geist Mono", data: fontRegular, weight: 400 as const, style: "normal" as const },
    { name: "Geist Mono", data: fontBold, weight: 700 as const, style: "normal" as const },
  ];

  for (const { name, jsx } of images) {
    const svg = await satori(jsx, { width: WIDTH, height: HEIGHT, fonts });
    const textPng = await sharp(Buffer.from(svg)).png().toBuffer();

    // Composite text on top of grass background
    const final = await sharp(bgPng)
      .composite([{ input: textPng }])
      .png()
      .toBuffer();

    writeFileSync(join(outDir, `${name}.png`), final);
    console.log(`Generated: public/og/${name}.png`);
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
