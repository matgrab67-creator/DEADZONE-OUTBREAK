import { ModelBuilder } from './ModelBuilder.js';

function pistol(b) {
  const slide = b.assembly('slide'), mag = b.assembly('magazine');
  b.profile([[-0.158,0.012],[-0.15,-0.018],[-0.072,-0.027],[-0.031,-0.043],[0.007,-0.142],[0.06,-0.135],[0.035,-0.025],[0.058,-0.008],[0.05,0.012]],0.031,'polymer');
  b.profile([[-0.177,0.009],[-0.177,0.035],[-0.168,0.046],[0.043,0.046],[0.055,0.038],[0.055,0.009]],0.033,'slide',slide);
  b.tube(0,0.023,-0.106,0.007,0.157);
  // A recessed ejection port, chamber hood and separate slide serrations.
  b.box(0.0176,0.03,-0.044,0.0016,0.019,0.039,'dark',slide);
  b.box(0.0185,0.029,-0.046,0.001,0.011,0.025,'steel',slide);
  b.box(0,0.0465,-0.044,0.024,0.001,0.032,'dark',slide);
  for (const side of [-1,1]) {
    for(let i=0;i<8;i++)b.box(side*0.0176,0.026,0.043-i*0.0048,0.0015,0.025,0.0018,'dark',slide,0.0004);
    for(let i=0;i<4;i++)b.box(side*0.0176,0.026,-0.155+i*0.005,0.0015,0.025,0.0017,'dark',slide,0.0004);
    b.box(side*0.017,-0.079,0.016,0.003,0.071,0.031,'rubber',b.root,0.001,[0.2,0,0]);
    b.screw(side*0.019,-0.045,0.006,side);
  }
  b.box(-0.021,-0.009,-0.009,0.009,0.007,0.029,'steel');
  b.box(-0.020,-0.036,0.012,0.007,0.009,0.009,'steel');
  b.box(0, -0.031, -0.106,0.027,0.008,0.058,'dark');
  b.rail(-0.115,-0.038,0.046,0.028);
  b.triggerGuard(-0.043,-0.035);
  b.profile([[0.003,-0.055],[0.028,-0.055],[0.049,-0.134],[0.016,-0.141]],0.024,'steel',mag);
  b.box(0,-0.145,0.035,0.036,0.01,0.049,'rubber',mag,0.003,[0.15,0,0]);
  b.ironSights(0.035,-0.159,0.058,slide);
  b.marking('VX–9','DZ  //  9×21',-0.018,0.028,-0.093,0.063,0.016,-1,slide);
  b.hand('rightHand',0.013,-0.073,0.025);
  b.hand('supportHand',-0.027,-0.077,-0.004,true);
  b.muzzle(-0.189,0.023);
  return { sightHeight:0.058, hip:[0.19,-0.175,-0.38], adsZ:-0.36, recoilScale:0.7, reloadStyle:'magazine', inspect:[0.10,-0.085,-0.49] };
}

function grip(b, y=-0.074,z=0.035, mat='polymer') {
  b.profile([[z-0.024,y+0.034],[z+0.012,y+0.034],[z+0.048,y-0.072],[z+0.011,y-0.087],[z-0.003,y-0.056]],0.033,mat);
  for (const side of [-1,1]) {
    b.box(side*.018,y-0.023,z+.024,.002,.064,.026,'rubber',b.root,.002,[-.3,0,0]);
    b.screw(side*.019,y+.021,z+.004,side);
  }
  b.triggerGuard(-.057,-.014);
  b.hand('rightHand',.016,-.085,z+.022);
}
function rifleStock(b,{tan=false,wood=false,folding=false}={}) {
  const mat=wood?'wood':tan?'tan':'polymer';
  b.cylinder(0,.003,.152,.015,.19,'steel');
  if(folding){for(const y of [.023,-.04])b.box(0,y,.205,.016,.013,.18,'steel');}
  else b.profile([[.10,.029],[.20,.036],[.302,.022],[.315,-.083],[.28,-.088],[.212,-.035],[.12,-.032]],.042,mat);
  b.box(0,-.026,.31,.048,.122,.022,'rubber',b.root,.006,[-.08,0,0]);
  if(!wood&&!folding){b.box(0,.034,.211,.048,.018,.107,mat);b.box(0,-.052,.18,.028,.008,.048,'dark');}
  b.cylinder(-.027,-.045,.27,.009,.005,'steel',b.root,'x');
}
function curvedMagazine(b) {
  const mag=b.assembly('magazine');
  const outline=[[-.123,-.028],[-.066,-.028],[-.071,-.087],[-.096,-.16],[-.143,-.221],[-.19,-.2],[-.148,-.136],[-.128,-.08]];
  b.profile(outline,.026,'steel',mag);
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const mesh=b.profile([[-.119+i*.012,-.048],[-.116+i*.012,-.084],[-.14+i*.012,-.145],[-.173+i*.012,-.194],[-.170+i*.012,-.198],[-.137+i*.012,-.146],[-.112+i*.012,-.083],[-.115+i*.012,-.048]],.002,'dark',mag,.0003);
    mesh.position.x=side*.014;
  }
  b.box(0,-.213,-.168,.032,.012,.058,'dark',mag,.002,[.6,0,0]);
}
function raven(b) {
  b.profile([[-.205,.031],[.075,.031],[.094,.014],[.075,-.038],[-.17,-.041],[-.205,-.022]],.043,'steel');
  b.cylinder(0,.031,-.06,.022,.254,'dark');
  for(const side of [-1,1])for(const z of [-.165,-.08,.058])b.screw(side*.023,-.018,z,side);
  b.box(.025,.004,-.021,.003,.024,.106,'bore');
  const bolt=b.assembly('bolt');b.cylinder(.042,.006,.005,.004,.044,'steel',bolt,'x');b.sphere(.066,.006,.005,.007,.007,.009,'dark',bolt);
  b.box(.026,-.015,.018,.003,.008,.064,'steel',b.root,.001,[.14,0,0]);
  b.profile([[-.348,-.008],[-.32,.019],[-.206,.015],[-.19,-.022],[-.205,-.049],[-.325,-.045]],.047,'wood');
  b.cylinder(0,.027,-.277,.015,.13,'wood');
  for(let i=0;i<5;i++)b.box(0,-.026,-.216-i*.023,.049,.034,.003,'dark');
  b.cylinder(0,.012,-.406,.009,.22,'steel');b.cylinder(0,.04,-.384,.007,.165,'dark');
  b.box(0,.033,-.453,.025,.047,.021,'steel');
  b.tube(0,.012,-.532,.014,.054);
  grip(b,-.074,.035,'wood');curvedMagazine(b);rifleStock(b,{wood:true});
  b.ironSights(-.155,-.452,.067,b.root,true);
  b.marking('RAVEN–47','BLACKSITE  //  7.6',-.023,-.007,-.058,.084,.022);
  b.hand('supportHand',-.011,-.045,-.27,true);
  b.muzzle(-.564,.012);
  return {sightHeight:.067,hip:[.205,-.185,-.46],adsZ:-.46,recoilScale:1,reloadStyle:'magazine',inspect:[.09,-.09,-.68]};
}
function straightMagazine(b, narrow=false, tan=false) {
  const mag=b.assembly('magazine');const z=narrow?-.091:-.115;
  b.profile([[z-.024,-.039],[z+.024,-.039],[z+.023,-.098],[z+.012,-.177],[z-.037,-.169],[z-.026,-.094]],narrow?.022:.027,tan?'tan':'steel',mag);
  for(const side of [-1,1])for(let i=0;i<3;i++)b.box(side*(narrow?.012:.0145),-.104,z-.014+i*.014,.002,.084,.004,'dark',mag,.001,[-.08,0,0]);
  b.box(0,-.176,z-.012,narrow?.028:.034,.012,.057,'dark',mag,.002,[-.12,0,0]);
}
function spectre(b) {
  b.profile([[-.214,.031],[.064,.031],[.084,.011],[.073,-.019],[-.172,-.021],[-.214,-.009]],.039,'slide');
  b.profile([[-.174,-.02],[.066,-.019],[.065,-.049],[.017,-.051],[-.029,-.035],[-.068,-.065],[-.13,-.065],[-.174,-.045]],.037,'steel');
  b.box(.022,.007,-.027,.003,.017,.061,'bore');
  const bolt=b.assembly('bolt');b.box(.024,.008,-.019,.004,.011,.042,'edge',bolt);
  b.box(0,.028,.085,.062,.009,.013,'dark');
  const guard=b.assembly('handguard');
  b.box(0,.002,-.32,.049,.067,.214,'polymer',guard,.005);
  for(const side of [-1,1])for(let i=0;i<7;i++){
    b.box(side*.025,-.002,-.232-i*.026,.001,.013,.017,'bore',guard,.001);
    b.box(side*.026,-.02,-.24-i*.024,.002,.004,.012,'steel',guard,.001);
  }
  b.rail(-.171,.04,.472,.036);
  b.cylinder(0,.011,-.441,.009,.12,'steel');
  b.tube(0,.011,-.539,.023,.167,b.root,'dark');
  for(const z of [-.47,-.485,-.59,-.607])b.cylinder(0,.011,z,.024,.004,'steel');
  b.marking('QUIET / 04','SPECTRE SUPPRESSION',-.024,.01,-.535,.09,.019);
  b.box(-.022,-.025,.016,.007,.006,.021,'steel',b.root,.001,[.5,0,0]);
  for(const side of [-1,1])for(const z of [-.155,.05])b.screw(side*.022,-.031,z,side);
  grip(b);straightMagazine(b);rifleStock(b);
  b.ironSights(.04,-.399,.071,b.root,true);
  b.marking('M4–SPECTRE','DZ ARMAMENT  //  5.6',-.021,-.002,-.072,.083,.02);
  b.hand('supportHand',-.014,-.046,-.314,true);
  b.muzzle(-.627,.011);
  return {sightHeight:.071,hip:[.20,-.184,-.46],adsZ:-.45,recoilScale:.7,reloadStyle:'magazine',inspect:[.06,-.07,-.71]};
}
function vortex(b) {
  b.profile([[-.238,.033],[.049,.033],[.079,.011],[.059,-.035],[-.19,-.038],[-.233,-.018]],.042,'tan');
  b.box(0,.034,-.074,.043,.014,.23,'dark');
  b.profile([[-.156,-.036],[-.026,-.033],[.064,-.036],[.073,-.07],[.029,-.068],[-.03,-.06],[-.09,-.067],[-.149,-.059]],.035,'polymer');
  b.box(.023,.008,-.045,.002,.018,.052,'bore');
  const bolt=b.assembly('bolt');b.box(-.029,.022,-.115,.023,.008,.011,'steel',bolt);
  for(const side of [-1,1])for(let i=0;i<4;i++)b.box(side*.022,-.003,-.217+i*.014,.002,.021,.005,'dark');
  b.rail(-.085,.047,.25);
  b.tube(0,.012,-.27,.014,.073);
  b.cylinder(0,.012,-.239,.02,.015,'dark');
  grip(b,-.076,.04);straightMagazine(b,true);rifleStock(b,{folding:true});
  b.box(0,-.072,-.193,.028,.06,.035,'polymer',b.root,.004,[-.15,0,0]);
  b.ironSights(.016,-.195,.077,b.root,true);
  b.marking('VORTEX–9','COMPACT / 9×21',-.023,.012,-.059,.074,.02);
  for(const side of [-1,1])for(const z of [-.151,.052])b.screw(side*.024,-.014,z,side);
  b.hand('supportHand',-.009,-.07,-.19,true);b.muzzle(-.31,.012);
  return {sightHeight:.077,hip:[.195,-.185,-.44],adsZ:-.45,recoilScale:.55,reloadStyle:'magazine',inspect:[.07,-.075,-.62]};
}
function iron(b) {
  b.profile([[-.188,.026],[.07,.026],[.09,.01],[.063,-.041],[-.165,-.046],[-.19,-.023]],.043,'slide');
  b.box(.023,.001,-.042,.002,.022,.091,'bore');
  const bolt=b.assembly('bolt');b.box(.024,.001,-.036,.003,.016,.062,'edge',bolt);
  b.cylinder(0,.014,-.389,.012,.44,'steel');b.cylinder(0,-.02,-.343,.013,.348,'dark');
  b.tube(0,.014,-.606,.016,.035);b.cylinder(0,-.02,-.512,.016,.018,'steel');
  const pump=b.assembly('pump');
  b.box(0,-.024,-.323,.05,.05,.155,'wood',pump,.009);
  for(let i=0;i<11;i++)b.box(0,-.024,-.254-i*.013,.053,.052,.003,'dark',pump,.001);
  for(const side of [-1,1])b.box(side*.018,-.019,-.191,.008,.009,.13,'steel',pump);
  grip(b,-.073,.032,'wood');rifleStock(b,{wood:true});
  b.ironSights(.02,-.594,.045);
  // Shell saddle and visible brass shell bases distinguish the tube-fed shotgun.
  for(let i=0;i<4;i++){
    const z=-.129+i*.033;b.cylinder(-.034,-.002,z,.009,.049,'dark',b.root,'y');b.cylinder(-.034,.023,z,.0095,.008,'brass',b.root,'y');
  }
  b.marking('IRON–12','PUMP / 12 GA',-.023,.007,.003,.052,.019);
  b.hand('supportHand',-.009,-.059,-.32,true,pump);
  const shell=b.assembly('loadingShell');b.cylinder(0,0,0,.009,.055,'red' in b.m?'red':'wood',shell);b.cylinder(0,0,.028,.0095,.007,'brass',shell);shell.visible=false;
  b.muzzle(-.629,.014);
  return {sightHeight:.045,hip:[.21,-.182,-.46],adsZ:-.46,recoilScale:1.5,reloadStyle:'shells',inspect:[.07,-.075,-.72]};
}
function lynx(b) {
  b.profile([[-.203,.02],[.099,.02],[.122,-.016],[.07,-.045],[-.025,-.037],[-.096,-.068],[-.18,-.053],[-.208,-.015]],.048,'tan');
  b.cylinder(0,.028,-.058,.023,.282,'steel');
  b.box(.024,.026,-.009,.003,.023,.082,'bore');
  const bolt=b.assembly('bolt');
  b.cylinder(0,.029,.018,.018,.103,'edge',bolt);b.cylinder(.035,.024,.061,.004,.044,'steel',bolt,'x');b.sphere(.058,.016,.061,.012,.012,.012,'dark',bolt);
  b.box(0,-.012,-.288,.054,.062,.17,'tan',b.root,.005);
  for(const side of [-1,1])for(let i=0;i<5;i++)b.box(side*.028,-.004,-.23-i*.029,.002,.014,.018,'dark');
  b.cylinder(0,.028,-.477,.014,.395,'steel');
  b.tube(0,.028,-.704,.022,.069);
  for(const side of [-1,1])for(let i=0;i<3;i++)b.box(side*.022,.028,-.683-i*.015,.002,.02,.008,'bore');
  b.rail(-.056,.055,.235);
  const scope=b.assembly('scope');
  for(const z of [.003,-.181]){b.box(0,.075,z,.034,.022,.024,'dark',scope);b.cylinder(0,.117,z,.024,.018,'dark',scope);}
  b.cylinder(0,.117,-.08,.019,.226,'dark',scope);
  b.cylinder(0,.117,-.217,.034,.07,'steel',scope,'z',.019);
  b.cylinder(0,.117,.061,.024,.078,'dark',scope);
  b.tube(0,.117,-.258,.035,.021,scope,'dark');
  b.cylinder(0,.117,-.265,.028,.001,'lens',scope);
  b.cylinder(0,.117,.106,.0205,.001,'lens',scope);
  b.cylinder(0,.147,-.073,.014,.024,'dark',scope,'y');b.cylinder(.025,.117,-.073,.013,.023,'dark',scope,'x');
  for(let i=0;i<14;i++){const angle=i*Math.PI/7;b.box(Math.cos(angle)*.014,.148,-.073+Math.sin(angle)*.014,.003,.017,.003,'steel',scope,.0005);}
  const mag=b.assembly('magazine');b.box(0,-.073,-.119,.035,.069,.064,'dark',mag,.004);b.box(0,-.111,-.119,.041,.012,.073,'polymer',mag);
  grip(b,-.074,.048,'tan');rifleStock(b,{tan:true});
  // Folded bipod legs and adjustable cheek rest.
  for(const side of [-1,1]){b.cylinder(side*.039,-.051,-.372,.006,.19,'steel');b.cylinder(side*.039,-.051,-.272,.009,.023,'rubber');}
  b.box(0,.047,.218,.048,.022,.102,'tan');
  b.marking('LYNX–50','PRECISION / MK.II',-.027,-.012,-.026,.095,.023);
  b.hand('supportHand',-.011,-.056,-.282,true);b.muzzle(-.744,.028);
  return {sightHeight:.117,hip:[.21,-.192,-.49],adsZ:-.46,recoilScale:1.6,reloadStyle:'magazine',inspect:[.05,-.07,-.78]};
}

export function createWeaponModel(id, upgraded = false) {
  const builder = new ModelBuilder(id, upgraded);
  const factories = {vx9:pistol, raven, spectre, vortex, iron, lynx};
  if(!factories[id])throw new Error(`Unknown weapon model: ${id}`);
  return builder.finish(factories[id](builder));
}
