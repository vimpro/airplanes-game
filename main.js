const canvas = document.getElementById("canvas")

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});

const ctx = canvas.getContext("2d")

function drawBackground(map) {
	const img = new Image()
	img.src = `./map${map}.png`

	const iw = img.width
	const ih = img.height

	const ir = iw / ih
	const cr = canvas.width / canvas.height

	let sx = 0
	let sy = 0
	let sw = iw
	let sh = ih

	if (ir > cr) {
		// image is wider than canvas
		sw = ih * cr
		sx = (iw - sw) / 2
	} else {
		// image is taller than canvas
		sh = iw / cr
		sy = (ih - sh) / 2
	}

	ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
}

function drawAirplane(x, y, theta, landingProgress) {
	const img = new Image()
	img.src = './plane.png'
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(theta + Math.PI / 2);
	ctx.drawImage(img, -(50 - landingProgress * 0.5) / 2, -(50 - landingProgress * 0.5) / 2, 50 - landingProgress * 0.5, 50 - landingProgress * 0.5);
	ctx.restore();
}

function drawPath(path) {
	if (path.length < 2) return;
	for (let i = 0; i < path.length - 1; i++) {
		// ctx.strokeStyle = "beige"
		// ctx.lineWidth = 5
		ctx.beginPath();
		ctx.moveTo(path[i][0], path[i][1]);
		ctx.lineTo(path[i + 1][0], path[i + 1][1]);
		ctx.stroke();
	}
}

let airplanes = [
	{
		id: crypto.randomUUID(),
		x: 500,
		y: 500,
		theta: 0,
		path: [],
		segmentProgress: 0,
		landingProgress: 0 // number 0 to 100
	}
]

let activePlane = undefined;

canvas.addEventListener("mousedown", (e) => {
	const rect = canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	let closestPlane = 0;
	let closestDistance = 99999;
	for (let i in airplanes) {
		let d = Math.hypot(airplanes[i].x - x, airplanes[i].y - y)
		if (d < closestDistance) {
			closestDistance = d
			closestPlane = i
		}
	}
	if (closestDistance < 50) {
		activePlane = airplanes[closestPlane].id
	}
});

canvas.addEventListener("mousemove", (e) => {
	if (!activePlane) return;
	const rect = canvas.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;
	airplanes.find(plane => plane.id == activePlane).path.push([x, y]);
});

canvas.addEventListener("mouseup", () => {
	activePlane = undefined;
});

function isRunway(x, y) {
	const colors = [
		[42, 42, 42],    // #2a2a2a
		[216, 206, 38]   // #d8ce26
	];
	const tolerance = 10;
	const ix = Math.floor(x);
	const iy = Math.floor(y);

	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			const px = ix + dx;
			const py = iy + dy;
			const data = ctx.getImageData(px, py, 1, 1).data;
			for (const [tr, tg, tb] of colors) {
				const [r, g, b] = data;
				if (
					Math.abs(r - tr) <= tolerance &&
					Math.abs(g - tg) <= tolerance &&
					Math.abs(b - tb) <= tolerance
				) {
					return true;
				}
			}
		}
	}
	return false;
}

function isColliding(plane0, plane1) {
	const tolerance = 35
	let distance = Math.hypot(plane0.x - plane1.x, plane0.y - plane1.y)
	console.log(distance)
	return distance <= tolerance
}

let startTime = 0;
let lastTime = 0;
const speed = 1;
let map = 0;
let score = 0;

let paused = false;

function animate(timestamp) {
	const deltaT = (timestamp - lastTime) / 1000;
	startTime += deltaT
	lastTime = timestamp;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	if (Math.random() > 0.995 && airplanes.length <= 5) {
		// pick a direction to fly in from (N, E, S, W)
		let dir = Math.floor(Math.random() * 4)
		switch (dir) {
			case 0:
				//from the north
				x = Math.random() * canvas.width
				y = 0
				break;

			case 1:
				//from the east
				x = canvas.width
				y = Math.random() * canvas.width
				break

			case 2:
				//from the south
				x = Math.random() * canvas.width
				y = canvas.height
				break

			case 3:
				//from the west
				x = 0
				y = Math.random() * canvas.height
				break;
		}
		// make it face the airport
		let theta = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x)

		airplanes.push({
			id: crypto.randomUUID(),
			x: x,
			y: y,
			theta: theta,
			path: [],
			segmentProgress: 0,
			landingProgress: 0
		})
	}

	drawBackground(map)

	for (let i = 0; i < airplanes.length; i++) {
		// if plane has a path, 
		// the path isn't current being drawn, 
		// the plane is over the runway, 
		// and the plane isn't already landing, 
		// then start the landing

		if (airplanes[i].landingProgress == 0) {
			for (let j = i + 1; j < airplanes.length; j++) {
				if (airplanes[j].landingProgress > 0) continue

				if (isColliding(airplanes[i], airplanes[j])) {
					ctx.beginPath();
					ctx.arc((airplanes[i].x + airplanes[j].x) / 2, (airplanes[i].y + airplanes[j].y) / 2, 50, 0, 2 * Math.PI);
					ctx.fillStyle = '#FF0000aa';
					ctx.fill();

					paused = true
				}
			}
		}

		if (airplanes[i].x > canvas.width ||
			airplanes[i].x < 0 ||
			airplanes[i].y > canvas.height ||
			airplanes[i].y < 0
		) {
			score -= 1
			airplanes.splice(i, 1)
			i--
			continue
		}

		if (airplanes[i].path.length > 0 &&
			airplanes[i].path.length < 4 &&
			activePlane != airplanes[i].id &&
			isRunway(airplanes[i].x, airplanes[i].y) &&
			airplanes[i].landingProgress == 0) {
			airplanes[i].landingProgress = 1
			score += 1
		}

		if (airplanes[i].landingProgress >= 100) {
			airplanes.splice(i, 1)
			i--
			continue
		}

		drawAirplane(airplanes[i].x, airplanes[i].y, airplanes[i].theta, airplanes[i].landingProgress)

		if (airplanes[i].landingProgress > 0)
			airplanes[i].landingProgress += 2


		if (airplanes[i].path.length < 2) {
			// path is not drawn, plane flies current heading
			airplanes[i].x += speed * Math.cos(airplanes[i].theta)
			airplanes[i].y += speed * Math.sin(airplanes[i].theta)
		} else {
			// path is being drawn / already drawn, plane needs to move along its path at constant speed.
			let plane = airplanes[i];

			drawPath(plane.path)

			const path = plane.path;

			let x0 = path[0][0], y0 = path[0][1];
			let x1 = path[1][0], y1 = path[1][1];
			let dx = x1 - x0, dy = y1 - y0;
			let segmentLength = Math.hypot(dx, dy);

			plane.segmentProgress += speed;

			while (plane.segmentProgress > segmentLength) {
				plane.segmentProgress -= segmentLength;

				path.shift();

				if (path.length < 2) {
					plane.path = []
					break;
				}

				x0 = path[0][0];
				y0 = path[0][1];
				x1 = path[1][0];
				y1 = path[1][1];
				dx = x1 - x0;
				dy = y1 - y0;
				segmentLength = Math.hypot(dx, dy);
			}

			let t = plane.segmentProgress / segmentLength;
			if (segmentLength == 0)
				t = 0
			plane.x = x0 + dx * t;
			plane.y = y0 + dy * t;
			plane.theta = Math.atan2(dy, dx);
		}

	}

	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = "20px Arial";
	ctx.fillStyle = "black"
	ctx.fillText(`Score: ${score}`, canvas.width / 2, 0);


	if (!paused) {
		requestAnimationFrame(animate);
	} else {
		alert(`Game over! You scored ${score} points. Better luck next time!`)
		location.reload()
	}
}

function start(m) {
	map = m
	document.getElementById('modal').style.display = 'none';
	requestAnimationFrame(animate)
}