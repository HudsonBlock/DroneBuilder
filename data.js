// Edit this file to add parts/options.
// Tip: keep names consistent: Size, Style, Video, Part, Tier.

window.PARTS_DB = [
  // 7" Cinematic
  { size:'7"', style:'Cinematic', video:'DJI', part:'Frame', tier:'Ideal',
    options:[ { name:'Chimera7', price:120, link:'' } ] },

  // --- Prebuilt examples (placeholders) ---
  { size:'Cinewhoop (prebuilt)', style:'Cinematic', video:'DJI', part:'Prebuilt', tier:'Ideal',
    options:[ { name:'DJI Cinewhoop prebuilt option', price:450, link:'' } ] },
  { size:'Tinywhoop (prebuilt)', style:'Freestyle', video:'Analog', part:'Prebuilt', tier:'Budget',
    options:[ { name:'Tinywhoop analog prebuilt', price:120, link:'' } ] },

  // 5" Drone
  { sizes:['5"'], styles: 'Any', videos:'Any', part:'Frame',
    options:[
      { name:'Choose a Part:', price:0, weight:null, link:'' },
      { name:'Quadmula Siren F5 Split', price:75, weight:106, link:'https://quadmula.com/products/quadmula-siren-f5-split-freestyle-frame' },
      { name:'', price:120, weight:0, link:'' },
      { name:'', price:120, weight:0, link:'' },
      { name:'', price:120, weight:0, link:'' },
    ]},
  // 5" Drone Motors
  { sizes:['5"'], styles: 'Any', videos:'Any', part:'Motors',
    options:[
      { name:'Choose a Part:', price:0, weight:null, link:'' },
      { name:'MEPS SZ2207 V2', price:80, weight:140, link:'https://www.mepsking.shop/drone-parts/motors/sz2207-fpv-brushless-motor-for-5inch-racing-drone.html?spec=1950KV%20*%204pcs-Cyan' },
      { name:'MEPS SZ2306 V2', price:80, weight:140, link:'https://www.mepsking.shop/sz2306-fpv-brushless-motor-for-5inch-freestyle-drone.html?spec=1950KV%20*%204pcs-Cyan&gad_source=1&gad_campaignid=23389650678&gbraid=0AAAAApOVdOhoJZJTVBqVv_CcB2bCCXQy2&gclid=CjwKCAiAmKnKBhBrEiwAaqAnZ48dyhXL0b6GoSnDpGFnFwTS8qga06GxBAjcdGpoq6rSV8CHOSItZRoCnp4QAvD_BwE' },
      { name:'', price:120, weight:0, link:'' },
      { name:'', price:120, weight:0, link:'' },
      { name:'', price:120, weight:0, link:'' },
    ]},
  // 5" Drone Stack
  { sizes:['5"'], styles: 'Any', videos:'Any', part:'FC & ESC Stack',
    options:[
      { name:'Choose a Part:', price:0, weight:null, link:'' },
      { name:'SZ60A 6S 4IN1 ESC & F7 Stack', price:80, weight:7.5, link:'https://www.mepsking.shop/sz60a-esc-f7-fc-stack.html?gad_source=1&gad_campaignid=23391097109&gbraid=0AAAAApOVdOg32QqXbZw9QAbFfsi-Ci3Qe&gclid=CjwKCAiAmKnKBhBrEiwAaqAnZxC0Ujuo-n3U7eM0wjLfMk3gUVkJqpIbjGU-7ko-RfFB8IQo0-LZ5xoC9aMQAvD_BwE' },
      { name:'', price:80, weight:0, link:'' },
    ]},
  // 5" ELRS
  { sizes:'Any', styles: 'Any', videos:'Any', part:'Reciever',
    options:[
      { name:'Choose a Part:', price:0, weight:null, link:'' },
      { name:'RadioMaster RP1 2.4GHz ELRS Reciever', price:29, weight:10, link:'https://www.mepsking.shop/radiomaster-rp1-v2-24ghz-elrs-nano-receiver.html?gad_source=1&gad_campaignid=23391097109&gbraid=0AAAAApOVdOg32QqXbZw9QAbFfsi-Ci3Qe&gclid=CjwKCAiAmKnKBhBrEiwAaqAnZ4xG87Nnuk28BsAgv7qzpxgHTprIKY0dp7pBX0EHcBSn1Z51Wgb4zRoC5XUQAvD_BwE' },
      { name:'', price:0, weight:0, link:'' },
    ]},
  // 5" Analog VTX
  { sizes:['5"'], styles: 'Any', videos:['Analog'], part:'Video Transmitter (Analog)',
    options:[
      { name:'Choose a Part:', price:0, weight:null, link:'' },
      { name:'Rush Tank II Ultimate 800mW VTX', price:50, weight:6.9, link:'https://www.getfpv.com/rushfpv-rush-tank-ii-5-8ghz-vtx-w-smart-audio.html?srsltid=AfmBOorcMOL9xiAkQlrb8jqUUWDwBZqKzt9gX79XpzUB7r7cy-2eLyDx' },
      { name:'', price:0, weight:0, link:'0' },
    ]},
  // Analog Cameras
  { sizes:['5"','3"'], styles: 'Any', videos:['Analog'], part:'Analog Camera',
      options:[
        { name:'Choose a Part:', price:0, weight:null, link:'' },
        { name:'Runcam Phoenix 2', price:30, weight:9, link:'https://shop.runcam.com/runcam-phoenix-2/?utm_source=chatgpt.com' },
        { name:'', price:0, weight:0, link:'0' },
      ]},
  //Battery
  { sizes:['5"','7"','3"'], styles: 'Any', videos:'Any', part:'Battery',
      options:[
        { name:'Choose a Part:', price:0, weight:null, link:'' },
        { name:'6S 1550mAh 100C Ovonic 4Pk', price:73, weight:274, link:'https://us.ovonicshop.com/products/4packs-ovonic-22-2v-1550mah-6s-100c-lipo-battery-pack-with-xt60-plug' },
        { name:'6S 1300mAh 100C Ovonic 4Pk', price:55, weight:223, link:'https://us.ovonicshop.com/products/ovonic-100c-1300mah-6s1p-22-2v-xt60-4pcs-lipo-battery' },
        { name:'6S 1600mAh 120C Ovonic 4Pk', price:77, weight:270, link:'https://us.ovonicshop.com/products/ovonic-120c-22-2v-6s-1600mah-lipo-battery-xt60-plug?variant=50635818828056' },
        { name:'Choose a Part:', price:0, weight:null, link:'' },
        { name:'Choose a Part:', price:0, weight:null, link:'' },
        { name:'Choose a Part:', price:0, weight:null, link:'' },
      ]},
];

