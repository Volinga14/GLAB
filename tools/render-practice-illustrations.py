"""Reproducible teaching mannequins; Blender 4.3+, no external models or textures.
Run: blender -b --python tools/render-practice-illustrations.py -- OUTPUT_DIR
Illustrative exercise positions, not a reference swing or measured biomechanics.
"""
import bpy, math, sys, os
from mathutils import Vector
OUT=sys.argv[sys.argv.index('--')+1];os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.render.resolution_x=840;scene.render.resolution_y=680;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.world.color=(.86,.89,.83)
sh=scene.display.shading;sh.light='STUDIO';sh.studio_light='paint.sl';sh.color_type='MATERIAL';sh.show_shadows=True;sh.show_cavity=True;sh.cavity_type='BOTH';sh.show_object_outline=False;sh.background_type='WORLD'
scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.86,.89,.83,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
for pos,power,size in [((2,-4,6),650,5),((-3,-1,4),350,4)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
GREEN=mat('Polo verde',(.12,.32,.24));PANTS=mat('Pantalón azul',(.19,.26,.33));SKIN=mat('Piel',(.68,.44,.29));WHITE=mat('Zapatos y guante',(.95,.96,.9));GOLD=mat('Punto de atención',(.88,.57,.13));GROUND=mat('Superficie',(.84,.89,.78));DARK=mat('Palo',(.18,.22,.23));SILVER=mat('Varilla',(.56,.62,.63));LINE=mat('Referencia verde',(.20,.45,.31))
objects=[]
def own(obj,m):
 obj.data.materials.append(m);objects.append(obj)
 if obj.type=='MESH':
  for f in obj.data.polygons:f.use_smooth=True
 return obj
def ell(name,pos,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=pos);o=own(bpy.context.object,m);o.name=name;o.scale=scale;return o
def bone(name,a,b,r,m):
 a,b=Vector(a),Vector(b);mid=(a+b)/2
 bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=r,depth=(b-a).length,location=mid);o=own(bpy.context.object,m);o.name=name;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
 ell(name+' unión',a,(r,r,r),m);ell(name+' extremo',b,(r,r,r),m);return o
def arrow(a,b,m=GOLD):
 a,b=Vector(a),Vector(b);v=(b-a).normalized();bone('Dirección del movimiento',a,b-v*.10,.017,m)
 bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=.055,radius2=0,depth=.14,location=b-v*.04);o=own(bpy.context.object,m);o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
def clear():
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
 objects.clear()
def base():
 bpy.ops.mesh.primitive_cylinder_add(vertices=80,radius=1.65,depth=.04,location=(0,0,-.035));own(bpy.context.object,GROUND)
 # Target direction stays separate from the club's sweep.
 arrow((-.95,-1.35,.015),(.85,-1.35,.015),LINE)

def golfer(pose,drill,stage):
 narrow=drill=='SL06';width=.13 if narrow else .29
 feet=[(width,0,.08),(-width,0,.08)];knees=[(width*.92,-.07,.50),(-width*.92,-.07,.50)]
 shift=.07 if pose=='finish' else 0
 hips=[(.14+shift,.04,.92),(-.14+shift,.04,.92)]
 for i in range(2):
  foot=ell('Zapato',feet[i],(.10,.19,.075),WHITE)
  bone('Pierna',feet[i],knees[i],.066,PANTS);bone('Muslo',knees[i],hips[i],.085,PANTS)
 ell('Cadera',(shift,.035,.95),(.22,.14,.16),PANTS)
 # Torso lean is modest and deliberately not a biomechanical target.
 rot={'address':0,'back':-.38,'pause':-.52,'through':.40,'finish':.73}[pose]
 torso=ell('Polo',(shift,-.06,1.25),(.235,.145,.31),GREEN);torso.rotation_euler=(.15,0,rot)
 ell('Cuello',(shift,-.12,1.55),(.065,.065,.09),SKIN)
 ell('Cabeza',(shift,-.16,1.69),(.10,.095,.135),SKIN)
 # Cap and brim make gaze / front easier to read without suggesting an exact neck angle.
 ell('Gorra',(shift,-.145,1.78),(.108,.10,.055),WHITE);ell('Visera',(shift,-.24,1.77),(.11,.105,.018),WHITE)
 nose=ell('Rostro',(shift,-.253,1.69),(.025,.035,.025),SKIN)
 def shoulder(x):return Vector((shift+x*math.cos(rot),-.08+x*math.sin(rot),1.44))
 if drill=='SL02':
  hand={'address':(0,-.55,1.13),'back':(-.44,-.42,1.22),'through':(0,-.55,1.13)}.get(pose,(0,-.55,1.13));head=None
 else:
  hand,head={'address':((0,-.56,1.03),(0,-.98,.09)), 'back':((-.50,-.34,1.20),(-1.03,-.16,1.76)), 'pause':((-.44,-.23,1.40),(-.85,.03,2.05)), 'through':((.50,-.38,1.19),(1.07,-.16,1.72)), 'finish':((.43,-.12,1.56),(-.43,.05,1.94))}[pose]
 h=Vector(hand)
 for sign in [-1,1]:
  s=shoulder(sign*.23);end=h+Vector((sign*.025,0,sign*.014));elbow=s.lerp(end,.52)+Vector((sign*.065,-.065,-.035))
  arm=GOLD if drill=='SL02' else GREEN
  bone('Manga',s,s.lerp(elbow,.5),.072,arm);bone('Brazo',s.lerp(elbow,.5),elbow,.055,SKIN);bone('Antebrazo',elbow,end,.045,SKIN)
  ell('Mano',end,(.042,.045,.055),WHITE if sign==1 else SKIN)
 if head:
  shaft=Vector(head);direction=(shaft-h).normalized();bone('Grip',h-direction*.06,h+direction*.16,.022,DARK);bone('Varilla del palo',h+direction*.16,shaft,.010,SILVER)
  club=ell('Cabeza del palo',shaft,(.075,.035,.04),DARK)
 # No ball is shown in practice-without-ball tasks. A small gold ring denotes hands.
 if drill in ['SL02','SL03','SL04','SL05']:
  ell('Guía de manos',h,(.065,.052,.05),GOLD)
 if pose=='address' and drill in ['SL02','SL03','SL05']:
  if drill=='SL02' and stage==2:arrow((-.57,-.63,1.26),(-.13,-.72,1.05))
  else:arrow((-.13,-.72,1.05),(-.57,-.63,1.26))
 if pose=='back' and drill in ['SL03','SL05']:arrow((-.65,-.68,1.02),(.18,-.68,1.02))
 if pose=='through' and drill in ['SL03','SL05']:arrow((.36,-.65,1.36),(.72,-.58,1.53))
 if drill=='SL06':
  for x in [width,-width]:
   bpy.ops.mesh.primitive_torus_add(major_radius=.16,minor_radius=.008,major_segments=32,minor_segments=8,location=(x,0,.015));own(bpy.context.object,GOLD)
 # Pause graphic is a clear task marker, not a frozen anatomical instruction.
 if pose=='pause':
  for x in [.72,.82]:bone('Pausa', (x,-.05,1.62),(x,-.05,1.94),.023,GOLD)

def camera(pos,target,scale):
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
for d in ['SL01','SL02','SL03','SL04','SL05','SL06']:
 poses={'SL01':['address']*3,'SL02':['address','back','address'],'SL03':['back','address','through'],'SL04':['back','pause','through'],'SL05':['address','back','through'],'SL06':['address','through','finish']}[d]
 for stage,pose in enumerate(poses):
  clear();base()
  if d=='SL01':
   # Explicit overhead alignment board; no body occluding the two references.
   for x in [-.28,.28]:ell('Zapato visto desde arriba',(x,.16,.08),(.11,.21,.08),WHITE)
   ell('Bola',(0,-.76,.055),(.052,.052,.052),WHITE)
   bone('Línea de objetivo',(-1.2,-.94,.045),(1.2,-.94,.045),.021,GOLD if stage==0 else LINE)
   bone('Referencia de pies',(-1.2,-.10,.045),(1.2,-.10,.045),.021,GOLD if stage==1 else LINE)
   arrow((.65,-.60,.05),(.65,-.23,.05),GOLD)
   if stage==2:
    for x in [-.28,.28]:
     bpy.ops.mesh.primitive_torus_add(major_radius=.25,minor_radius=.012,major_segments=32,minor_segments=8,location=(x,.16,.02));own(bpy.context.object,GOLD)
   camera((0,-.50,5),(0,-.50,0),3.25)
  else:golfer(pose,d,stage);camera((2.55,-6.2,2.7),(0,-.05,.94),3.05)
  scene.render.filepath=os.path.join(OUT,d+'-'+str(stage)+'.png');bpy.ops.render.render(write_still=True)
