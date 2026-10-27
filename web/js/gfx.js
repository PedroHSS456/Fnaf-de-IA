'use strict';
/* Elemental World — renderizador WebGL próprio (toon/cel-shading, água, lava, céu, partículas) */
(function () {
  const G = window.G; const M = G.M;
  const gfx = (G.gfx = {});
  let gl, cv;
  const STRIDE = 36;
  const FP = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function prog(vs, fs, attrs, unis) {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FP + fs));
    attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    const u = {}; unis.forEach((n) => (u[n] = gl.getUniformLocation(p, n)));
    return { p, u };
  }

  /* ---------- shaders ---------- */
  const MAIN_VS = `
attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol;
uniform mat4 uVP; uniform mat4 uModel; uniform vec3 uCam; uniform float uOutline; uniform vec2 uFog;
uniform float uSway; uniform float uTime;
varying vec3 vCol; varying vec3 vN; varying vec3 vV; varying float vFog; varying vec3 vW;
void main(){
  vec4 w = uModel*vec4(aPos,1.0);
  vec3 n = normalize((uModel*vec4(aNrm,0.0)).xyz);
  if(uSway>0.0 && aCol.g>max(aCol.r,aCol.b)*1.12+0.02){
    float ph = uTime*1.7+w.x*0.6+w.z*0.5;
    w.x += sin(ph)*0.07*uSway; w.z += cos(ph*0.8+1.3)*0.05*uSway; w.y += sin(ph*1.3)*0.02*uSway;
  }
  vW = w.xyz;
  w.xyz += n*uOutline;
  gl_Position = uVP*w;
  vCol = aCol; vN = n; vV = uCam - w.xyz;
  float d = length(vV);
  vFog = clamp((d-uFog.x)/(uFog.y-uFog.x),0.0,1.0);
}`;
  const MAIN_FS = `
varying vec3 vCol; varying vec3 vN; varying vec3 vV; varying float vFog; varying vec3 vW;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb; uniform vec3 uFogCol;
uniform vec3 uTint; uniform vec3 uAdd; uniform float uEmis; uniform float uOutline;
uniform float uStyle; uniform float uDetail; uniform float uWet; uniform float uQ;
uniform float uSeis; uniform vec4 uWp[8]; uniform vec4 uWt[8]; uniform float uNW; uniform float uNow; uniform float uSInt; uniform float uSGlow; uniform float uSNoise;
uniform mat4 uLVP; uniform sampler2D uShMap; uniform float uShOn; uniform float uShTex;
float unpk(vec4 c){ return dot(c, vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0)); }
float shTap(vec2 uv, float z){ return z > unpk(texture2D(uShMap, uv)) ? 0.0 : 1.0; }
float shadowF(vec3 w, float nd){
  vec4 l = uLVP*vec4(w,1.0); vec3 q = l.xyz/l.w*0.5+0.5;
  if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0) return 1.0;
  float z = q.z - (0.0012 + 0.0035*(1.0-clamp(nd,0.0,1.0)));
  float t = uShTex*1.4;
  if(uQ<1.5) return shTap(q.xy,z);
  float s = shTap(q.xy,z)*2.0 + shTap(q.xy+vec2(t,0.0),z) + shTap(q.xy-vec2(t,0.0),z) + shTap(q.xy+vec2(0.0,t),z) + shTap(q.xy-vec2(0.0,t),z);
  if(uQ<2.5) return s/6.0;
  s += shTap(q.xy+vec2(t,t),z) + shTap(q.xy+vec2(-t,t),z) + shTap(q.xy+vec2(t,-t),z) + shTap(q.xy+vec2(-t,-t),z);
  return s/10.0;
}
float h21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y); }
void main(){
  if(uOutline>0.0){
    vec3 ink = uStyle>0.5 ? vec3(0.08,0.06,0.05)*(0.75+0.6*vn(vW.xz*5.0+vW.y*4.0))*(0.5+0.5*length(uAmb)) : vCol*0.15*uAmb;
    gl_FragColor = vec4(mix(ink, uFogCol, vFog*0.85),1.0); return; }
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; vec3 v = normalize(vV);
  float ndv = max(dot(n,v),0.0);
  vec2 p = vec2(vW.x+vW.z*0.6, vW.y*1.6+vW.x*0.2);
  if(uSeis>0.5){
    float e = 0.0;
    for(int i=0;i<8;i++){
      if(float(i)>=uNW) break;
      vec4 wp = uWp[i]; vec4 wt = uWt[i];
      float age = uNow-wt.x;
      if(age<0.0 || age>wt.z) continue;
      float d = distance(vW, wp.xyz) + (vn(vW.xz*3.0+float(i)*7.0)-0.5)*uSNoise*5.0;
      float r = wt.y*age; float wd = (0.7+0.9*wp.w)*(0.8+0.5*uSGlow);
      float q = (d-r)/wd;
      float ring = exp(-q*q);
      float tail = exp(-max(r-d,0.0)*0.8)*step(d,r)*0.2;
      float fade = (1.0-age/wt.z)*(1.0-clamp(d/wt.w,0.0,1.0));
      e += (ring+tail)*fade*wp.w;
    }
    float mat = (vCol.r>0.7 && vCol.g>0.6 && vCol.b<0.6) ? 0.45 : ((vCol.b>0.85 && vCol.r>0.8) ? 0.7 : 1.0);
    e *= mat;
    float edge = pow(1.0-ndv, 2.0)*(1.0+0.5*uStyle);
    float cl = smoothstep(0.93,1.0, sin(vW.y*5.0)*0.5+0.5);
    float crack = 1.0-smoothstep(0.0,0.06,abs(vn(p*5.0)-0.5));
    e = 1.0-exp(-e*1.1);
    vec3 col = vec3(0.5,0.16,0.95)*e*(0.4+1.2*edge+0.45*cl+0.3*crack);
    col += vec3(0.6,0.4,1.0)*e*e*0.22;
    col *= uSInt*(0.6+0.8*uSGlow);
    col = 1.0-exp(-col*1.25);
    col += vCol*uEmis*0.0;
    gl_FragColor = vec4(col*(1.0-vFog),1.0); return;
  }
  vec3 alb = vCol*uTint; vec3 col;
  float nd = dot(n,uSunDir);
  if(uStyle>0.5){
    float lum = dot(alb, vec3(0.3,0.59,0.11));
    alb = mix(vec3(lum), alb, 0.9);
    alb = alb*0.9 + vec3(0.075,0.065,0.045);
    float band = nd>0.42 ? 1.0 : (nd>-0.05 ? 0.74 : 0.5);
    float fib = vn(p*42.0)*0.5 + vn(p*110.0)*0.5;
    float blot = vn(p*1.9 + 3.0);
    alb *= 0.92 + 0.12*fib;
    alb *= 0.94 + 0.12*blot;
    float line = fract((vW.x*0.8 + vW.y*1.2 + vW.z*0.7)*4.5);
    float pen = step(0.55, line) * (1.0-smoothstep(0.55,0.8,band)) * 0.17;
    float strata = 1.0 - 0.09*(1.0-smoothstep(0.0,0.07,abs(fract(vW.y*0.5)-0.5)))*step(n.y,0.93);
    float edge = pow(1.0-ndv, 2.2);
    alb = mix(alb, vec3(0.97,0.94,0.86), edge*0.28);
    vec3 light = uAmb*0.78 + uSunCol*0.34*band;
    col = alb*light*0.95*(1.0-pen)*strata;
    col = mix(col, col*vec3(0.78,0.82,1.0), (1.0-band)*0.35);
    col = floor(col*10.0+0.5)/10.0*0.55 + col*0.45;
  } else {
    if(uDetail>=1.0) alb *= 0.9+0.2*vn(p*3.0);
    float sh = clamp((nd+0.3)/1.3,0.0,1.0);
    float ao = uDetail>=2.0 ? 0.8+0.2*(n.y*0.5+0.5) : 1.0;
    float shd = uShOn>0.5 ? shadowF(vW, nd) : 1.0;
    vec3 light = uAmb*(0.8+0.2*n.y)*ao*mix(0.64,1.0,shd) + uSunCol*sh*sh*mix(0.08,1.0,shd);
    col = alb*light*0.72;
    if(uQ>1.5){ vec3 hv = normalize(uSunDir+v); col += uSunCol*pow(max(dot(n,hv),0.0),28.0)*0.06*shd*step(0.0,uSunDir.y); col += uFogCol*pow(1.0-ndv,3.0)*0.07*ao; }
    if(uDetail>=3.0){
      vec3 rf = reflect(-uSunDir,n);
      col += uSunCol*pow(max(dot(rf,v),0.0),20.0)*(0.05+uWet*0.5)*step(0.0,uSunDir.y);
      col = mix(col, uFogCol*1.1, uWet*0.3*pow(1.0-ndv,3.0));
    }
    col += uSunCol*pow(1.0-ndv,3.0)*0.05;
  }
  if(uQ>0.5 && uStyle<0.5){ // tom filmico + leve contraste/saturação
    col *= 0.95;
    vec3 a = col*(2.51*col+0.03), b = col*(2.43*col+0.59)+0.14; col = clamp(a/b,0.0,1.0);
    float l = dot(col,vec3(0.299,0.587,0.114)); col = mix(vec3(l),col,1.0+0.06*uQ);
  }
  col += vCol*uEmis + uAdd;
  gl_FragColor = vec4(mix(col,uFogCol,vFog),1.0);
}`;
  const PART_VS = `
attribute vec3 aPos; attribute vec4 aCol; attribute float aSize;
uniform mat4 uVP; uniform float uScale;
varying vec4 vCol;
void main(){
  vec4 p = uVP*vec4(aPos,1.0);
  gl_Position = p;
  gl_PointSize = clamp(aSize*uScale/max(p.w,0.2),1.0,120.0);
  vCol = aCol;
}`;
  const PART_FS = `
varying vec4 vCol; uniform float uPaper;
void main(){
  vec2 uv = gl_PointCoord-0.5; uv.y = -uv.y;
  float d = length(uv);
  vec3 c = vCol.rgb;
  if(uPaper>0.5){
    float mx = max(c.r,max(c.g,c.b)), mn = min(c.r,min(c.g,c.b));
    float inside = 0.0; float v = uv.y+0.5;
    if(mx<0.25){ inside = step(d,0.46); c = vec3(0.1,0.08,0.07); }
    else if(mx-mn<0.1 && mn<0.72){ inside = step(d,0.42); c = mix(c*1.05, vec3(0.95,0.93,0.88), step(d,0.25)*0.5); }
    else if(mn>0.72){
      float ang = atan(uv.y,uv.x); inside = step(abs(d-0.33),0.06)*step(0.0, sin(ang+1.0)+0.3); c = vec3(0.96,0.98,1.0);
    } else if(c.b>c.r*1.1 && c.b>0.55){
      float w = 0.44*sin(3.14159*clamp(v,0.0,1.0))*(1.0-0.3*v); inside = step(abs(uv.x),w);
      float inner = step(abs(uv.x),w*0.55)*step(0.2,v)*step(v,0.8);
      c = mix(c*0.82, min(c*1.2,1.0), inner); c *= 1.0-0.16*step(abs(sin(v*14.0)),0.2);
    } else if(c.r>0.7 && c.b<0.5){
      float w = 0.42*pow(max(1.0-v,0.0),0.85)*smoothstep(0.0,0.18,v); w *= 1.0+0.25*sin(v*9.0+c.g*20.0); inside = step(abs(uv.x),w);
      float inner = step(abs(uv.x),w*0.5)*step(v,0.7); c = mix(c, vec3(1.0,0.9,0.4), inner*0.8);
    } else {
      inside = step(abs(uv.x)+abs(uv.y),0.46); c *= mix(1.0,0.76,step(0.0,uv.x-uv.y*0.3));
    }
    float rim = step(0.0,inside) * (1.0-inside*0.0);
    gl_FragColor = vec4(c, vCol.a*inside); return;
  }
  gl_FragColor = vec4(c, vCol.a*smoothstep(0.5,0.12,d));
}`;
  const LIQ_VS = `
attribute vec3 aPos; attribute float aD;
uniform mat4 uVP; uniform vec3 uCam; uniform vec2 uFog; uniform float uTime; uniform float uWave;
varying float vD; varying vec3 vV; varying float vFog; varying vec2 vXZ; varying vec4 vSh; uniform mat4 uLVP;
void main(){
  vec3 p = aPos;
  p.y += (sin(p.x*0.45+uTime*1.3)*0.5 + sin(p.z*0.6+uTime*1.1)*0.5)*0.07*uWave;
  gl_Position = uVP*vec4(p,1.0);
  vD = aD; vV = uCam-p; vXZ = p.xz; vSh = uLVP*vec4(p,1.0);
  vFog = clamp((length(vV)-uFog.x)/(uFog.y-uFog.x),0.0,1.0);
}`;
  const LIQ_FS = `
varying float vD; varying vec3 vV; varying float vFog; varying vec2 vXZ; varying vec4 vSh;
uniform float uQ; uniform float uShOn; uniform float uShTex; uniform sampler2D uShMap;
float unpk(vec4 c){ return dot(c, vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0)); }
uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFogCol; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmb;
uniform float uTime; uniform float uAlpha; uniform float uGlow; uniform float uWave; uniform float uPaper;
float wsh(){
  if(uShOn<0.5) return 1.0;
  vec3 q = vSh.xyz*0.5+0.5; if(q.x<0.0||q.x>1.0||q.y<0.0||q.y>1.0||q.z>1.0) return 1.0;
  float z = q.z-0.004, t = uShTex*1.5;
  float s = (z>unpk(texture2D(uShMap,q.xy))?0.0:1.0)*2.0 + (z>unpk(texture2D(uShMap,q.xy+vec2(t,0.0)))?0.0:1.0) + (z>unpk(texture2D(uShMap,q.xy-vec2(t,0.0)))?0.0:1.0) + (z>unpk(texture2D(uShMap,q.xy+vec2(0.0,t)))?0.0:1.0) + (z>unpk(texture2D(uShMap,q.xy-vec2(0.0,t)))?0.0:1.0);
  return s/6.0;
}
void main(){
  float d = clamp(vD,0.0,1.0);
  if(uPaper>0.5){
    float band = d<0.3?0.0:(d<0.62?0.5:1.0);
    vec3 pc = mix(uShallow,uDeep,band)*(0.6+0.4*length(uAmb));
    float w1 = sin(vXZ.x*0.8+uTime*1.2+sin(vXZ.y*0.55+uTime*0.4)*1.6);
    float cr = smoothstep(0.9,0.96,w1)*uWave;
    pc = mix(pc, vec3(0.93,0.97,1.0), cr*0.85);
    float fm = step(d,0.07+0.03*sin(vXZ.x*1.7+uTime*2.0))*uWave;
    pc = mix(pc, vec3(1.0), fm);
    pc += uGlow*(0.4+0.4*sin(vXZ.x*0.7+uTime*0.8));
    gl_FragColor = vec4(mix(pc,uFogCol,vFog), clamp(uAlpha+0.05,0.0,1.0)); return;
  }
  vec3 col = mix(uShallow,uDeep,d)*(0.55+0.45*length(uAmb));
  float nx = sin(vXZ.x*0.9+uTime*1.7)+sin(vXZ.y*1.3-uTime*1.2);
  float nz = sin(vXZ.y*0.8+uTime*1.5)+sin(vXZ.x*1.1+uTime*0.9);
  vec3 n = normalize(vec3(nx*0.12*uWave,1.0,nz*0.12*uWave));
  vec3 v = normalize(vV);
  vec3 r = reflect(-uSunDir,n);
  float spec = pow(max(dot(r,v),0.0),48.0)*step(0.0,uSunDir.y);
  float foam = smoothstep(0.16,0.0,d+0.05*sin(vXZ.x*1.7+uTime*2.0)*uWave+0.05*sin(vXZ.y*1.9-uTime*1.6)*uWave)*uWave;
  float shw = uQ>0.5 ? wsh() : 1.0;
  if(uQ>0.5){ // reflexo do céu (fresnel) + caminho de brilho do sol + sombra
    float fr = pow(1.0-max(dot(n,v),0.0),3.0);
    vec3 sky = uFogCol*1.08 + uSunCol*0.12 + uAmb*0.25;
    col = mix(col, sky, clamp(fr*0.75+0.08,0.0,0.85)*(0.4+0.6*uWave));
    spec += pow(max(dot(r,v),0.0),9.0)*0.12*step(0.0,uSunDir.y);
    col *= mix(0.72,1.0,shw);
  }
  col += uSunCol*spec*0.9*uWave*shw + vec3(foam)*0.55;
  col += uGlow*(0.5+0.5*sin(vXZ.x*0.7+uTime*0.8)*sin(vXZ.y*0.6-uTime*0.7));
  float a = clamp(mix(uAlpha*0.55,uAlpha,d)+foam*0.4,0.0,1.0);
  gl_FragColor = vec4(mix(col,uFogCol,vFog),a);
}`;
  const SKY_VS = `
attribute vec2 aP; varying vec2 vUV;
void main(){ vUV = aP; gl_Position = vec4(aP,0.9999,1.0); }`;
  const SKY_FS = `
varying vec2 vUV;
uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uFwd; uniform vec2 uTan;
uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uBot; uniform vec3 uSunDir; uniform vec3 uSunCol;
uniform float uStars; uniform float uTime; uniform vec3 uCloud; uniform float uPaper;
void main(){
  vec3 r = normalize(uFwd + uRight*vUV.x*uTan.x + uUp*vUV.y*uTan.y);
  float h = r.y;
  if(uPaper>0.5 && h>0.0) h = floor(h*7.0+0.5)/7.0;
  vec3 col = h>0.0 ? mix(uHor,uTop,pow(h,0.55)) : mix(uHor,uBot,min(1.0,-h*3.0));
  float sd = max(dot(r,uSunDir),0.0);
  if(uPaper>0.5) col = mix(col, vec3(1.0,0.93,0.6), step(0.9988,sd)); else col += uSunCol*(pow(sd,900.0)*4.0 + pow(sd,10.0)*0.22);
  float md = max(dot(r,-uSunDir),0.0);
  col += vec3(0.8,0.85,1.0)*pow(md,1500.0)*2.5*uStars;
  vec3 cell = floor(r*90.0);
  float s = fract(sin(dot(cell,vec3(12.9898,78.233,37.719)))*43758.5453);
  col += vec3(step(0.9972,s))*uStars*smoothstep(0.02,0.25,h);
  if(r.y>0.015){
    vec2 p = r.xz/(r.y+0.12)*1.3 + vec2(uTime*0.012,0.0);
    float c = sin(p.x*1.7)*sin(p.y*2.1)+0.5*sin(p.x*3.3+p.y*1.7)+0.25*sin(p.y*5.1-p.x*2.3);
    if(uPaper>0.5){ float c1 = step(0.55,c)*step(0.03,r.y); float c2 = step(0.95,c)*step(0.03,r.y); col = mix(col, uCloud*0.84, c1); col = mix(col, uCloud, c2); }
    else { c = smoothstep(0.45,1.2,c)*0.55*smoothstep(0.015,0.25,h); col = mix(col,uCloud,c); }
  }
  gl_FragColor = vec4(col,1.0);
}`;

  const SH_VS = `
attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol;
uniform mat4 uLVP; uniform mat4 uModel;
void main(){ gl_Position = uLVP*(uModel*vec4(aPos,1.0)); }`;
  const SH_FS = `
vec4 pk(float d){ vec4 e = fract(d*vec4(1.0,255.0,65025.0,16581375.0)); e -= e.yzww*vec4(1.0/255.0,1.0/255.0,1.0/255.0,0.0); return e; }
void main(){ gl_FragColor = pk(gl_FragCoord.z); }`;

  /* ---------- estado ---------- */
  let P = {}; // programas
  const vp = M.mat(), view = M.mat(), proj = M.mat();
  const planes = new Float32Array(24);
  const IDENT = M.ident(M.mat());
  gfx.IDENT = IDENT;
  gfx.eye = [0, 0, 0]; gfx.fwd = [0, 0, 1]; gfx.right = [1, 0, 0]; gfx.up = [0, 1, 0];
  gfx.fov = 62 * Math.PI / 180;
  gfx.w = 1; gfx.h = 1; gfx.scale = 1;
  gfx.stats = { draws: 0, tris: 0 };
  gfx.env = {
    sunDir: [0.4, 0.8, 0.3], sunCol: [1, 0.95, 0.85], amb: [0.55, 0.58, 0.65], fogCol: [0.7, 0.8, 0.9], fogNear: 90, fogFar: 260,
    top: [0.25, 0.5, 0.9], hor: [0.7, 0.82, 0.95], bot: [0.5, 0.6, 0.7], stars: 0, cloud: [1, 1, 1], time: 0,
  };
  /* estilo/nível: gq 0..3 realista (Baixo..Ultra), 4..6 Desenho (Baixo..Alto) */
  gfx.q = { draw: 1, lvl: 1, detail: 1, sway: 0.8, outlineK: 1.25 };
  gfx.applyQ = function () {
    const st = (G.save && G.save.settings) || {};
    st.style = 'real'; if (st.gq == null || st.gq > 3) st.gq = 2; /* modo Desenho desativado nesta versão */
    const i = Math.min(3, Math.max(0, st.gq == null ? 2 : st.gq));
    gfx.q = st.style === 'draw' ? { draw: 1, lvl: 1, detail: 1, sway: 0.9, outlineK: 1.9 } : { draw: 0, lvl: i, detail: i, sway: [0, 0.5, 1, 1.4][i], outlineK: 0 };
    return gfx.q;
  };
  gfx.sway = 0;
  gfx.quality = 1; // multiplicador de resolução relativo ao CSS px
  let partBuf, quadBuf;
  const PART_CAP = 3300;
  let partArr;

  gfx.init = function (canvas) {
    cv = canvas;
    const attrs = { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false };
    gl = cv.getContext('webgl', attrs) || cv.getContext('experimental-webgl', attrs);
    if (!gl) throw new Error('WebGL indisponível neste aparelho');
    gfx.gl = gl;
    P.main = prog(MAIN_VS, MAIN_FS, ['aPos', 'aNrm', 'aCol'], ['uQ', 'uVP', 'uModel', 'uCam', 'uOutline', 'uFog', 'uSunDir', 'uSunCol', 'uAmb', 'uFogCol', 'uTint', 'uAdd', 'uEmis', 'uSway', 'uTime', 'uStyle', 'uDetail', 'uWet', 'uLVP', 'uShMap', 'uShOn', 'uShTex', 'uSeis', 'uWp', 'uWt', 'uNW', 'uNow', 'uSInt', 'uSGlow', 'uSNoise']);
    P.shadow = prog(SH_VS, SH_FS, ['aPos', 'aNrm', 'aCol'], ['uLVP', 'uModel']);
    P.part = prog(PART_VS, PART_FS, ['aPos', 'aCol', 'aSize'], ['uVP', 'uScale', 'uPaper']);
    P.liq = prog(LIQ_VS, LIQ_FS, ['aPos', 'aD'], ['uVP', 'uCam', 'uFog', 'uTime', 'uWave', 'uDeep', 'uShallow', 'uFogCol', 'uSunDir', 'uSunCol', 'uAmb', 'uAlpha', 'uGlow', 'uPaper', 'uQ', 'uShOn', 'uShTex', 'uShMap', 'uLVP']);
    P.sky = prog(SKY_VS, SKY_FS, ['aP'], ['uRight', 'uUp', 'uFwd', 'uTan', 'uTop', 'uHor', 'uBot', 'uSunDir', 'uSunCol', 'uStars', 'uTime', 'uCloud', 'uPaper']);
    partBuf = gl.createBuffer(); partArr = new Float32Array(PART_CAP * 8);
    gl.bindBuffer(gl.ARRAY_BUFFER, partBuf); gl.bufferData(gl.ARRAY_BUFFER, partArr.byteLength, gl.DYNAMIC_DRAW);
    quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW);
    gfx.resize();
  };

  /* ---------- sombras (mapa de profundidade do sol, seguindo o jogador) ---------- */
  let shTex = null, shFb = null, shRb = null, shSize = 0, shLVP = new Float32Array(16);
  let shReady = false, shSkip = 0;
  const SHMAP = [0, 512, 1024, 1536], SHR = [0, 22, 28, 34], SKIP = [1, 3, 2, 2], LK = [0.95, 1.1, 1.25, 1.4];
  gfx.lightK = 1; gfx.shadowOn = false; gfx.shadowPass = false; gfx.shC = [0, 0, 0]; gfx.shR = 22;
  function shAlloc(size) {
    if (shSize === size) return;
    if (!shTex) { shTex = gl.createTexture(); shFb = gl.createFramebuffer(); shRb = gl.createRenderbuffer(); }
    gl.bindTexture(gl.TEXTURE_2D, shTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shTex, 0);
    gl.bindRenderbuffer(gl.RENDERBUFFER, shRb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, shRb);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); shSize = size;
  }
  gfx.shadowLevel = () => { const v = G.save && G.save.settings.shader; return v == null ? 2 : v; }; // 0 desligado, 1 baixo, 2 médio, 3 alto
  /* prepara o passe de sombra; retorna false se as sombras estiverem desligadas */
  gfx.shadowBegin = function (px, py, pz) {
    const lv = gfx.shadowLevel(), st = G.save.settings;
    gfx.lightK = LK[lv]; gfx.shaderLv = gfx.q && gfx.q.draw ? 0 : lv;
    gfx.shadowOn = lv > 0 && !gfx.q.draw;
    if (!gfx.shadowOn) return false;
    if (shReady && shSkip++ % SKIP[lv] !== 0) return false; // reaproveita o mapa dos quadros anteriores
    const size = SHMAP[lv], R = SHR[lv], env = gfx.env;
    shAlloc(size);
    const tx = 2 * R / size;
    const cx = Math.round(px / tx) * tx, cz = Math.round(pz / tx) * tx;
    const sd = env.sunDir, sl = Math.hypot(sd[0], sd[1], sd[2]) || 1;
    let dx = sd[0] / sl, dz = sd[2] / sl, dy = Math.min(0.8, Math.max(0.3, sd[1] / sl));
    { const hz = Math.hypot(dx, dz); if (hz < 0.55) { if (hz < 1e-3) { dx = 0.55; dz = 0.2; } else { dx *= 0.55 / hz; dz *= 0.55 / hz; } } } // sol nunca a pino: sombras visíveis ao meio-dia
    const eye = [cx + dx * R * 2.5, py + dy * R * 2.5, cz + dz * R * 2.5], tgt = [cx, py, cz];
    const view = M.mat(); M.lookAt(view, eye, tgt, [0, 1, 0]);
    const o = M.mat(); o.fill(0); const n = 0.1, f = R * 5;
    o[0] = 1 / R; o[5] = 1 / R; o[10] = -2 / (f - n); o[14] = -(f + n) / (f - n); o[15] = 1;
    M.mul(shLVP, o, view);
    gfx.shC = [cx, py, cz]; gfx.shR = R;
    gl.bindFramebuffer(gl.FRAMEBUFFER, shFb); gl.viewport(0, 0, size, size);
    gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    gfx.shadowPass = true; gfx._prog = '';
    return true;
  };
  /* diagnóstico: o mapa de sombras tem conteúdo? (lê um bloco do centro) */
  gfx.shDiag = function () {
    if (!shFb) return { err: 'sem mapa' };
    gl.bindFramebuffer(gl.FRAMEBUFFER, shFb);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER), n = 48, buf = new Uint8Array(n * n * 4);
    gl.readPixels((shSize - n) >> 1, (shSize - n) >> 1, n, n, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let non = 0; for (let i = 0; i < buf.length; i += 4) if (buf[i] < 250 || buf[i + 1] < 250) non++;
    const hp = gl.getShaderPrecisionFormat ? gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT) : null;
    return { fb: st === gl.FRAMEBUFFER_COMPLETE, non, of: n * n, highp: hp ? hp.precision : -1, size: shSize, ready: shReady, on: gfx.shadowOn };
  };
  gfx.shadowEnd = function () {
    shReady = true;
    gfx.shadowPass = false; gfx._prog = '';
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gfx.w, gfx.h);
  };

  gfx.resize = function () {
    const cssW = Math.max(1, cv.clientWidth || window.innerWidth), cssH = Math.max(1, cv.clientHeight || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let s = Math.min(dpr, gfx.quality);
    // limita a ~1.3 MPixels para aparelhos simples
    const maxPix = gfx.quality > 1.2 ? 2.2e6 : 1.3e6; if (cssW * cssH * s * s > maxPix) s = Math.sqrt(maxPix / (cssW * cssH));
    cv.width = Math.max(2, Math.round(cssW * s)); cv.height = Math.max(2, Math.round(cssH * s));
    gfx.w = cv.width; gfx.h = cv.height; gfx.scale = s;
    gl.viewport(0, 0, gfx.w, gfx.h);
  };

  /* ---------- malhas ---------- */
  gfx.mesh = function (arr, n) {
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    return { buf, n: n != null ? n : arr.length / 9, kind: 'main' };
  };
  gfx.liqMesh = function (arr) {
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);
    return { buf, n: arr.length / 4, kind: 'liq' };
  };
  gfx.free = function (m) { if (m && m.buf) { gl.deleteBuffer(m.buf); m.buf = null; } };

  class MB {
    constructor(jit) { this.a = new Float32Array(9 * 3 * 2048); this.n = 0; this.jit = jit == null ? 0.06 : jit; this.seed = 12345; }
    _ens() { if ((this.n + 3) * 9 > this.a.length) { const b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; } }
    /* triângulo em espaço local, com dica de normal externa (hx,hy,hz); aplica matriz m */
    t(m, ax, ay, az, bx, by, bz, cx, cy, cz, hx, hy, hz, col) {
      let ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * hx + ny * hy + nz * hz < 0) { let t0 = bx; bx = cx; cx = t0; t0 = by; by = cy; cy = t0; t0 = bz; bz = cz; cz = t0; }
      let A = [ax, ay, az], B = [bx, by, bz], C = [cx, cy, cz];
      if (m) { A = M.xf(m, ax, ay, az); B = M.xf(m, bx, by, bz); C = M.xf(m, cx, cy, cz); }
      ux = B[0] - A[0]; uy = B[1] - A[1]; uz = B[2] - A[2]; vx = C[0] - A[0]; vy = C[1] - A[1]; vz = C[2] - A[2];
      nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz); if (l < 1e-12) return; nx /= l; ny /= l; nz /= l;
      let k = 1;
      if (this.jit) { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; k = 1 + (this.seed / 4294967296 - 0.5) * 2 * this.jit; }
      this._ens();
      const a = this.a; let o = this.n * 9;
      const r = col[0] * k, g = col[1] * k, b = col[2] * k;
      const P3 = [A, B, C];
      for (let i = 0; i < 3; i++) { a[o++] = P3[i][0]; a[o++] = P3[i][1]; a[o++] = P3[i][2]; a[o++] = nx; a[o++] = ny; a[o++] = nz; a[o++] = r; a[o++] = g; a[o++] = b; }
      this.n += 3;
    }
    /* triângulo em espaço de mundo, já com winding correto (normal conforme regra da mão direita) */
    w(ax, ay, az, bx, by, bz, cx, cy, cz, col, jitOff) {
      const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz); if (l < 1e-12) return; nx /= l; ny /= l; nz /= l;
      let k = 1;
      if (this.jit) { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; k = 1 + (this.seed / 4294967296 - 0.5) * 2 * this.jit; }
      this._ens();
      const a = this.a; let o = this.n * 9;
      const r = col[0] * k, g = col[1] * k, b = col[2] * k;
      a[o++] = ax; a[o++] = ay; a[o++] = az; a[o++] = nx; a[o++] = ny; a[o++] = nz; a[o++] = r; a[o++] = g; a[o++] = b;
      a[o++] = bx; a[o++] = by; a[o++] = bz; a[o++] = nx; a[o++] = ny; a[o++] = nz; a[o++] = r; a[o++] = g; a[o++] = b;
      a[o++] = cx; a[o++] = cy; a[o++] = cz; a[o++] = nx; a[o++] = ny; a[o++] = nz; a[o++] = r; a[o++] = g; a[o++] = b;
      this.n += 3;
    }
    quad(m, p0, p1, p2, p3, h, col) { this.t(m, ...p0, ...p1, ...p2, ...h, col); this.t(m, ...p0, ...p2, ...p3, ...h, col); }
    /* cubo unitário centrado na origem (-0.5..0.5) */
    box(m, col) {
      const q = 0.5;
      const F = [
        [[1, 0, 0], [[q, -q, -q], [q, q, -q], [q, q, q], [q, -q, q]]],
        [[-1, 0, 0], [[-q, -q, -q], [-q, q, -q], [-q, q, q], [-q, -q, q]]],
        [[0, 1, 0], [[-q, q, -q], [q, q, -q], [q, q, q], [-q, q, q]]],
        [[0, -1, 0], [[-q, -q, -q], [q, -q, -q], [q, -q, q], [-q, -q, q]]],
        [[0, 0, 1], [[-q, -q, q], [q, -q, q], [q, q, q], [-q, q, q]]],
        [[0, 0, -1], [[-q, -q, -q], [q, -q, -q], [q, q, -q], [-q, q, -q]]],
      ];
      for (const f of F) this.quad(m, f[1][0], f[1][1], f[1][2], f[1][3], f[0], col);
    }
    /* cilindro/cone/tronco de y=0 a y=1, raios rb (base) e rt (topo) */
    cyl(m, seg, rb, rt, col, capTop, capBot) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * M.TAU, a1 = ((i + 1) / seg) * M.TAU, am = (a0 + a1) / 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        const h = [Math.cos(am), 0.25, Math.sin(am)];
        const b0 = [rb * c0, 0, rb * s0], b1 = [rb * c1, 0, rb * s1], t0 = [rt * c0, 1, rt * s0], t1 = [rt * c1, 1, rt * s1];
        if (rt <= 0.0001) this.t(m, ...b0, ...b1, ...t0, ...h, col);
        else this.quad(m, b0, b1, t1, t0, h, col);
        if (capTop && rt > 0.0001) this.t(m, 0, 1, 0, ...t0, ...t1, 0, 1, 0, col);
        if (capBot) this.t(m, 0, 0, 0, ...b0, ...b1, 0, -1, 0, col);
      }
    }
    cone(m, seg, r, col, capBot) { this.cyl(m, seg, r, 0, col, false, capBot); }
    /* esfera de raio 1 */
    sphere(m, seg, rings, col) {
      for (let j = 0; j < rings; j++) {
        const p0 = -Math.PI / 2 + (j / rings) * Math.PI, p1 = -Math.PI / 2 + ((j + 1) / rings) * Math.PI;
        const y0 = Math.sin(p0), y1 = Math.sin(p1), r0 = Math.cos(p0), r1 = Math.cos(p1);
        for (let i = 0; i < seg; i++) {
          const a0 = (i / seg) * M.TAU, a1 = ((i + 1) / seg) * M.TAU, am = (a0 + a1) / 2, pm = (p0 + p1) / 2;
          const h = [Math.cos(am) * Math.cos(pm), Math.sin(pm), Math.sin(am) * Math.cos(pm)];
          const A = [r0 * Math.cos(a0), y0, r0 * Math.sin(a0)], B = [r0 * Math.cos(a1), y0, r0 * Math.sin(a1)];
          const C = [r1 * Math.cos(a1), y1, r1 * Math.sin(a1)], D = [r1 * Math.cos(a0), y1, r1 * Math.sin(a0)];
          if (j === 0) this.t(m, ...A, ...C, ...D, ...h, col);
          else if (j === rings - 1) this.t(m, ...A, ...B, ...C, ...h, col);
          else this.quad(m, A, B, C, D, h, col);
        }
      }
    }
    /* telhado em prisma: cumeeira ao longo de z, base y=0, topo y=1, x/z -0.5..0.5 */
    prism(m, col) {
      const q = 0.5;
      this.quad(m, [-q, 0, -q], [-q, 0, q], [0, 1, q], [0, 1, -q], [-1, 1, 0], col);
      this.quad(m, [q, 0, -q], [q, 0, q], [0, 1, q], [0, 1, -q], [1, 1, 0], col);
      this.t(m, -q, 0, q, q, 0, q, 0, 1, q, 0, 0, 1, col);
      this.t(m, -q, 0, -q, q, 0, -q, 0, 1, -q, 0, 0, -1, col);
    }
    pyramid(m, col) {
      const q = 0.5, ap = [0, 1, 0];
      const c = [[-q, 0, -q], [q, 0, -q], [q, 0, q], [-q, 0, q]];
      for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; this.t(m, ...a, ...b, ...ap, (a[0] + b[0]) / 2, 0.3, (a[2] + b[2]) / 2, col); }
      this.t(m, ...c[0], ...c[1], ...c[2], 0, -1, 0, col); this.t(m, ...c[0], ...c[2], ...c[3], 0, -1, 0, col);
    }
    disc(m, seg, col) { for (let i = 0; i < seg; i++) { const a0 = (i / seg) * M.TAU, a1 = ((i + 1) / seg) * M.TAU; this.t(m, 0, 0, 0, Math.cos(a0), 0, Math.sin(a0), Math.cos(a1), 0, Math.sin(a1), 0, 1, 0, col); } }
    /* anexa outra malha MB */
    append(o) { while ((this.n + o.n) * 9 > this.a.length) { const b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; } this.a.set(o.a.subarray(0, o.n * 9), this.n * 9); this.n += o.n; }
    build() { return gfx.mesh(this.a.slice(0, this.n * 9), this.n); }
    get empty() { return this.n === 0; }
  }
  gfx.MB = MB;

  /* ---------- quadro ---------- */
  const eye = [0, 0, 0];
  gfx.begin = function (eyePos, target, fovDeg) {
    const env = gfx.env;
    gfx.fov = (fovDeg || 62) * Math.PI / 180;
    eye[0] = eyePos[0]; eye[1] = eyePos[1]; eye[2] = eyePos[2];
    gfx.eye = eyePos;
    M.persp(proj, gfx.fov, gfx.w / gfx.h, 0.3, env.fogFar + 120);
    M.lookAt(view, eyePos, target, [0, 1, 0]);
    M.mul(vp, proj, view);
    // base da câmera
    gfx.right = [view[0], view[4], view[8]]; gfx.up = [view[1], view[5], view[9]]; gfx.fwd = [-view[2], -view[6], -view[10]];
    // planos do frustum
    const m = vp;
    const rows = [[m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]], [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],
      [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]], [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],
      [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]], [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]]];
    for (let i = 0; i < 6; i++) { const r = rows[i]; const l = Math.hypot(r[0], r[1], r[2]) || 1; planes[i * 4] = r[0] / l; planes[i * 4 + 1] = r[1] / l; planes[i * 4 + 2] = r[2] / l; planes[i * 4 + 3] = r[3] / l; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gfx.w, gfx.h);
    gl.clearColor(env.fogCol[0], env.fogCol[1], env.fogCol[2], 1);
    gl.depthMask(true); gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gfx.stats.draws = 0; gfx.stats.tris = 0;
    // céu
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    const s = P.sky; gl.useProgram(s.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(0); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const th = Math.tan(gfx.fov / 2);
    gl.uniform3fv(s.u.uRight, gfx.right); gl.uniform3fv(s.u.uUp, gfx.up); gl.uniform3fv(s.u.uFwd, gfx.fwd);
    gl.uniform2f(s.u.uTan, th * (gfx.w / gfx.h), th);
    gl.uniform3fv(s.u.uTop, env.top); gl.uniform3fv(s.u.uHor, env.hor); gl.uniform3fv(s.u.uBot, env.bot);
    gl.uniform3fv(s.u.uSunDir, env.sunDir); gl.uniform3fv(s.u.uSunCol, env.sunCol);
    gl.uniform1f(s.u.uStars, env.stars); gl.uniform1f(s.u.uTime, env.time); gl.uniform3fv(s.u.uCloud, env.cloud); gl.uniform1f(s.u.uPaper, gfx.q.draw);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    // programa principal
    const p = P.main; gl.useProgram(p.p);
    gl.uniformMatrix4fv(p.u.uVP, false, vp);
    gl.uniform3fv(p.u.uCam, eye); gl.uniform2f(p.u.uFog, env.fogNear, env.fogFar);
    gl.uniform3fv(p.u.uSunDir, env.sunDir); gl.uniform3f(p.u.uSunCol, env.sunCol[0] * gfx.lightK, env.sunCol[1] * gfx.lightK, env.sunCol[2] * gfx.lightK); gl.uniform3fv(p.u.uAmb, env.amb); gl.uniform3fv(p.u.uFogCol, env.fogCol);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shTex || null); gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(p.u.uShMap, 1); gl.uniform1f(p.u.uShOn, gfx.shadowOn ? 1 : 0); gl.uniform1f(p.u.uShTex, 1 / (shSize || 1)); gl.uniformMatrix4fv(p.u.uLVP, false, shLVP);
    gl.uniform3f(p.u.uTint, 1, 1, 1); gl.uniform3f(p.u.uAdd, 0, 0, 0); gl.uniform1f(p.u.uEmis, 0); gl.uniform1f(p.u.uOutline, 0);
    const q = gfx.q, sz = gfx.seis;
    gl.uniform1f(p.u.uQ, gfx.shaderLv || 0); gl.uniform1f(p.u.uStyle, q.draw); gl.uniform1f(p.u.uDetail, q.detail); gl.uniform1f(p.u.uTime, env.time);
    gl.uniform1f(p.u.uWet, env.weather && env.weather.type === 'rain' ? 1 : 0);
    gl.uniform1f(p.u.uSeis, sz && sz.on ? 1 : 0);
    if (sz && sz.on) { gl.uniform4fv(p.u.uWp, sz.wp); gl.uniform4fv(p.u.uWt, sz.wt); gl.uniform1f(p.u.uNW, sz.nw); gl.uniform1f(p.u.uNow, sz.now); gl.uniform1f(p.u.uSInt, sz.int); gl.uniform1f(p.u.uSGlow, sz.glow); gl.uniform1f(p.u.uSNoise, sz.noise); }
    gfx._prog = 'main';
    gl.disableVertexAttribArray(2);
  };

  function useMain() {
    if (gfx._prog !== 'main') {
      gl.useProgram(P.main.p); gfx._prog = 'main'; gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(true);
    }
  }
  gfx.sphereVisible = function (x, y, z, r) {
    for (let i = 0; i < 6; i++) { if (planes[i * 4] * x + planes[i * 4 + 1] * y + planes[i * 4 + 2] * z + planes[i * 4 + 3] < -r) return false; }
    return true;
  };

  const NO = {};
  let curTint = null;
  /* desenha malha 'main'. opt: tint[3], add[3], emis, outline (espessura) */
  gfx.draw = function (mesh, model, opt) {
    if (!mesh || !mesh.buf || !mesh.n) return;
    if (gfx.shadowPass) {
      if (gfx._prog !== 'shadow') { gl.useProgram(P.shadow.p); gfx._prog = 'shadow'; gl.uniformMatrix4fv(P.shadow.u.uLVP, false, shLVP); gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); }
      gl.uniformMatrix4fv(P.shadow.u.uModel, false, model || IDENT);
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf); gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
      return;
    }
    useMain();
    opt = opt || NO;
    const u = P.main.u;
    gl.uniformMatrix4fv(u.uModel, false, model || IDENT);
    const t = opt.tint, a = opt.add;
    if (t || curTint) { gl.uniform3f(u.uTint, t ? t[0] : 1, t ? t[1] : 1, t ? t[2] : 1); curTint = t || null; }
    gl.uniform3f(u.uAdd, a ? a[0] : 0, a ? a[1] : 0, a ? a[2] : 0);
    gl.uniform1f(u.uEmis, opt.emis || 0); gl.uniform1f(u.uSway, gfx.sway || 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 12);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, STRIDE, 24);
    const ol = (opt.outline || 0) * gfx.q.outlineK;
    if (ol > 0 && !(gfx.seis && gfx.seis.on)) {
      gl.enable(gl.CULL_FACE); gl.uniform1f(u.uOutline, ol); gl.cullFace(gl.FRONT);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
      gl.disable(gl.CULL_FACE); gl.uniform1f(u.uOutline, 0);
      gfx.stats.draws++; gfx.stats.tris += mesh.n / 3;
    }
    gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
    gfx.stats.draws++; gfx.stats.tris += mesh.n / 3;
  };

  /* líquidos (água/lava) — desenhar depois do sólido */
  gfx.KIND = {
    water: { deep: [0.05, 0.22, 0.42], shallow: [0.25, 0.62, 0.75], alpha: 0.82, glow: 0, wave: 1 },
    ice: { deep: [0.45, 0.7, 0.85], shallow: [0.8, 0.92, 0.98], alpha: 0.9, glow: 0, wave: 0.25 },
    lava: { deep: [0.75, 0.12, 0.02], shallow: [1.0, 0.45, 0.05], alpha: 1, glow: 0.35, wave: 0.2 },
  };
  let liqOn = false;
  gfx.beginLiquid = function () {
    const env = gfx.env, s = P.liq;
    gl.useProgram(s.p); gfx._prog = 'liq';
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
    gl.uniformMatrix4fv(s.u.uVP, false, vp); gl.uniform3fv(s.u.uCam, eye); gl.uniform2f(s.u.uFog, env.fogNear, env.fogFar);
    gl.uniform1f(s.u.uTime, env.time); gl.uniform3fv(s.u.uFogCol, env.fogCol);
    gl.uniform3fv(s.u.uSunDir, env.sunDir); gl.uniform3fv(s.u.uSunCol, env.sunCol); gl.uniform3fv(s.u.uAmb, env.amb); gl.uniform1f(s.u.uPaper, gfx.q.draw);
    gl.uniform1f(s.u.uQ, gfx.shaderLv || 0); gl.uniform1f(s.u.uShOn, gfx.shadowOn && shReady ? 1 : 0); gl.uniform1f(s.u.uShTex, 1 / (shSize || 1)); gl.uniformMatrix4fv(s.u.uLVP, false, shLVP);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shTex || null); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(s.u.uShMap, 1);
    liqOn = true;
  };
  gfx.setLiquid = function (kind) {
    const k = gfx.KIND[kind], s = P.liq;
    gl.uniform3fv(s.u.uDeep, k.deep); gl.uniform3fv(s.u.uShallow, k.shallow); gl.uniform1f(s.u.uAlpha, k.alpha); gl.uniform1f(s.u.uGlow, k.glow); gl.uniform1f(s.u.uWave, k.wave);
  };
  gfx.drawLiquid = function (mesh) {
    if (!mesh || !mesh.buf) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.disableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
    gfx.stats.draws++; gfx.stats.tris += mesh.n / 3;
  };
  gfx.endLiquid = function () { gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE); liqOn = false; };

  /* partículas: arr com 8 floats por partícula (x,y,z,r,g,b,a,size) */
  gfx.points = function (arr, count, additive) {
    if (!count) return;
    if (count > PART_CAP) count = PART_CAP;
    const s = P.part; gl.useProgram(s.p); gfx._prog = 'part';
    gl.enable(gl.BLEND); gl.depthMask(false); gl.disable(gl.CULL_FACE);
    if (additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniformMatrix4fv(s.u.uVP, false, vp);
    gl.uniform1f(s.u.uScale, (gfx.h * 0.5) / Math.tan(gfx.fov / 2)); gl.uniform1f(s.u.uPaper, gfx.q.draw);
    gl.bindBuffer(gl.ARRAY_BUFFER, partBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr.subarray(0, count * 8));
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1); gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 12);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 32, 28);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.depthMask(true); gl.disable(gl.BLEND); gl.enable(gl.CULL_FACE);
    gfx.stats.draws++;
  };
  /* projeta ponto do mundo para pixels CSS (retorna null se atrás da câmera) */
  gfx.project = function (x, y, z) {
    const m = vp, cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.1) return null;
    const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / cw, ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / cw;
    return [(nx * 0.5 + 0.5) * (cv.clientWidth || gfx.w), (1 - (ny * 0.5 + 0.5)) * (cv.clientHeight || gfx.h), cw];
  };
  gfx.PART_CAP = PART_CAP;
  gfx.lost = false;
})();
