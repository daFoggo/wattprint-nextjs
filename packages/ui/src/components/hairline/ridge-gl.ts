export type Rgb = [number, number, number];

const VERTEX = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `precision highp float;
uniform sampler2D uMask;
uniform vec2 uRes;
uniform float uScale;
uniform float uTime;
uniform float uReveal;
uniform vec2 uParallax;
uniform float uSceneTop;
uniform float uSeed;
uniform float uIsDark;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uPrimary;

// 4x4 Bayer threshold matrix (0..1) evaluated cleanly in WebGL 1 without array indexing
float bayer4(vec2 p) {
  vec2 c = mod(floor(p), 4.0);
  int x = int(c.x);
  int y = int(c.y);
  int m = 0;
  if (y == 0) { m = (x == 0) ? 0 : (x == 1) ? 8 : (x == 2) ? 2 : 10; }
  else if (y == 1) { m = (x == 0) ? 12 : (x == 1) ? 4 : (x == 2) ? 14 : 6; }
  else if (y == 2) { m = (x == 0) ? 3 : (x == 1) ? 11 : (x == 2) ? 1 : 9; }
  else { m = (x == 0) ? 15 : (x == 1) ? 7 : (x == 2) ? 13 : 5; }
  return (float(m) + 0.5) / 16.0;
}

float hash1(float n) { return fract(sin(n) * 43758.5453123); }

// Layered organic alpine ridge profile (returns height 0..1 from bottom of scene)
float ridge(float x, float seed, float freq, float amp, float base) {
  float s = x * freq + seed;
  float h = 0.0;
  h += sin(s) * 0.48;
  h += sin(s * 2.13 + 1.4) * 0.28;
  h += sin(s * 4.37 - 0.8) * 0.14;
  h += cos(s * 8.91 + 2.2) * 0.06;
  // Sharpen mountain peaks slightly like real glacial ridges
  float peak = 1.0 - abs(sin(s * 1.15 + 0.6));
  return base + (h * 0.55 + (peak - 0.45) * 0.45) * amp;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float y = 1.0 - uv.y; // 0 top, 1 bottom

  // Quantized pixel cell for crisp 2px editorial Bayer dither grain
  vec2 ditherCoord = floor(gl_FragCoord.xy / max(1.0, 2.0 * uScale));
  float threshold = bayer4(ditherCoord);

  vec3 col = uPaper;
  if (y < uSceneTop - 0.04) {
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // Normalized scene coordinates (0 = sceneTop, 1 = bottom edge)
  float sy = clamp((y - uSceneTop) / max(0.01, 1.0 - uSceneTop), 0.0, 1.0);
  float fromBottom = 1.0 - sy;
  float px = uParallax.x;
  float py = uParallax.y;

  // Alpine cobalt-blue Risograph & twilight palette derived from primary/accent
  vec3 skyGlow = uIsDark > 0.5
    ? mix(uPaper, uPrimary, 0.34)
    : mix(uPaper, uPrimary, 0.22);
  vec3 sunCol = uIsDark > 0.5
    ? mix(uPrimary, vec3(0.95, 0.98, 1.0), 0.16)
    : mix(uPrimary, uPaper, 0.18);
  vec3 farCol = uIsDark > 0.5
    ? mix(uPaper, mix(uPrimary, uInk, 0.35), 0.32)
    : mix(uPaper, mix(uInk, uPrimary, 0.42), 0.28);
  vec3 midCol = uIsDark > 0.5
    ? mix(uPaper, mix(uPrimary, uInk, 0.22), 0.52)
    : mix(uPaper, mix(uInk, uPrimary, 0.36), 0.52);
  vec3 nearCol = uIsDark > 0.5
    ? mix(uPaper, mix(uPrimary, vec3(0.02, 0.03, 0.06), 0.72), 0.88)
    : mix(uPaper, mix(uInk, uPrimary, 0.22), 0.88);
  vec3 rimCol = uIsDark > 0.5
    ? mix(uPrimary, vec3(0.92, 0.96, 1.0), 0.5)
    : mix(uPrimary, uPaper, 0.18);

  // 1. Atmospheric Bayer-dithered sky glow rising behind the ridges
  float sunX = 0.66 + px * 0.015;
  float sunBaseY = mix(0.22, 0.58, uReveal) + py * 0.01;
  float aspect = uRes.x / max(1.0, uRes.y * max(0.01, 1.0 - uSceneTop));
  vec2 toSun = vec2((uv.x - sunX) * aspect, fromBottom - sunBaseY);
  float sunDist = length(toSun);
  float halo = exp(-sunDist * 1.45) * 0.88 * uReveal;
  float horizonWash = smoothstep(0.0, 0.85, sy) * 0.45 * uReveal;
  float skyDither = step(threshold, clamp(halo + horizonWash * 0.65, 0.0, 0.95));
  col = mix(col, skyGlow, skyDither * smoothstep(uSceneTop - 0.02, uSceneTop + 0.06, y));

  // Crisp stars in upper dark sky
  if (uIsDark > 0.5 && sy > 0.04 && sy < 0.62) {
    vec2 cell = floor(ditherCoord / 9.0);
    float rnd = hash1(dot(cell, vec2(127.1, 311.7)) + uSeed);
    if (rnd > 0.986) {
      vec2 inside = fract(ditherCoord / 9.0);
      if (inside.x < 0.22 && inside.y < 0.22) {
        float tw = 0.45 + 0.55 * sin(uTime * (1.2 + rnd * 2.0) + rnd * 60.0);
        col = mix(col, sunCol, tw * 0.75 * uReveal);
      }
    }
  }

  // 2. Bold dithered sun/moon disc behind the far range
  float sunRad = 0.26;
  float discEdge = smoothstep(sunRad + 0.04, sunRad - 0.04, sunDist);
  if (discEdge > 0.01) {
    float discFill = step(threshold * 0.85, discEdge);
    float scan = 1.0 - 0.22 * step(0.5, fract(gl_FragCoord.y / (4.0 * uScale))) * smoothstep(sunBaseY + 0.05, sunBaseY - 0.2, fromBottom);
    col = mix(col, sunCol, discFill * scan * uReveal);
  }

  // 3. Far mountain ridge (depth 0.35x)
  float farX = uv.x + px * 0.024;
  float farH = ridge(farX, uSeed + 1.1, 4.6, 0.24, 0.52) * (0.65 + 0.35 * uReveal);
  if (fromBottom < farH) {
    float crestDist = farH - fromBottom;
    float shade = clamp(crestDist / 0.22, 0.0, 1.0);
    float dRim = step(threshold, clamp(1.0 - crestDist / 0.065, 0.0, 1.0) * (0.45 + 0.55 * exp(-abs(uv.x - sunX) * 2.2)));
    float dBody = step(threshold, 0.35 + 0.65 * shade);
    vec3 mCol = mix(skyGlow, farCol, dBody);
    mCol = mix(mCol, rimCol, dRim * 0.72);
    col = mCol;
  }

  // 4. Monumental brand wordmark standing behind the mid-range ridge
  float wordRise = (1.0 - uReveal) * 0.14;
  vec2 wUv = vec2(clamp(uv.x + px * 0.04, 0.0, 1.0), clamp(y - wordRise, 0.0, 1.0));
  float word = texture2D(uMask, wUv).r;
  if (word > 0.05) {
    // The name stays a clear step away from the sun: near-white at night, near-ink by day.
    vec3 wordColor = uIsDark > 0.5
      ? mix(uInk, sunCol, 0.08 + 0.1 * exp(-abs(uv.x - sunX) * 1.8))
      : mix(uInk, uPrimary, 0.12 + 0.1 * exp(-abs(uv.x - sunX) * 1.8));
    float above = texture2D(uMask, vec2(wUv.x, max(0.0, wUv.y - 2.0 * uScale / uRes.y))).r;
    float topEdge = clamp(word - above, 0.0, 1.0);
    col = mix(col, wordColor, word * 0.94);
    col = mix(col, rimCol, topEdge * 0.75);
  }

  // 5. Drifting Bayer-dithered valley mist gliding behind mid ridge
  float mistWave = sin(uv.x * 5.2 - uTime * 0.22 + uSeed) * 0.045 + cos(uv.x * 9.1 + uTime * 0.16) * 0.025;
  float mistBand = exp(-pow((fromBottom - (0.36 + mistWave)) / 0.095, 2.0));
  if (mistBand > 0.06) {
    float mDith = step(threshold, mistBand * 0.52 * uReveal);
    col = mix(col, skyGlow, mDith * (uIsDark > 0.5 ? 0.55 : 0.48));
  }

  // 6. Mid mountain ridge (depth 0.72x — physically overlaps bottom of wordmark)
  float midX = uv.x + px * 0.052;
  float midH = ridge(midX, uSeed + 4.7, 5.4, 0.22, 0.31) * (0.72 + 0.28 * uReveal);
  if (fromBottom < midH) {
    float crestDist = midH - fromBottom;
    float dRim = step(threshold, clamp(1.0 - crestDist / 0.055, 0.0, 1.0) * (0.35 + 0.65 * exp(-abs(uv.x - sunX) * 2.0)));
    float slopeGrad = clamp(crestDist / 0.26, 0.0, 1.0);
    float dSlope = step(threshold, 0.25 + 0.75 * slopeGrad);
    vec3 mCol = mix(farCol, midCol, dSlope);
    mCol = mix(mCol, rimCol, dRim * 0.62);
    col = mCol;
  }

  // 7. Foreground dark silhouette ridge (depth 1.0x — anchors the bottom caption cleanly)
  float nearX = uv.x + px * 0.088;
  float nearH = ridge(nearX, uSeed + 9.3, 3.8, 0.12, 0.215) * (0.75 + 0.25 * uReveal);
  if (fromBottom < nearH) {
    float crestDist = nearH - fromBottom;
    float dRim = step(threshold, clamp(1.0 - crestDist / 0.028, 0.0, 1.0) * 0.55);
    float dBody = step(threshold, clamp(0.45 + crestDist / 0.14, 0.0, 1.0));
    col = mix(midCol, nearCol, dBody);
    col = mix(col, rimCol, dRim * 0.32);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export function readRidgeRgb(css: string, fallback: Rgb): Rgb {
  if (typeof document === "undefined" || !css) return fallback;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return fallback;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

export function createRidgeRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "program");
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const maskTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = (n: string) => gl.getUniformLocation(program, n);
  const at = {
    res: u("uRes"),
    scale: u("uScale"),
    time: u("uTime"),
    reveal: u("uReveal"),
    parallax: u("uParallax"),
    sceneTop: u("uSceneTop"),
    seed: u("uSeed"),
    isDark: u("uIsDark"),
    paper: u("uPaper"),
    ink: u("uInk"),
    primary: u("uPrimary"),
  };
  gl.uniform1i(u("uMask"), 0);

  return {
    layout(width: number, height: number, dpr: number, sceneTopFrac: number, seed: number) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(at.res, width, height);
      gl.uniform1f(at.scale, dpr);
      gl.uniform1f(at.sceneTop, sceneTopFrac);
      gl.uniform1f(at.seed, seed);
    },
    mask(image: HTMLCanvasElement) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, maskTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    },
    colors(paper: Rgb, ink: Rgb, primary: Rgb, isDark: boolean) {
      gl.uniform3f(at.paper, ...paper);
      gl.uniform3f(at.ink, ...ink);
      gl.uniform3f(at.primary, ...primary);
      gl.uniform1f(at.isDark, isDark ? 1 : 0);
    },
    draw(time: number, reveal: number, px: number, py: number) {
      gl.uniform1f(at.time, time);
      gl.uniform1f(at.reveal, reveal);
      gl.uniform2f(at.parallax, px, py);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteTexture(maskTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}

export type RidgeRenderer = NonNullable<ReturnType<typeof createRidgeRenderer>>;
