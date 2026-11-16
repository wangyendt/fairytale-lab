/* Visual-only, non-spinning approximate light bending. Not a Kerr/GR solver.
   Rays intersect a thin emissive disk. The particle physics is separate. */
export const holeVertex=`
varying vec3 vWorld;
void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}
`;
export const holeFragment=`
precision highp float;
varying vec3 vWorld;
uniform vec3 uCamera;
uniform float uTime;
uniform float uLens;
uniform float uDisk;
uniform float uSteps;
uniform float uBlend;
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 sky(vec3 d){vec3 p=d*430.0;float h=hash(floor(p));vec3 f=fract(p)-.5;float s=smoothstep(.12,.0,length(f))*step(.997,h);float milky=exp(-pow((d.y+.14*d.x)*6.5,2.0))*.022;return vec3(.005,.008,.017)+vec3(.42,.52,.78)*s+vec3(.35,.38,.6)*milky;}
vec3 diskColor(vec3 p,vec3 ray){float r=length(p.xz);float a=atan(p.z,p.x);float warp=a-uTime*.17/sqrt(max(r,1.));float streak=noise(vec3(r*9.,sin(warp)*11.,cos(warp)*11.));float bands=.72+.18*sin(r*31.+streak*4.)+.1*sin(r*67.+warp*5.);float edge=smoothstep(3.,3.4,r)*(1.-smoothstep(10.,12.,r));float heat=pow(3./max(r,3.),.72);vec3 color=mix(vec3(1.,.32,.055),vec3(1.,.88,.57),heat*heat);vec3 tangent=normalize(vec3(-p.z,0.,p.x));float beam=pow(clamp(1.+dot(tangent,-ray)*.57, .35,1.7),2.3);return color*bands*edge*heat*beam*2.1;}
void main(){
 vec3 p=uCamera,ray=normalize(vWorld-uCamera);float h2=dot(cross(p,ray),cross(p,ray));
 float impact=sqrt(h2);vec3 color=vec3(0.);float transmit=1.;bool captured=false;
 // Skip expensive integration well outside the luminous disk.
 if(impact>15.){gl_FragColor=vec4(sky(ray),uBlend);return;}
 for(int i=0;i<144;i++){
  if(float(i)>=uSteps)break;
  float r=length(p);if(r<1.015){captured=true;break;}
  float stepLength=clamp(r*.075,.045,1.8);
  vec3 prev=p;vec3 acceleration=-1.5*h2*p/max(pow(r,5.),.01)*uLens;
  ray=normalize(ray+acceleration*stepLength);p+=ray*stepLength;
  if(prev.y*p.y<0. && uDisk>.5){float fraction=prev.y/(prev.y-p.y);vec3 hit=mix(prev,p,fraction);float diskRadius=length(hit.xz);if(diskRadius>3. && diskRadius<12.){color+=transmit*diskColor(hit,ray);transmit*=.2;}}
  if(length(p)>55. && dot(p,ray)>0.)break;
 }
 if(!captured)color+=transmit*sky(ray);
 // Soft radiative halo; it is a display bloom approximation, not extra matter.
 float ring=exp(-pow((impact-2.65)*5.5,2.))*uLens*uDisk;
 color+=vec3(1.,.56,.19)*ring*.14;
 color=1.-exp(-color*1.22);
 gl_FragColor=vec4(pow(max(color,vec3(0.)),vec3(.90)),uBlend);
}
`;
