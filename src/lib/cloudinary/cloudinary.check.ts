// Contrôle hors-ligne : npx tsx --conditions=react-server src/lib/cloudinary/cloudinary.check.ts
// (identifiants factices injectés ci-dessous ; aucun appel réseau).
process.env.CLOUDINARY_CLOUD_NAME = "demo-cloud";
process.env.CLOUDINARY_API_KEY = "123456";
process.env.CLOUDINARY_API_SECRET = "secret-de-test";
process.env.DATABASE_URL ??= "postgres://x";
process.env.AUTH_SECRET ??= "0123456789abcdef0123";

async function main() {
  const { v2 } = await import("cloudinary");
  const { signUpload, isOwnCloudinaryUrl } = await import("./server");
  let failures = 0;
  const check = (label: string, cond: boolean) => {
    console.log(`${cond ? "OK " : "KO "} ${label}`);
    if (!cond) failures++;
  };
  const img = signUpload("projectImage")!;
  const expected = v2.utils.api_sign_request({ folder: img.folder, timestamp: img.timestamp, allowed_formats: img.allowedFormats! }, "secret-de-test");
  check("signature image = SDK Cloudinary", img.signature === expected);
  check("dossier imposé portfolio/projets", img.folder === "portfolio/projets");
  check("URL d'upload image", img.uploadUrl === "https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
  const cv = signUpload("cv")!;
  check("signature CV = SDK", cv.signature === v2.utils.api_sign_request({ folder: cv.folder, timestamp: cv.timestamp }, "secret-de-test"));
  check("CV en raw", cv.uploadUrl.endsWith("/raw/upload") && cv.allowedFormats === null);
  check("URL image valide", isOwnCloudinaryUrl("https://res.cloudinary.com/demo-cloud/image/upload/v1712/portfolio/projets/abc_12.webp", "projectImage"));
  check("autre cloud refusé", !isOwnCloudinaryUrl("https://res.cloudinary.com/autre/image/upload/v1/portfolio/projets/a.png", "projectImage"));
  check("mauvais dossier refusé", !isOwnCloudinaryUrl("https://res.cloudinary.com/demo-cloud/image/upload/v1/ailleurs/a.png", "projectImage"));
  check("http refusé", !isOwnCloudinaryUrl("http://res.cloudinary.com/demo-cloud/image/upload/v1/portfolio/projets/a.png", "projectImage"));
  check("domaine piégé refusé", !isOwnCloudinaryUrl("https://res.cloudinary.com.evil.io/demo-cloud/image/upload/v1/portfolio/projets/a.png", "projectImage"));
  check("svg refusé pour une image", !isOwnCloudinaryUrl("https://res.cloudinary.com/demo-cloud/image/upload/v1/portfolio/projets/a.svg", "projectImage"));
  check("CV pdf raw valide", isOwnCloudinaryUrl("https://res.cloudinary.com/demo-cloud/raw/upload/v1/portfolio/cv/x1y2.pdf", "cv"));
  check("CV en image refusé", !isOwnCloudinaryUrl("https://res.cloudinary.com/demo-cloud/image/upload/v1/portfolio/cv/x.pdf", "cv"));
  check("traversée refusée", !isOwnCloudinaryUrl("https://res.cloudinary.com/demo-cloud/image/upload/v1/portfolio/projets/../x.png", "projectImage"));
  process.exit(failures ? 1 : 0);
}
void main();
