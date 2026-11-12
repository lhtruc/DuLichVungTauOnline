import * as THREE from 'three';
import { U, NOISE_GLSL } from '../core/shared.js';

/** Animated sea surface. Depth comes from the baked terrain so beaches get shallow water and surf. */
export function buildSea(terrain) {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {}]);
  Object.assign(uniforms, {
    uTime: U.uTime, uNight: U.uNight, uSunDir: U.uSunDir, uSunColor: U.uSunColor,
    uSkyZenith: U.uSkyZenith, uSkyHorizon: U.uSkyHorizon,
    uDepth: { value: terrain.depthTexture() },
    uRect: { value: new THREE.Vector4(terrain.x0, terrain.z0, terrain.width, terrain.depth) },
    uShallow: { value: new THREE.Color(0x3fc9b5) },
    uDeep: { value: new THREE.Color(0x0e4f86) },
  });
  const mat = new THREE.ShaderMaterial({
    uniforms, fog: true,
    vertexShader: /* glsl */`
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWPos;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWPos = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime, uNight;
      uniform vec3 uSunDir, uSunColor, uSkyZenith, uSkyHorizon, uShallow, uDeep;
      uniform sampler2D uDepth; uniform vec4 uRect;
      varying vec3 vWPos;
      ${NOISE_GLSL}
      vec2 wave(vec2 p, vec2 d, float k, float sp, float amp){
        float ph = dot(p, d) * k + uTime * sp;
        return d * (cos(ph) * amp * k);
      }
      void main(){
        vec2 p = vWPos.xz;
        vec2 uvd = (p - uRect.xy) / uRect.zw;
        float inside = step(0.0, uvd.x) * step(uvd.x, 1.0) * step(0.0, uvd.y) * step(uvd.y, 1.0);
        float hb = texture2D(uDepth, uvd).r * 16.0 - 14.0;
        float depth = mix(14.0, -hb, inside);          // metres of water
        float dist = length(vWPos - cameraPosition);

        // layered waves -> normal
        vec2 g = vec2(0.0);
        g += wave(p, normalize(vec2( 0.8, 0.6)), 0.09, 0.9, 0.42);
        g += wave(p, normalize(vec2(-0.5, 0.86)), 0.21, 1.3, 0.16);
        g += wave(p, normalize(vec2( 0.3,-0.95)), 0.47, 1.9, 0.06);
        float fade = 1.0 / (1.0 + dist * 0.004);
        float nz1 = vnoise(p * 0.9 + vec2(uTime * 0.6, uTime * 0.4));
        float nz2 = vnoise(p * 2.3 - vec2(uTime * 0.8, uTime * 0.5));
        g += (vec2(nz1, nz2) - 0.5) * 0.9 * fade;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

        vec3 v = normalize(cameraPosition - vWPos);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 refl = reflect(-v, n);
        float skyT = clamp(refl.y * 1.6, 0.0, 1.0);
        vec3 sky = mix(uSkyHorizon, uSkyZenith, skyT);

        float shallow = smoothstep(7.0, 0.3, depth);
        vec3 body = mix(uDeep, uShallow, shallow * 0.85);
        body *= mix(1.0, 0.16, uNight);
        // very shallow water lets the sand through
        vec3 sand = vec3(0.82, 0.74, 0.55) * mix(1.0, 0.2, uNight);
        body = mix(body, sand, smoothstep(0.9, 0.0, depth) * 0.75);

        vec3 col = mix(body, sky, 0.12 + 0.7 * fres);
        // sun glitter
        float spec = pow(max(dot(refl, uSunDir), 0.0), 220.0) * 2.4 + pow(max(dot(refl, uSunDir), 0.0), 24.0) * 0.22;
        col += uSunColor * spec * (1.0 - uNight * 0.7);

        // surf: bands rolling in over the shallows
        float surfZone = smoothstep(2.6, 0.2, depth) * step(-0.25, depth);
        float band = sin(depth * 3.4 + uTime * 1.25 + vnoise(p * 0.05) * 6.0);
        float foam = smoothstep(0.55, 0.98, band) * surfZone;
        foam += smoothstep(0.32, 0.0, depth) * 0.9 * step(-0.25, depth);
        foam *= 0.55 + 0.6 * vnoise(p * 1.7 + uTime * 0.3);
        // whitecaps offshore
        foam += smoothstep(0.83, 0.95, vnoise(p * 0.035 + uTime * 0.03) * (0.6 + 0.4 * nz1)) * 0.35 * (1.0 - shallow) * fade * 2.0;
        col = mix(col, vec3(0.97, 0.99, 1.0) * mix(1.0, 0.35, uNight), clamp(foam, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const geo = new THREE.PlaneGeometry(60000, 60000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(terrain.x0 + terrain.width / 2, 0, terrain.z0 + terrain.depth / 2);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.name = 'sea';
  return mesh;
}
