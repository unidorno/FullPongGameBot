var url = new URL(location.href);
var playerid = url.searchParams.get("id");
/**
 * Scoreboard stuff
 *  _   0
 * |_| 123 <= coresponding indexes, ie. for 1 is 
 * |_| 456    bar 3 and 6 visible => 0 001 001
 * 
 */
var NUMS = [
	"1 101 111",
	"0 001 001",
	"1 011 110",
	"1 011 011",
	"0 111 001",
	"1 110 011",
	"1 110 111",
	"1 001 001",
	"1 111 111",
	"1 111 011"
],
POINTS = [
	[0, 0, 1, 0],
	[0, 0, 0, 1],
	[0, 1, 1, 1],
	[1, 0, 1, 1],
	[0, 1, 0, 2],
	[0, 2, 1, 2],
	[1, 1, 1, 2]
];
// Convert the strings in NUMS to a boolean array
for (var i = 0; i < NUMS.length; i++) {
	var n = NUMS[i].replace(/\s+/g, "");
	NUMS[i] = (function() {
		var l = [];
		for (var j = 0; j < n.length; j++) {
			l.push(n[j] === "1");
		}
		return l;
	})();
}
function pad(str, padding, width) {
	return (new Array(width||2).join(padding||0)+str).slice(-width)
}
function drawNumber(n, x, y, ralign) {
	n = n.toString(); // convert to string => possible to loop thru all digits

	var size = 32,
		padding = 16;
	
	ctx.save();
	ctx.strokeStyle = "#fff";
	ctx.lineCap = "square";
	ctx.lineWidth = padding/2;

	if (ralign) { // if right aligned move x coord accordingly
		x -= (n.length*(padding+size)-padding);
	}
	ctx.translate(x, y);

	for (var i = 0; i < n.length; i++) {
		var num = NUMS[parseInt(n[i])];
		
		ctx.beginPath();
		for (var j = 0; j < num.length; j++) {
			if (num[j]) {
				var p = POINTS[j];
				ctx.moveTo(p[0]*size, p[1]*size);
				ctx.lineTo(p[2]*size, p[3]*size);
			}
		}
		ctx.closePath();
		ctx.stroke();
		// fix anoying bug
		var p2 = padding/2,
			p4 = padding/4;
		ctx.fillRect(size - p4, 2*size - p4, p2, p2);

		ctx.translate(size+padding, 0);
	}
	ctx.restore();
}
var
/**
 * Constants
 */
WIDTH  = 700,
HEIGHT = 600,

pi = Math.PI,

UpArrow   = 38,
DownArrow = 40,

/**
 * Game elements
 */
canvas,
ctx,
keystate,

/**
 * The player paddle
 * 
 * @type {Object}
 */
player = {
	x: null,
	y: null,
	score: null,
	finished: false,

	width:  20,
	height: 100,

	/**
	 * Update the position depending on pressed keys
	 */
	update: function() {
		if (keystate[UpArrow]) this.y -= 7;
		if (keystate[DownArrow]) this.y += 7;
		// keep the paddle inside of the canvas
		this.y = Math.max(Math.min(this.y, HEIGHT - this.height), 0);
	},

	/**
	 * Draw the player paddle to the canvas
	 */
	draw: function() {
		ctx.fillRect(this.x, this.y, this.width, this.height);
	}
},

/**
 * The ai paddle
 * 
 * @type {Object}
 */
ai = {
	x: null,
	y: null,
	score: null,

	width:  20,
	height: 100,

	/**
	 * Update the position depending on the ball position
	 */
	update: function() {
		// calculate ideal position
		var desty = ball.y - (this.height - ball.side)*0.5;
		// ease the movement towards the ideal position
		this.y += (desty - this.y) * 0.1;
		// keep the paddle inside of the canvas
		this.y = Math.max(Math.min(this.y, HEIGHT - this.height), 0);
	},

	/**
	 * Draw the ai paddle to the canvas
	 */
	draw: function() {
		ctx.fillRect(this.x, this.y, this.width, this.height);
	}
},

/**	
 * The ball object
 * 
 * @type {Object}
 */
ball = {
	x:   null,
	y:   null,
	vel: null,

	side:  20,
	speed: 12,

	/**
	 * Serves the ball towards the specified side
	 * 
	 * @param  {number} side 1 right
	 *                       -1 left
	 */
	serve: function(side) {
		// set the x and y position
		var r = Math.random();
		this.x = side===1 ? player.x+player.width : ai.x - this.side;
		this.y = (HEIGHT - this.side)*r;
		// calculate out-angle, higher/lower on the y-axis =>
		// steeper angle
		var phi = 0.1*pi*(1 - 2*r);
		// set velocity direction and magnitude
		this.vel = {
			x: side*this.speed*Math.cos(phi),
			y: this.speed*Math.sin(phi)
		}
	},

	/**
	 * Update the ball position and keep it within the canvas
	 */
	update: function() {
		// update position with current velocity
		this.x += this.vel.x;
		this.y += this.vel.y;
		// check if out of the canvas in the y direction
		if (0 > this.y || this.y+this.side > HEIGHT) {
			// calculate and add the right offset, i.e. how far
			// inside of the canvas the ball is
			var offset = this.vel.y < 0 ? 0 - this.y : HEIGHT - (this.y+this.side);
			this.y += 2*offset;
			// mirror the y velocity
			this.vel.y *= -1;
		}
		// helper function to check intesectiont between two
		// axis aligned bounding boxex (AABB)
		var AABBIntersect = function(ax, ay, aw, ah, bx, by, bw, bh) {
			return ax < bx+bw && ay < by+bh && bx < ax+aw && by < ay+ah;
		};

		// check againts target paddle to check collision in x
		// direction
		var pdle = this.vel.x < 0 ? player : ai;
		if (AABBIntersect(pdle.x, pdle.y, pdle.width, pdle.height,
				this.x, this.y, this.side, this.side)
		) {	
			// set the x position and calculate reflection angle
			this.x = pdle===player ? player.x+player.width : ai.x - this.side;
			var n = (this.y+this.side - pdle.y)/(pdle.height+this.side);
			var phi = 0.25*pi*(2*n - 1); // pi/4 = 45
			// calculate smash value and update velocity
			var smash = Math.abs(phi) > 0.2*pi ? 1.5 : 1;
			this.vel.x = smash*(pdle===player ? 1 : -1)*this.speed*Math.cos(phi);
			this.vel.y = smash*this.speed*Math.sin(phi);
		}

		// reset the ball when ball outside of the canvas in the
		// x direction
		if (0 > this.x+this.side || this.x > WIDTH) {
			var isplayer = pdle === player;
			
			this.serve(isplayer ? 1 : -1);
			player.score += isplayer ? 0 : 1;
			ai.score += isplayer ? 1 : 0;
		}
	},

	/**
	 * Draw the ball to the canvas
	 */
	draw: function() {
		ctx.fillRect(this.x, this.y, this.side, this.side);
	}
};

function requestFullscreen() {
	console.log(canvas);
	if (canvas.requestFullscreen) {
		canvas.requestFullscreen();
	} else if (canvas.msRequestFullscreen) {
		canvas.msRequestFullscreen();
	} else if (canvas.mozRequestFullScreen) {
		canvas.mozRequestFullScreen();
	} else if (canvas.webkitRequestFullscreen) {
		canvas.webkitRequestFullscreen();
	}
	window.onresize = function() {
		canvas.width = WIDTH = window.innerWidth;
		canvas.height = HEIGHT = window.innerHeight;
		init();
	}
}

/**
 * Starts the game
 */
function main() {
	// create, initiate and append game canvas
	canvas = document.createElement("canvas");
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	ctx = canvas.getContext("2d");
	document.body.appendChild(canvas);

	keystate = {};
	// keep track of keyboard presses
	document.addEventListener("keydown", function(evt) {
		keystate[evt.keyCode] = true;
	});
	document.addEventListener("keyup", function(evt) {
		delete keystate[evt.keyCode];
	});

	init(); // initiate game objects

	function touchevt(evt) {
		var el = evt.target,
			oy = 0;

		do {
			oy += el.offsetTop;
		} while (el = el.parentOffset)

		player.y = evt.touches[0].clientY - oy - player.height/2;	
	}
	canvas.addEventListener("touchmove", touchevt);
	canvas.addEventListener("touchstart", touchevt);

	var d = document.createElement("div");
	d.innerHTML = '<svg onclick="requestFullscreen()"width="20" height="16" opacity="0.5"><path d="M0 5v-5h5m10 0h5v5m0 6v5h-5m-10 0h-5v-5M6 6h8v4h-8z"style="fill:none;stroke:#000;stroke-width:4"></path></svg>';
	document.body.appendChild(d);

	// game loop function
	var loop = function() {
		update();
		draw();

		window.requestAnimationFrame(loop, canvas);
	};
	window.requestAnimationFrame(loop, canvas);
}

/**
 * Initatite game objects and set start positions
 */
function init() {
	player.x = player.width;
	player.y = (HEIGHT - player.height)/2;
	player.score = 0;

	ai.x = WIDTH - (player.width + ai.width);
	ai.y = (HEIGHT - ai.height)/2;
	ai.score = 0;

	ball.serve(1);
}

/**
 * Update all game objects
 */
function update() {
	ball.update();
	player.update();
	ai.update();
    if (player.score >= 1 && !player.finished){
		//player.highscore = player.score;
		var xmlhttp = new XMLHttpRequest();
        var url = "https://fiverrpong.herokuapp.com/highscore/" + player.score + "?id=" + playerid;
       	var sendingText = document.getElementById("sendingText");
        sendingText.style.display = "block";

        xmlhttp.onreadystatechange = function() 
		{
        	sendingText.style.display = "none";
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
        player.finished = true;
	}
}


/**
 * Clear canvas and draw all game objects and net
 */
function draw() {
	ctx.fillRect(0, 0, WIDTH, HEIGHT);

	ctx.save();

	ctx.fillStyle = "#fff";


	ball.draw();
	player.draw();
	ai.draw();

	// draw the net
	var w = 4;
	var x = (WIDTH - w)*0.5;
	var y = 0;
	var step = HEIGHT/20; // how many net segments
	while (y < HEIGHT) {
		ctx.fillRect(x, y+step*0.25, w, step*0.5);
		y += step;
	}

	// draw the scores
	var w2 = WIDTH/2;
	drawNumber(pad(player.score), w2-20, 20, true);
	drawNumber(pad(ai.score), w2+20, 20);

	ctx.restore();
}

// start and run the game
main();
