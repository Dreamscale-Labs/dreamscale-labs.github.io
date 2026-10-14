// Reversible 3D rendering experiment: shaded meshes projected onto the dot mask.
// The existing motion model remains the source of all joint and object positions.
(() => {
  const robot = window.DreamscaleRobot;
  const add = (a,b) => a.map((v,i)=>v+b[i]);
  const sub = (a,b) => a.map((v,i)=>v-b[i]);
  const mul = (a,s) => a.map(v=>v*s);
  const dot = (a,b) => a.reduce((n,v,i)=>n+v*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => mul(a,1/(Math.hypot(...a)||1));
  const light = unit([-0.5,-0.8,1]);
  const yaw = -.5, pitch = .22;
  function camera(v) {
    const x=v[0]-330,y=v[1]-270,z=v[2];
    const xx=x*Math.cos(yaw)+z*Math.sin(yaw);
    const zz=-x*Math.sin(yaw)+z*Math.cos(yaw);
    return [xx,y*Math.cos(pitch)-zz*Math.sin(pitch),y*Math.sin(pitch)+zz*Math.cos(pitch)];
  }
  function project(v) {
    const p=camera(v), perspective=1000/(1000-p[2]);
    return [330+p[0]*perspective,265+p[1]*perspective,p[2]];
  }
  function draw(c,seconds) {
    const p=robot.pose(seconds), faces=[];
    const point=(v,z=0)=>[v.x,v.y,z];
    function face(vertices,base=1) {
      const normal=unit(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0])));
      // Soft ambient light keeps the full silhouette readable through the dot grid.
      const lit=.48+.52*Math.max(0,dot(normal,light));
      const color=Math.round(255*Math.max(.13,base*lit));
      const projected=vertices.map(project);
      faces.push({vertices:projected,z:projected.reduce((s,v)=>s+v[2],0)/projected.length,color});
    }
    function tube(a,b,radii,base=1) {
      const axis=unit(sub(b,a));
      const u=unit(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[0,1,0]));
      const v=cross(axis,u), rings=[], sides=20;
      radii.forEach((r,i)=>{
        const center=add(a,mul(sub(b,a),i/(radii.length-1)));
        const ring = Array.from({length:sides},(_,j) => {
          const angle=j*2*Math.PI/sides;
          return add(center,add(mul(u,r*Math.cos(angle)),mul(v,r*Math.sin(angle))));
        });
        rings.push(ring);
      });
      for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
        const k=(j+1)%sides;
        face([rings[i][j],rings[i][k],rings[i+1][k],rings[i+1][j]],base);
      }
      face([...rings[0]].reverse(),base);face(rings[rings.length-1],base);
    }
    function sphere(center,radii,base=1) {
      const rows=10,cols=20,points=[];
      for(let i=0;i<=rows;i++){
        const a=-Math.PI/2+i*Math.PI/rows;
        points.push(Array.from({length:cols},(_,j)=>{
          const b=j*2*Math.PI/cols;
          return add(center,[radii[0]*Math.cos(a)*Math.cos(b),radii[1]*Math.sin(a),radii[2]*Math.cos(a)*Math.sin(b)]);
        }));
      }
      for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
        const k=(j+1)%cols;face([points[i][j],points[i+1][j],points[i+1][k],points[i][k]],base);
      }
    }
    function box(center,size,base=1) {
      const v=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(a=>add(center,a.map((n,i)=>n*size[i]/2)));
      for(const f of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]])face(f.map(i=>v[i]),base);
    }
    const shoulder=point(p.shoulder), elbow=point(p.elbow,8), wrist=point(p.wrist,38);
    box([425,429,0],[122,14,82],.7);
    tube([425,421,0],[425,342,0],[35,31,24,23,27],.96);
    tube([425,390,0],[425,375,0],[26,26],.3);
    tube(shoulder,elbow,[22,27,25,20,19,24,24],1);
    tube(elbow,wrist,[23,26,23,18,18,23,20],1);
    // Joint shells with dark recessed side plates and center fasteners.
    for(const j of [shoulder,elbow]) {
      sphere(j,[31,29,29],1);
      tube(add(j,[0,0,22]),add(j,[0,0,31]),[17,17],.3);
      tube(add(j,[0,0,31]),add(j,[0,0,34]),[11,11],.82);
      tube(add(j,[0,0,34]),add(j,[0,0,36]),[3,3],.25);
    }
    const cuff=add(elbow,mul(sub(wrist,elbow),.73));
    const axis=unit(sub(wrist,elbow));
    tube(add(cuff,mul(axis,-3)),add(cuff,mul(axis,3)),[21,21],.47);
    tube(add(wrist,[0,-32,0]),add(wrist,[0,16,0]),[16,21,22,20,17],1);
    tube(add(wrist,[0,16,0]),add(wrist,[0,27,0]),[17,17],.45);
    box(add(wrist,[0,32,0]),[35,14,27],.85);
    for(const side of [-1,1]) {
      box(add(wrist,[side*p.gap,47,0]),[8,29,18],.82);
      box(add(wrist,[side*(p.gap-3),62,0]),[10,9,16],.35);
    }
    // Cube and landing pads share the gripper's depth plane, so contact stays aligned.
    box([p.cube.x,p.cube.y,38],[22,22,22],1);
    box([190,382,38],[58,5,48],.35);
    box([320,382,38],[58,5,48],.35);
    c.clearRect(0,0,640,480);
    faces.sort((a,b)=>a.z-b.z);
    for(const f of faces) {
      c.fillStyle=`rgb(${f.color} ${f.color} ${f.color})`;
      c.strokeStyle=c.fillStyle;c.lineWidth=.65;
      c.beginPath();f.vertices.forEach((v,i)=>i?c.lineTo(v[0],v[1]):c.moveTo(v[0],v[1]));c.closePath();c.fill();c.stroke();
    }
    return p;
  }
  const baseBottom = Math.max(...[-61,61].flatMap(x => [-41,41].map(z => project([425+x,436,z])[1])));
  window.DreamscaleRobot={...robot,draw,baseBottom};
})();
