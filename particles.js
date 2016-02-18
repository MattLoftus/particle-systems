//Global variables for the system
"use strict";
var particles = [];
var k = 0.01;
var X = 0;
var Y = 1;
var uuid = 0;
var particleSvg;
var animSpeed = 10;
var width = screen.width;
var height = screen.height;
var padding = 0;
var atomicSpeedLimit = 1.0;

//Invoke system loop to begin the simulation
systemLoop();

////////////////////////////////
/////VECTOR OPERATIONS//////////
////////////////////////////////

//Subtract vectors
function subVectors (vec1, vec2) {
  return [vec1[X] - vec2[X], vec1[Y] - vec2[Y]];
}

//Add 2 vectors
function addVectors (vec1, vec2) {
  return [vec1[X] + vec2[X], vec1[Y] + vec2[Y]];
}

//Scalar multiplication of a vector
function multVector (vec1, multiplier) {
  return [vec1[X] * multiplier, vec1[Y] * multiplier];
}

/////////////////////////////////
////PHYSICS HELPER FUNCTIONS/////
/////////////////////////////////

//EM force equation: Coulombs Law.
function calcForce (q1, q2, r) {
  return k * q1 * q2 / (r * r);
}

//Finding the acceleration. Newton's 2nd Law: F = m * a
function calcAcceleration (force, mass) {
  return force / mass;
}

//Find a new velocity based off of current velocity, 
//current acceleration, and a fixed time interval which 
//is equal to the iteration interval speed of our system loop
function calcVelocity (velocity, acceleration) {
  var deltaV = multVector(acceleration, animSpeed);
  return addVectors(velocity, deltaV);
}

//Find a new position for a particle based off of current position 
//and current velocity and the same time interval as above
function calcPosition (position, velocity) {
  var deltaP = multVector(velocity, animSpeed);
  return addVectors(position, deltaP);
}

//Pythagorean theorem
function calcDistance (pos1, pos2) {
  return Math.sqrt(Math.pow(pos1[X]-pos2[X], 2) + Math.pow(pos1[Y]-pos2[Y], 2))
}

function scalarToVector (scalar, theta) {
  var x = scalar * Math.cos(theta);
  var y = scalar * Math.abs(Math.sin(theta));
  return [x, y];
}

function calcTheta (pos1, pos2) {
  var diff = subVectors(pos1, pos2);
  if (diff[X] === 0) {
    return Math.PI/2;
  }
  return Math.atan(diff[Y]/diff[X]);
}

////////////////////////////
///Particle Interactions////
////////////////////////////

function updateAccelerations () {
  for (var i = 0; i < particles.length; i++) {
    var source = particles[i];
    if (source.dynamic === false) {
      continue;
    }
    source.a = [0,0];
    for (var j = 0; j < particles.length; j++) {
      if (i === j) {
        continue;
      }
      var target = particles[j];
      var r = calcDistance(source.pos, target.pos);
      var force = calcForce(source.q, target.q, r);
      var acceleration = calcAcceleration(force, source.m);
      var theta = calcTheta(source.pos, target.pos);
      var a = scalarToVector(acceleration, theta);
      if (target.pos[Y] > source.pos[Y]) 
        a = [a[X], -a[Y]];
      else
        a = [a[X], a[Y]];
      if (target.pos[X] > source.pos[X]) 
        a = [-a[X], a[Y]];
      else
        a = [a[X], a[Y]];
      source.a = addVectors(source.a, a);
    }
  }
}

//Update particle positions and velocity
function updateParticles () {
  updateAccelerations();
  for (var i = 0; i < particles.length; i++) {
    var particle = particles[i];
    particle.v = calcVelocity(particle.v, particle.a);
    
    //boundary conditions (edges of browser window)
    if (particle.pos[X] < 0 + padding) {
      particle.v[X] *= -1;
    }
    if (particle.pos[X] > width - padding) {
      particle.v[X] *= -1;
    }
    if (particle.pos[Y] < 0 + padding) {
      particle.v[Y] *= -1;
    }
    if (particle.pos[Y] > height - padding) {
      particle.v[Y] *= -1;
    }
    var speed = Math.sqrt(Math.pow(particle.v[X], 2) + Math.pow(particle.v[Y], 2))

    var speedToLimitRatio = speed/atomicSpeedLimit;
    if (speedToLimitRatio > 1) {
      particle.v[X] *= (1/speedToLimitRatio)
      particle.v[Y] *= (1/speedToLimitRatio)
    }
    if (Math.abs(particle.v[Y]) > atomicSpeedLimit) {
      if (particle.v[Y] > 0)
        particle.v[Y] = atomicSpeedLimit;
      else
        particle.v[Y] = -atomicSpeedLimit;
    }
    if (Math.abs(particle.v[X]) > atomicSpeedLimit) {
      if (particle.v[X] > 0)
        particle.v[X] = atomicSpeedLimit;
      else
        particle.v[X] = -atomicSpeedLimit;
    }

    particle.pos = calcPosition(particle.pos, particle.v);
  }
}

////////////////////////////////////
////PARTICLE CREATION/RENDERING/////
////////////////////////////////////

//A function to create an object with all the properties for making a
//circle in html. Arguments are initial position, initial velocity, 
//initial acceleration, mass, charge, radius, static/dynamic state, 
//and color. We use this to make protons, electrons, and other particles.
function genParticle (pos, v, a , m, q, r, dynamic, color) {
  var isNegative = Math.random() > 0.5;
  pos = pos || [Math.random()*width, Math.random()*height];
  v = v || [0,0];
  a = a || [0,0];
  m = m || 1;
  q = q || (isNegative ? -1 : 1);
  r = r || 10;
  dynamic = dynamic === false ? false : true;
  color = color || (q < 0 ? "#4782E8" : "#F54836");

  var p = {
    pos : pos,
    v : v,
    a : a,
    m : m,
    q : q,
    r : r,
    color : color,
    dynamic : dynamic, 
    id : uuid
  }
  uuid++;
  particles.push(p);
}

//Execute genParticles n times
function genParticles (n) {
  particles = [];
  for (var i = 0; i < n; i++) {
    genParticle();
  }
}

//Render particles
function renderParticles () {
  particleSvg.selectAll('.particle').data(particles, function(d) {return d.id;}).enter()
    .append("circle").attr("class", "particle");
  particleSvg.selectAll('.particle').data(particles, function(d) {return d.id;}).exit().remove();
  var particleNodes = particleSvg.selectAll('.particle').data(particles, function(d) {return d.id;});
  // debugger;
  particleNodes.transition().ease("linear").duration(animSpeed).attr("cx", function(d) {return d.pos[X];})
    .attr("cy", function(d) {return d.pos[Y];}).attr("r", function(d) {return d.r;});

  particleNodes.style("fill", function(d) {return d.color;});

}

///////////////////////////////////
//SPECIALIZED PARTICLE GENERATORS//
///////////////////////////////////

//A function that can be used to generate a wall of any given width.
//This wall is typically static, meaning its position in the system is 
//fixed. We specify the charge each point of the wall has explicitly
function makeAWall (startPos, endPos, num) {
  var dPos = subVectors(endPos, startPos);
  var dY = dPos[Y]/num;
  var dX = dPos[X]/num;
  var x = startPos[X];
  var y = startPos[Y];
  for (var i = 0; i < num; i++) {
                //pos   v      a      m   q   r   dynam  color
    genParticle([x, y], [0,0], [0,0], 1, 500, 10, false, "#F54836");
    x += dX;
    y += dY;
  }
}


//This function can be repurposed a number of different ways.
//In its current implementation it used the genParticle function above
//to create 100 particles a randomized intial position and a fixed
//inital velocity. In this case we are making 100 protons
function injector () {
  for (var i = 0; i < 100; i++) {
    genParticle([i*Math.random()*10, 400],[1,0.1], [0,0], 0, 1, 10, true, "#F54836");
  }
}

//////////////////////
////SYSTEM CONTROL////
//////////////////////

//Use D3 to create our particles in the DOM. Make two positively charged 
//walls above and below where the other particles will be injected. Invoke 
//injector then run renderParticles helper function to render particles 
//based on their current properties
function startSystem () {
  particleSvg = d3.select('body')
                  .append("svg")
                  .attr("width", width)
                  .attr("height", height);
  makeAWall([width * -2, height * 0.25], [width*2, height * 0.25], 200);
  makeAWall([width * -2, height * 0.55], [width*2, height * 0.55], 200);
  injector();
  renderParticles();
}

//This function first starts the system. Then performs the updateParticles 
//helper to get the new acceleration, position, and velocity of each 
//particle based on its interaction with every other particle in the 
//system. This is KEY. After updating the particles' properties we 
//re-render them on the screen. In the current configuration, we perform 
//this update once every 10 ms.  
function systemLoop () {
  startSystem();
  setInterval(function() {
    updateParticles();
    renderParticles();
  }, animSpeed);
}

