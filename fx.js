/* Acefold premium 3D effects: hero particles + card tilt */
(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 3D TILT ON CARDS ---------- */
  var isTouch = window.matchMedia('(hover: none)').matches;
  if(!isTouch && !reduceMotion){
    document.querySelectorAll('.tilt').forEach(function(el){
      var rect = null;
      el.addEventListener('pointerenter', function(){ rect = el.getBoundingClientRect(); el.classList.add('tilting'); });
      el.addEventListener('pointermove', function(e){
        if(!rect) rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (py * -7) + 'deg) rotateY(' + (px * 9) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function(){
        rect = null; el.classList.remove('tilting');
        el.style.transform = '';
      });
    });
  }

  /* ---------- HERO PARTICLES (index only) ---------- */
  var canvas = document.getElementById('hero3d');
  if(!canvas || typeof THREE === 'undefined') return;

  var COUNT = (innerWidth < 700) ? 3200 : 6000;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = (innerWidth < 700) ? 19 : 15;
  var renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true, antialias: false});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

  function sizeToHero(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* sample points from text drawn on an offscreen canvas */
  function sampleText(text, font, cw, ch, step, scale){
    var oc = document.createElement('canvas'); oc.width = cw; oc.height = ch;
    var g = oc.getContext('2d');
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.fillText(text, cw/2, ch/2);
    var data = g.getImageData(0,0,cw,ch).data, pts = [];
    for(var y=0; y<ch; y+=step){
      for(var x=0; x<cw; x+=step){
        if(data[(y*cw+x)*4+3] > 128){
          pts.push([ (x-cw/2)/cw*20*scale, (ch/2-y)/ch*20*scale*(ch/cw)*2.2, 0 ]);
        }
      }
    }
    return pts;
  }

  /* bar chart with growth arrow, built manually */
  function barChart(){
    var pts = [], heights = [2.2, 3.2, 4.4, 5.6, 7.0];
    for(var b=0; b<5; b++){
      var bx = -6 + b*2.6;
      for(var i=0; i<260; i++){
        pts.push([ bx + (Math.random()-0.5)*1.5, -4 + Math.random()*heights[b], (Math.random()-0.5)*0.6 ]);
      }
    }
    /* arrow shaft */
    for(var i=0;i<220;i++){
      var t = i/220;
      pts.push([ -6.5 + t*13, -2.6 + t*6.2 + (Math.random()-0.5)*0.25, (Math.random()-0.5)*0.4 ]);
    }
    /* arrow head */
    for(var i=0;i<140;i++){
      var t = Math.random();
      pts.push([ 6.5 - t*1.6 + (Math.random()-0.5)*0.2, 3.6 + t*(Math.random()<0.5?1:-1)*1.2*Math.random(), (Math.random()-0.5)*0.4 ]);
    }
    return pts;
  }

  var SHAPES = [
    sampleText('\u2660', '900 340px Georgia', 512, 512, 5, 0.62),
    barChart(),
    sampleText('ACEFOLD', '800 150px Arial', 1400, 400, 4, 0.95)
  ];

  var geo = new THREE.BufferGeometry();
  var positions = new Float32Array(COUNT*3);
  var targets = new Float32Array(COUNT*3);
  var speeds = new Float32Array(COUNT);
  for(var i=0;i<COUNT;i++){
    positions[i*3]   = (Math.random()-0.5)*30;
    positions[i*3+1] = (Math.random()-0.5)*18;
    positions[i*3+2] = (Math.random()-0.5)*8;
    speeds[i] = 0.02 + Math.random()*0.045;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  var mat = new THREE.PointsMaterial({
    color: 0xC9A961, size: 0.075, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  var points = new THREE.Points(geo, mat);
  scene.add(points);

  /* ambient gold dust */
  var dustGeo = new THREE.BufferGeometry();
  var dustPos = new Float32Array(500*3);
  for(var i=0;i<500;i++){
    dustPos[i*3]=(Math.random()-0.5)*40; dustPos[i*3+1]=(Math.random()-0.5)*24; dustPos[i*3+2]=(Math.random()-0.5)*14;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos,3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({color:0xC9A961,size:0.05,transparent:true,opacity:0.28,depthWrite:false}));
  scene.add(dust);

  function setShape(idx){
    var pts = SHAPES[idx % SHAPES.length];
    for(var i=0;i<COUNT;i++){
      var p = pts[i % pts.length];
      var j = Math.random()*0.22;
      targets[i*3]   = p[0] + (Math.random()-0.5)*j;
      targets[i*3+1] = p[1] + (Math.random()-0.5)*j;
      targets[i*3+2] = p[2] + (Math.random()-0.5)*1.4;
    }
  }
  var shapeIdx = 0;
  setShape(0);
  if(!reduceMotion){
    setInterval(function(){ shapeIdx = (shapeIdx+1) % SHAPES.length; setShape(shapeIdx); }, 5500);
  }

  /* mouse */
  var mx=0,my=0,mActive=false,mWorld=new THREE.Vector3();
  addEventListener('pointermove', function(e){
    var r = canvas.getBoundingClientRect();
    if(e.clientY < r.top || e.clientY > r.bottom){ mActive=false; return; }
    mx = (e.clientX - r.left)/r.width*2-1;
    my = -((e.clientY - r.top)/r.height*2-1);
    mWorld.set(mx*10, my*6, 0); mActive = true;
  });
  addEventListener('pointerleave', function(){ mActive=false; });

  var visible = true;
  new IntersectionObserver(function(en){ visible = en[0].isIntersecting; }).observe(canvas);

  var t = 0;
  function animate(){
    requestAnimationFrame(animate);
    if(!visible) return;
    t += 0.016;
    var pos = geo.attributes.position.array;
    var repelR2 = 3.6;
    for(var i=0;i<COUNT;i++){
      var ix=i*3;
      var tx=targets[ix], ty=targets[ix+1], tz=targets[ix+2];
      if(!reduceMotion){
        ty += Math.sin(t*1.1 + i*0.37)*0.05;
        tx += Math.cos(t*0.9 + i*0.51)*0.04;
      }
      if(mActive && !reduceMotion){
        var dx=pos[ix]-mWorld.x, dy=pos[ix+1]-mWorld.y;
        var d2=dx*dx+dy*dy;
        if(d2<repelR2){ var f=(1-d2/repelR2)*1.6; tx+=dx*f; ty+=dy*f; }
      }
      var sp = reduceMotion ? 1 : speeds[i];
      pos[ix]   += (tx-pos[ix])*sp;
      pos[ix+1] += (ty-pos[ix+1])*sp;
      pos[ix+2] += (tz-pos[ix+2])*sp;
    }
    geo.attributes.position.needsUpdate = true;
    if(!reduceMotion){
      points.rotation.y = Math.sin(t*0.2)*0.05 + mx*0.08;
      points.rotation.x = my*-0.04;
      dust.rotation.y = t*0.015;
    }
    renderer.render(scene, camera);
  }
  sizeToHero();
  animate();
  addEventListener('resize', sizeToHero);
})();
