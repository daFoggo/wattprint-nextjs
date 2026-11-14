export type Rgb = [number, number, number];

/** A push and/or some ink at a point. Positions in 0–1 across the orb (y up), radius as a fraction of it. */
export interface Emitter {
  x: number;
  y: number;
  radius: number;
  /** Force in grid cells per second, added once. */
  fx?: number;
  fy?: number;
  /** Ink colour and how much. */
  color?: Rgb;
  amount?: number;
}

export interface FluidStep {
  dt: number;
  emitters: Emitter[];
  /** How strongly small eddies are kept alive. */
  curl: number;
  /** Fraction of the speed and of the ink lost per second. */
  velocityFade: number;
  inkFade: number;
  /** Extra fade toward the wall, per second. */
  rimFade: number;
  /** How hard the whole body of water is turned. */
  swirl: number;
}

export interface FluidLook {
  /** The vessel's radius as a fraction of the canvas (0.5 fills it). */
  radius: number;
  /** The water the ink sits in: dilute pools of the inks over a tint, so the body reads even where no ink moves. */
  water: Water;
  dark: boolean;
}

/** Laid out in the vessel's own box (0 to 1, y down) and composited exactly as CSS radial gradients are, so a CSS
 * picture of it (waterCss) matches the first frame. */
export interface Water {
  /** One colour per pool; the first also tints the water and draws the rim. */
  inks: Rgb[];
  /** Pool centres. */
  pools: [number, number][];
  /** A pool's opacity at its centre, fading linearly to nothing at its radius (a fraction of the diameter). */
  poolAlpha: number;
  poolRadius: number;
  /** The tint's opacity inside half the radius, and at the rim. */
  base: [number, number];
  /** The 1px rim's opacity. */
  line: number;
}

const SIM = 128;
const JACOBI = 18;
const MAX_EMIT = 8;

const VERTEX = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const head = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv;
out vec4 o;
`;

const ADVECT = `${head}
uniform sampler2D uVel;
uniform sampler2D uSrc;
uniform vec2 uSimTexel;
uniform vec2 uSrcTexel;
uniform float uDt;
uniform float uKeep;
uniform float uWall;
uniform float uCap;
uniform float uRim;
uniform float uSharp;
void main() {
  vec2 back = vUv - uDt * texture(uVel, vUv).xy * uSimTexel;
  vec4 r = texture(uSrc, back);
  if (uSharp > 0.5) {
    // MacCormack: carry the result forward again, measure what the round trip lost and put it back, clamped to the
    // cells it came from so it can never ring. Keeps ink in fine filaments instead of smearing them every frame.
    vec2 ahead = back + uDt * texture(uVel, back).xy * uSimTexel;
    r += 0.5 * (texture(uSrc, vUv) - texture(uSrc, ahead));
    vec2 cell = (floor(back / uSrcTexel - 0.5) + 0.5) * uSrcTexel;
    vec4 c0 = texture(uSrc, cell);
    vec4 c1 = texture(uSrc, cell + vec2(uSrcTexel.x, 0.0));
    vec4 c2 = texture(uSrc, cell + vec2(0.0, uSrcTexel.y));
    vec4 c3 = texture(uSrc, cell + uSrcTexel);
    r = clamp(r, min(min(c0, c1), min(c2, c3)), max(max(c0, c1), max(c2, c3)));
  }
  r *= uKeep;
  // Ink clears faster toward the wall, so the picture is one body in clear water.
  r /= 1.0 + uRim * uDt * smoothstep(0.2, 0.44, length(vUv - 0.5));
  if (uWall > 0.5) r.xy *= 1.0 - smoothstep(0.43, 0.49, length(vUv - 0.5));
  if (uCap > 0.0 && r.a > uCap) r *= uCap / r.a;
  o = r;
}`;

const CURL = `${head}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
  float l = texture(uVel, vUv - vec2(uTexel.x, 0.0)).y;
  float r = texture(uVel, vUv + vec2(uTexel.x, 0.0)).y;
  float b = texture(uVel, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uVel, vUv + vec2(0.0, uTexel.y)).x;
  o = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}`;

const VORTICITY = `${head}
uniform sampler2D uVel;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform float uAmount;
uniform float uDt;
uniform float uSwirl;
void main() {
  float l = texture(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uCurl, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uCurl, vUv + vec2(0.0, uTexel.y)).x;
  float c = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
  f /= length(f) + 0.0001;
  f *= uAmount * c;
  f.y *= -1.0;
  // The water turns as a whole, faster near the middle, so stirred ink winds into arms instead of crinkling.
  vec2 p = vUv - 0.5;
  float inside = 1.0 - smoothstep(0.36, 0.47, length(p));
  vec2 turn = vec2(-p.y, p.x) / (length(p) + 0.3) * 128.0 * uSwirl * inside;
  vec2 v = texture(uVel, vUv).xy + (f + turn) * uDt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`;

const SPLAT = `${head}
uniform sampler2D uSrc;
uniform vec4 uPoint[${MAX_EMIT}];
uniform vec4 uValue[${MAX_EMIT}];
uniform int uCount;
void main() {
  vec4 base = texture(uSrc, vUv);
  for (int i = 0; i < ${MAX_EMIT}; i++) {
    if (i >= uCount) break;
    vec2 d = vUv - uPoint[i].xy;
    base += uValue[i] * exp(-dot(d, d) / uPoint[i].z);
  }
  o = base;
}`;

const DIVERGENCE = `${head}
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
  float l = texture(uVel, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uVel, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uVel, vUv - vec2(0.0, uTexel.y)).y;
  float t = texture(uVel, vUv + vec2(0.0, uTexel.y)).y;
  o = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`;

const SCALE = `${head}
uniform sampler2D uSrc;
uniform float uKeep;
void main() { o = texture(uSrc, vUv) * uKeep; }`;

const JACOBI_FS = `${head}
uniform sampler2D uPressure;
uniform sampler2D uDiv;
uniform vec2 uTexel;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float d = texture(uDiv, vUv).x;
  o = vec4((l + r + b + t - d) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = `${head}
uniform sampler2D uPressure;
uniform sampler2D uVel;
uniform vec2 uTexel;
void main() {
  float l = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 v = texture(uVel, vUv).xy - vec2(r - l, t - b);
  o = vec4(v, 0.0, 1.0);
}`;

const DISPLAY = `${head}
uniform sampler2D uDye;
uniform vec2 uTexel;
uniform float uRadius;
uniform float uAa;
uniform vec2 uPx;
uniform vec3 uInk[3];
uniform vec2 uPool[3];
uniform float uPoolA;
uniform float uPoolR;
uniform vec2 uBase;
uniform float uLine;
uniform float uDark;
void main() {
  float dist = length(vUv - 0.5);
  float vessel = 1.0 - smoothstep(uRadius - uAa, uRadius + uAa, dist);
  if (vessel <= 0.0) { o = vec4(0.0); return; }
  vec4 d = max(texture(uDye, vUv), 0.0);
  float amt = d.a;
  vec3 col = d.rgb / max(amt, 0.001);

  // The folds: the slope of the ink's thickness, lit from the top left like silk under water.
  float al = texture(uDye, vUv - vec2(uTexel.x, 0.0)).a;
  float ar = texture(uDye, vUv + vec2(uTexel.x, 0.0)).a;
  float ab = texture(uDye, vUv - vec2(0.0, uTexel.y)).a;
  float at = texture(uDye, vUv + vec2(0.0, uTexel.y)).a;
  vec3 n = normalize(vec3((al - ar) * 1.3, (ab - at) * 1.3, 1.0));
  vec3 l = normalize(vec3(-0.5, 0.62, 0.75));
  float shade = 0.8 + 0.28 * dot(n, l);
  float sheen = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 22.0) * smoothstep(0.08, 0.6, amt);

  // Ink has an edge: opacity rises steeply with thickness, with a little haze kept so the edge isn't cut out.
  float a = mix(smoothstep(0.07, 0.55, amt), 1.0 - exp(-amt * 3.0), 0.3);
  a *= 1.0 - smoothstep(uRadius - 0.09, uRadius, dist);
  // Mixed inks keep their colour: chroma pushed back out from the grey that averaging makes.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = clamp(mix(vec3(lum), col, 1.18), 0.0, 1.0);
  // Lit from behind: thin ink glows lighter, thick ink deepens, so the body has depth without a shaded sphere.
  float thick = smoothstep(0.2, 1.9, amt);
  col = mix(mix(col, vec3(1.0), 0.3), col * 0.74, thick);
  col = col * shade + sheen * mix(0.14, 0.1, uDark);
  // In the dark, ink is lit from within rather than muddied by the background.
  col = mix(col, col * 1.18 + 0.05, uDark);

  // The water, layered the way CSS layers radial gradients (premultiplied, the first pool on top), so the stand-in
  // drawn in CSS before the shaders are ready is this same picture: a tint deepening toward the rim, a dilute pool of
  // each ink, and a 1px rim.
  float rr = dist / uRadius;
  vec2 q = vec2(vUv.x - 0.5, 0.5 - vUv.y) / (2.0 * uRadius) + 0.5;
  float ba = mix(uBase.x, uBase.y, clamp(rr * 2.0 - 1.0, 0.0, 1.0));
  vec4 water = vec4(uInk[0] * ba, ba);
  for (int i = 2; i >= 0; i--) {
    float pa = uPoolA * max(0.0, 1.0 - length(q - uPool[i]) / uPoolR);
    water = vec4(uInk[i] * pa, pa) + water * (1.0 - pa);
  }
  // The rim: one CSS pixel just inside the edge, box-filtered at the device pixel, like the stand-in's inset ring.
  float line = clamp((0.5 * uPx.x + 0.5 * uPx.y - abs(dist - (uRadius - 0.5 * uPx.x))) / uPx.y, 0.0, 1.0) * uLine;
  water = vec4(uInk[0] * line, line) + water * (1.0 - line);
  o = (vec4(col * a, a) + water * (1.0 - a)) * vessel;
}`;

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
type Double = { read: Target; write: Target; swap: () => void };

export function createFluidOrb(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: "low-power" });
  if (!gl) return null;
  if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) return null;

  const compile = (type: number, source: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  // Shaders compile in the background where the browser can (KHR_parallel_shader_compile): asking for a compile or link
  // status straight away would block the page until the GPU process is done, so statuses are only read once ready().
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const programs: WebGLProgram[] = [];
  const program = (fragment: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, vertex);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    programs.push(p);
    const cache = new Map<string, WebGLUniformLocation | null>();
    const u = (name: string) => {
      if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
      return cache.get(name) ?? null;
    };
    return { p, u };
  };
  const P = {
    advect: program(ADVECT),
    curl: program(CURL),
    vorticity: program(VORTICITY),
    splat: program(SPLAT),
    divergence: program(DIVERGENCE),
    scale: program(SCALE),
    jacobi: program(JACOBI_FS),
    gradient: program(GRADIENT),
    display: program(DISPLAY),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const targets: Target[] = [];
  const target = (w: number, h: number): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("half-float targets unsupported");
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const t = { tex, fb, w, h };
    targets.push(t);
    return t;
  };
  const double = (w: number, h: number): Double => {
    const d = { read: target(w, h), write: target(w, h), swap: () => ([d.read, d.write] = [d.write, d.read]) };
    return d;
  };

  const ink = Math.max(128, Math.min(384, canvas.width));
  const velocity = double(SIM, SIM);
  const pressure = double(SIM, SIM);
  const dye = double(ink, ink);
  const divergence = target(SIM, SIM);
  const curl = target(SIM, SIM);
  const simTexel: [number, number] = [1 / SIM, 1 / SIM];
  const dyeTexel: [number, number] = [1 / ink, 1 / ink];

  const bind = (unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  };
  const blit = (out: Target | null) => {
    if (out) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
      gl.viewport(0, 0, out.w, out.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const points = new Float32Array(MAX_EMIT * 4);
  const values = new Float32Array(MAX_EMIT * 4);
  const splat = (field: Double, emitters: Emitter[], kind: "force" | "ink") => {
    const list = emitters.filter((e) => (kind === "force" ? e.fx || e.fy : e.amount && e.color));
    for (let start = 0; start < list.length; start += MAX_EMIT) {
      const chunk = list.slice(start, start + MAX_EMIT);
      points.fill(0);
      values.fill(0);
      chunk.forEach((e, i) => {
        points.set([e.x, e.y, e.radius * e.radius, 0], i * 4);
        if (kind === "force") values.set([e.fx ?? 0, e.fy ?? 0, 0, 0], i * 4);
        else {
          const a = e.amount ?? 0;
          const c = e.color ?? [0, 0, 0];
          values.set([c[0] * a, c[1] * a, c[2] * a, a], i * 4);
        }
      });
      gl.useProgram(P.splat.p);
      bind(0, field.read.tex, P.splat.u("uSrc"));
      gl.uniform4fv(P.splat.u("uPoint"), points);
      gl.uniform4fv(P.splat.u("uValue"), values);
      gl.uniform1i(P.splat.u("uCount"), chunk.length);
      blit(field.write);
      field.swap();
    }
  };

  let lost = false;
  canvas.addEventListener("webglcontextlost", () => (lost = true));
  let linked = false;

  return {
    /** True once every program has linked; until then nothing may be drawn. Throws if one failed. */
    ready() {
      if (linked) return true;
      if (parallel && !programs.every((p) => gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR))) return false;
      for (const p of programs) if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
      linked = true;
      return true;
    },
    /** Ink only, no force: for the first cloud. */
    seed(emitters: Emitter[]) {
      if (lost) return;
      gl.disable(gl.BLEND);
      splat(dye, emitters, "ink");
    },
    step({ dt, emitters, curl: curlAmount, velocityFade, inkFade, rimFade, swirl }: FluidStep) {
      if (lost || dt <= 0) return;
      gl.disable(gl.BLEND);

      gl.useProgram(P.curl.p);
      bind(0, velocity.read.tex, P.curl.u("uVel"));
      gl.uniform2fv(P.curl.u("uTexel"), simTexel);
      blit(curl);

      gl.useProgram(P.vorticity.p);
      bind(0, velocity.read.tex, P.vorticity.u("uVel"));
      bind(1, curl.tex, P.vorticity.u("uCurl"));
      gl.uniform2fv(P.vorticity.u("uTexel"), simTexel);
      gl.uniform1f(P.vorticity.u("uAmount"), curlAmount);
      gl.uniform1f(P.vorticity.u("uDt"), dt);
      gl.uniform1f(P.vorticity.u("uSwirl"), swirl);
      blit(velocity.write);
      velocity.swap();

      splat(velocity, emitters, "force");
      splat(dye, emitters, "ink");

      gl.useProgram(P.divergence.p);
      bind(0, velocity.read.tex, P.divergence.u("uVel"));
      gl.uniform2fv(P.divergence.u("uTexel"), simTexel);
      blit(divergence);

      gl.useProgram(P.scale.p);
      bind(0, pressure.read.tex, P.scale.u("uSrc"));
      gl.uniform1f(P.scale.u("uKeep"), 0.8);
      blit(pressure.write);
      pressure.swap();

      gl.useProgram(P.jacobi.p);
      gl.uniform2fv(P.jacobi.u("uTexel"), simTexel);
      bind(1, divergence.tex, P.jacobi.u("uDiv"));
      for (let i = 0; i < JACOBI; i++) {
        bind(0, pressure.read.tex, P.jacobi.u("uPressure"));
        blit(pressure.write);
        pressure.swap();
      }

      gl.useProgram(P.gradient.p);
      bind(0, pressure.read.tex, P.gradient.u("uPressure"));
      bind(1, velocity.read.tex, P.gradient.u("uVel"));
      gl.uniform2fv(P.gradient.u("uTexel"), simTexel);
      blit(velocity.write);
      velocity.swap();

      gl.useProgram(P.advect.p);
      gl.uniform2fv(P.advect.u("uSimTexel"), simTexel);
      gl.uniform1f(P.advect.u("uDt"), dt);
      bind(0, velocity.read.tex, P.advect.u("uVel"));
      bind(1, velocity.read.tex, P.advect.u("uSrc"));
      gl.uniform1f(P.advect.u("uKeep"), 1 / (1 + velocityFade * dt));
      gl.uniform1f(P.advect.u("uWall"), 1);
      gl.uniform1f(P.advect.u("uCap"), 0);
      gl.uniform1f(P.advect.u("uRim"), 0);
      gl.uniform1f(P.advect.u("uSharp"), 0);
      gl.uniform2fv(P.advect.u("uSrcTexel"), simTexel);
      blit(velocity.write);
      velocity.swap();

      bind(0, velocity.read.tex, P.advect.u("uVel"));
      bind(1, dye.read.tex, P.advect.u("uSrc"));
      gl.uniform1f(P.advect.u("uKeep"), 1 / (1 + inkFade * dt));
      gl.uniform1f(P.advect.u("uWall"), 0);
      gl.uniform1f(P.advect.u("uCap"), 2.4);
      gl.uniform1f(P.advect.u("uRim"), rimFade);
      gl.uniform1f(P.advect.u("uSharp"), 1);
      gl.uniform2fv(P.advect.u("uSrcTexel"), dyeTexel);
      blit(dye.write);
      dye.swap();
    },
    draw({ radius, water, dark }: FluidLook) {
      if (lost) return;
      gl.disable(gl.BLEND);
      gl.useProgram(P.display.p);
      bind(0, dye.read.tex, P.display.u("uDye"));
      gl.uniform2fv(P.display.u("uTexel"), dyeTexel);
      gl.uniform1f(P.display.u("uRadius"), radius);
      gl.uniform1f(P.display.u("uAa"), 1.2 / canvas.width);
      // One CSS pixel and one device pixel, in the canvas's 0 to 1 space (the canvas is sized at up to 2x).
      gl.uniform2f(P.display.u("uPx"), Math.min(2, window.devicePixelRatio || 1) / canvas.width, 1 / canvas.width);
      gl.uniform3fv(P.display.u("uInk"), water.inks.flat());
      gl.uniform2fv(P.display.u("uPool"), water.pools.flat());
      gl.uniform1f(P.display.u("uPoolA"), water.poolAlpha);
      gl.uniform1f(P.display.u("uPoolR"), water.poolRadius);
      gl.uniform2fv(P.display.u("uBase"), water.base);
      gl.uniform1f(P.display.u("uLine"), water.line);
      gl.uniform1f(P.display.u("uDark"), dark ? 1 : 0);
      gl.clearColor(0, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
      blit(null);
    },
    dispose() {
      targets.forEach((t) => {
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fb);
      });
      programs.forEach((p) => gl.deleteProgram(p));
      gl.deleteShader(vertex);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    },
  };
}

export type FluidOrb = NonNullable<ReturnType<typeof createFluidOrb>>;

/** Any CSS colour, theme variables included, as 0–1 RGB: resolved by the browser, read back from one pixel. */
export function resolveColors(host: HTMLElement, colors: string[]): Rgb[] {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  host.appendChild(probe);
  const paint = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const out = colors.map((css): Rgb => {
    probe.style.color = "";
    probe.style.color = css;
    const computed = getComputedStyle(probe).color;
    if (!paint) return [0.2, 0.36, 0.87];
    paint.clearRect(0, 0, 1, 1);
    paint.fillStyle = "#3a5ddd";
    paint.fillStyle = computed;
    paint.fillRect(0, 0, 1, 1);
    const [r, g, b] = paint.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
  });
  probe.remove();
  return out;
}

/** The water as CSS: the same layers the display shader composites, for the picture shown before WebGL is ready (and
 * instead of it where WebGL 2 is missing). Colours are CSS colours, so theme variables work before anything resolves. */
export function waterCss(water: Omit<Water, "inks">, inks: string[]) {
  const at = (n: number) => `${(n * 100).toFixed(2)}%`;
  const mix = (css: string, a: number) => `color-mix(in srgb, ${css} ${(a * 100).toFixed(1)}%, transparent)`;
  const pools = water.pools.map(([x, y], i) => `radial-gradient(circle calc(${water.poolRadius} * var(--orb-d)) at ${at(x)} ${at(y)}, ${mix(inks[i], water.poolAlpha)}, transparent)`);
  const base = `radial-gradient(circle closest-side, ${mix(inks[0], water.base[0])} 50%, ${mix(inks[0], water.base[1])} 100%)`;
  return { background: [...pools, base].join(", "), boxShadow: `inset 0 0 0 1px ${mix(inks[0], water.line)}` };
}
