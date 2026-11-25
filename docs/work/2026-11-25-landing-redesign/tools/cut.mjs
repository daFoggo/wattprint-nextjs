// Cut a full-page shot into viewport-high pieces. usage: node cut.mjs <png> <height>
import { pathToFileURL } from "node:url"
const sharp = (await import(pathToFileURL(process.env.SHARP).href)).default
const [file, h] = process.argv.slice(2)
const meta = await sharp(file).metadata()
for (let y = 0, i = 1; y < meta.height; y += Number(h), i++)
  await sharp(file).extract({ left: 0, top: y, width: meta.width, height: Math.min(Number(h), meta.height - y) }).toFile(file.replace(".png", `-${i}.png`))
