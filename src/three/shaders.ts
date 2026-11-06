export const planetVertexShader = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vLocal = normalize(position);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 mv = viewMatrix * world;
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const planetFragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uDeep;
  uniform vec3 uGlow;
  uniform float uTime;
  uniform float uSeed;
  uniform float uGlowStrength;
  uniform float uOpacity;

  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
        f.y
      ),
      mix(
        mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
        f.y
      ),
      f.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.55;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.07 + vec3(1.7, 9.2, 3.4);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 p = vLocal;
    float n = fbm(p * 2.3 + uSeed + vec3(0.0, uTime * 0.012, 0.0));
    float veins = fbm(p * 5.4 - uSeed * 0.6);
    float land = smoothstep(0.38, 0.72, n);

    vec3 color = mix(uDeep, uBase, land * 0.9 + 0.12);
    color = mix(color, uGlow, pow(clamp(veins, 0.0, 1.0), 4.0) * 0.35);
    color *= 0.82 + n * 0.4;

    vec3 N = normalize(vNormalW);
    vec3 L = normalize(vec3(-0.55, 0.62, 0.88));
    float diffuse = smoothstep(-0.22, 0.92, dot(N, L));
    float rim = pow(1.0 - clamp(dot(N, normalize(vViewDir)), 0.0, 1.0), 2.8);

    vec3 outgoing = color * (0.2 + diffuse * 1.08);
    outgoing += uGlow * rim * 0.42 * uGlowStrength;
    outgoing += uGlow * pow(1.0 - land, 3.0) * 0.06;

    gl_FragColor = vec4(outgoing, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vViewDir;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uGlow;
  uniform float uStrength;

  varying vec3 vNormalV;
  varying vec3 vViewDir;

  void main() {
    float rim = pow(1.0 - clamp(abs(dot(vNormalV, vViewDir)), 0.0, 1.0), 3.0);
    float alpha = rim * uStrength;
    gl_FragColor = vec4(uGlow, alpha);
    #include <colorspace_fragment>
  }
`;

export const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aTint;

  uniform float uTime;
  uniform float uPixelRatio;

  varying float vTwinkle;
  varying float vTint;

  void main() {
    vec3 transformed = position;
    float twinkle = 0.55 + 0.45 * sin(uTime * 1.15 + aPhase * 6.2831);
    vTwinkle = twinkle;
    vTint = aTint;

    vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
    gl_PointSize = aSize * uPixelRatio * (150.0 / max(1.0, -mv.z));
    gl_PointSize = clamp(gl_PointSize, 0.6, 9.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const starFragmentShader = /* glsl */ `
  uniform vec3 uCream;
  uniform vec3 uRose;
  uniform vec3 uRed;

  varying float vTwinkle;
  varying float vTint;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float core = smoothstep(0.5, 0.05, d);
    float halo = smoothstep(0.5, 0.16, d) * 0.45;
    vec3 color = mix(uCream, uRose, clamp(vTint, 0.0, 1.0));
    color = mix(color, uRed, step(0.86, vTint) * 0.55);
    float alpha = (core + halo) * vTwinkle;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export const dustVertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uDrift;

  varying float vAlpha;

  void main() {
    vec3 p = position;
    float t = uTime * (0.05 + aPhase * 0.05);
    p.x += sin(t + aPhase * 12.0) * uDrift;
    p.y += cos(t * 0.8 + aPhase * 9.0) * uDrift * 0.7;
    p.z += sin(t * 0.6 + aPhase * 5.0) * uDrift * 0.4;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPixelRatio * (90.0 / max(1.0, -mv.z));
    gl_PointSize = clamp(gl_PointSize, 0.5, 4.0);
    gl_Position = projectionMatrix * mv;

    vAlpha = 0.16 + 0.5 * (0.5 + 0.5 * sin(uTime * 0.8 + aPhase * 6.2831));
  }
`;

export const dustFragmentShader = /* glsl */ `
  uniform vec3 uColor;

  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;
