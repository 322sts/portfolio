// Démarre la base locale Prisma Postgres (`prisma dev`, sans Docker) nommée « portfolio ».
// - 1er lancement : crée le serveur en arrière-plan (`prisma dev --name portfolio --detach`).
//   Prisma mémorise ensuite ses ports ; reporter l'URL TCP affichée dans DATABASE_URL.
// - Lancements suivants : `prisma dev start portfolio`. Juste après un arrêt, Prisma
//   peut encore tenir son verrou (« Lock file is already being held ») : on réessaie.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import net from "node:net";

const NAME = "portfolio";
const env = { ...process.env, NO_COLOR: "1" };

function prisma(args, inherit = true) {
  return spawnSync(`npx prisma dev ${args.join(" ")}`, {
    env,
    shell: true,
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  });
}

function dbPort() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" ? Number(url.port) : null;
  } catch {
    return null;
  }
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = dbPort();
if (port && (await isPortOpen(port))) {
  console.log(`Base locale déjà démarrée (port ${port}).`);
  process.exit(0);
}

const list = prisma(["ls"], false).stdout ?? "";
const exists = list.split(/\r?\n/).some((line) => line.trim().split(/\s+/)[0] === NAME);

if (!exists) {
  console.log(`Création du serveur prisma dev « ${NAME} »…`);
  prisma(["--name", NAME, "--detach"]);
  console.log("\nReporter l'URL TCP ci-dessus (postgres://…) dans DATABASE_URL, puis : npm run db:migrate && npm run db:seed");
  process.exit(0);
}

for (let attempt = 1; attempt <= 6; attempt++) {
  prisma(["start", NAME], false);
  await sleep(1500);
  if (!port || (await isPortOpen(port))) {
    console.log(`Base locale « ${NAME} » démarrée${port ? ` (port ${port})` : ""}.`);
    process.exit(0);
  }
  console.log(`Tentative ${attempt} échouée, nouvel essai…`);
  await sleep(2500);
}

console.error("Impossible de démarrer la base locale. Essayer : npx prisma dev ls / npx prisma dev start portfolio --debug");
process.exit(1);
