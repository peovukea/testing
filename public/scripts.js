/*
If you want to know how this game works, you can find a source code walkthrough video here: https://youtu.be/bTk6dcAckuI

Follow me on twitter for more: https://twitter.com/HunorBorbely
*/

Math.minmax = (value, limit) => {
    return Math.max(Math.min(value, limit), -limit);
};

const distance2D = (p1, p2) => {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

// Angle between the two points
const getAngle = (p1, p2) => {
    let angle = Math.atan((p2.y - p1.y) / (p2.x - p1.x));
    if (p2.x - p1.x < 0) angle += Math.PI;
    return angle;
};

// The closest a ball and a wall cap can be
const closestItCanBe = (cap, ball) => {
    let angle = getAngle(cap, ball);

    const deltaX = Math.cos(angle) * (wallW / 2 + ballSize / 2);
    const deltaY = Math.sin(angle) * (wallW / 2 + ballSize / 2);

    return { x: cap.x + deltaX, y: cap.y + deltaY };
};

// Roll the ball around the wall cap
const rollAroundCap = (cap, ball) => {
    // The direction the ball can't move any further because the wall holds it back
    let impactAngle = getAngle(ball, cap);

    // The direction the ball wants to move based on it's velocity
    let heading = getAngle(
        { x: 0, y: 0 },
        { x: ball.velocityX, y: ball.velocityY }
    );

    // The angle between the impact direction and the ball's desired direction
    // The smaller this angle is, the bigger the impact
    // The closer it is to 90 degrees the smoother it gets (at 90 there would be no collision)
    let impactHeadingAngle = impactAngle - heading;

    // Velocity distance if not hit would have occurred
    const velocityMagnitude = distance2D(
        { x: 0, y: 0 },
        { x: ball.velocityX, y: ball.velocityY }
    );
    // Velocity component diagonal to the impact
    const velocityMagnitudeDiagonalToTheImpact =
        Math.sin(impactHeadingAngle) * velocityMagnitude;

    // How far should the ball be from the wall cap
    const closestDistance = wallW / 2 + ballSize / 2;

    const rotationAngle = Math.atan(
        velocityMagnitudeDiagonalToTheImpact / closestDistance
    );

    const deltaFromCap = {
        x: Math.cos(impactAngle + Math.PI - rotationAngle) * closestDistance,
        y: Math.sin(impactAngle + Math.PI - rotationAngle) * closestDistance
    };

    const x = ball.x;
    const y = ball.y;
    const velocityX = ball.x - (cap.x + deltaFromCap.x);
    const velocityY = ball.y - (cap.y + deltaFromCap.y);
    const nextX = x + velocityX;
    const nextY = y + velocityY;

    return { x, y, velocityX, velocityY, nextX, nextY };
};

// Decreases the absolute value of a number but keeps it's sign, doesn't go below abs 0
const slow = (number, difference) => {
    if (Math.abs(number) <= difference) return 0;
    if (number > difference) return number - difference;
    return number + difference;
};

const mazeElement = document.getElementById("maze");
const joystickHeadElement = document.getElementById("joystick-head");
const noteElement = document.getElementById("note"); // Note element for instructions and game won, game failed texts

let hardMode = false;
let previousTimestamp;
let gameInProgress;
let accelerationX = 0;
let accelerationY = 0;
const maxAcceleration = 10; // Adjust this based on sensitivity
const friction = 0.1; // Adjust friction for smoother movements

const pathW = 25; // Path width
const wallW = 10; // Wall width
const ballSize = 10; // Width and height of the ball
const holeSize = 18;

const debugMode = false;

let balls = [];
let ballElements = [];
let holeElements = [];

resetGame();

// Draw balls for the first time
balls.forEach(({ x, y }) => {
    const ball = document.createElement("div");
    ball.setAttribute("class", "ball");
    ball.style.cssText = `left: ${x}px; top: ${y}px; `;

    mazeElement.appendChild(ball);
    ballElements.push(ball);
});

// Wall metadata
const walls = [
    // Border
    { column: 0, row: 0, horizontal: true, length: 10 },
    { column: 0, row: 0, horizontal: false, length: 9 },
    { column: 0, row: 9, horizontal: true, length: 10 },
    { column: 10, row: 0, horizontal: false, length: 9 },

    // Horizontal lines starting in 1st column
    { column: 0, row: 6, horizontal: true, length: 1 },
    { column: 0, row: 8, horizontal: true, length: 1 },

    // Horizontal lines starting in 2nd column
    { column: 1, row: 1, horizontal: true, length: 2 },
    { column: 1, row: 7, horizontal: true, length: 1 },

    // Horizontal lines starting in 3rd column
    { column: 2, row: 2, horizontal: true, length: 2 },
    { column: 2, row: 4, horizontal: true, length: 1 },
    { column: 2, row: 5, horizontal: true, length: 1 },
    { column: 2, row: 6, horizontal: true, length: 1 },

    // Horizontal lines starting in 4th column
    { column: 3, row: 3, horizontal: true, length: 1 },
    { column: 3, row: 8, horizontal: true, length: 3 },

    // Horizontal lines starting in 5th column
    { column: 4, row: 6, horizontal: true, length: 1 },

    // Horizontal lines starting in 6th column
    { column: 5, row: 2, horizontal: true, length: 2 },
    { column: 5, row: 7, horizontal: true, length: 1 },

    // Horizontal lines starting in 7th column
    { column: 6, row: 1, horizontal: true, length: 1 },
    { column: 6, row: 6, horizontal: true, length: 2 },

    // Horizontal lines starting in 8th column
    { column: 7, row: 3, horizontal: true, length: 2 },
    { column: 7, row: 7, horizontal: true, length: 2 },

    // Horizontal lines starting in 9th column
    { column: 8, row: 1, horizontal: true, length: 1 },
    { column: 8, row: 2, horizontal: true, length: 1 },
    { column: 8, row: 3, horizontal: true, length: 1 },
    { column: 8, row: 4, horizontal: true, length: 2 },
    { column: 8, row: 8, horizontal: true, length: 2 },

    // Vertical lines after the 1st column
    { column: 1, row: 1, horizontal: false, length: 2 },
    { column: 1, row: 4, horizontal: false, length: 2 },

    // Vertical lines after the 2nd column
    { column: 2, row: 2, horizontal: false, length: 2 },
    { column: 2, row: 5, horizontal: false, length: 1 },
    { column: 2, row: 7, horizontal: false, length: 2 },

    // Vertical lines after the 3rd column
    { column: 3, row: 0, horizontal: false, length: 1 },
    { column: 3, row: 4, horizontal: false, length: 1 },
    { column: 3, row: 6, horizontal: false, length: 2 },

    // Vertical lines after the 4th column
    { column: 4, row: 1, horizontal: false, length: 2 },
    { column: 4, row: 6, horizontal: false, length: 1 },

    // Vertical lines after the 5th column
    { column: 5, row: 0, horizontal: false, length: 2 },
    { column: 5, row: 6, horizontal: false, length: 1 },
    { column: 5, row: 8, horizontal: false, length: 1 },

    // Vertical lines after the 6th column
    { column: 6, row: 2, horizontal: false, length: 2 },
    { column: 6, row: 5, horizontal: false, length: 1 },

    // Vertical lines after the 7th column
    { column: 7, row: 1, horizontal: false, length: 1 },
    { column: 7, row: 3, horizontal: false, length: 2 },
    { column: 7, row: 8, horizontal: false, length: 1 },

    // Vertical lines after the 8th column
    { column: 8, row: 0, horizontal: false, length: 1 },
    { column: 8, row: 2, horizontal: false, length: 1 },
    { column: 8, row: 5, horizontal: false, length: 1 },
    { column: 8, row: 7, horizontal: false, length: 1 },
    { column: 8, row: 8, horizontal: false, length: 1 },

    // Vertical lines after the 9th column
    { column: 9, row: 1, horizontal: false, length: 1 },
    { column: 9, row: 5, horizontal: false, length: 2 },
    { column: 9, row: 8, horizontal: false, length: 1 }
];

const holePositions = [
    { column: 0, row: 3 },
    { column: 0, row: 5 },

    { column: 1, row: 0 },
    { column: 1, row: 2 },
    { column: 1, row: 3 },
    { column: 1, row: 5 },
    { column: 1, row: 6 },
    { column: 1, row: 8 },

    { column: 2, row: 0 },
    { column: 2, row: 1 },
    { column: 2, row: 3 },
    { column: 2, row: 8 },

    { column: 3, row: 1 },
    { column: 3, row: 2 },
    { column: 3, row: 5 },

    { column: 4, row: 0 },
    { column: 4, row: 4 },

    { column: 5, row: 1 },
    { column: 5, row: 3 },
    { column: 5, row: 4 },
    { column: 5, row: 5 },
    { column: 5, row: 6 },

    { column: 6, row: 0 },
    { column: 6, row: 4 },
    { column: 6, row: 7 },

    { column: 7, row: 0 },
    { column: 7, row: 2 },
    { column: 7, row: 4 },
    { column: 7, row: 5 },
    { column: 7, row: 6 },

    { column: 8, row: 6 },
    { column: 8, row: 7 },

    { column: 9, row: 3 },
    { column: 9, row: 6 },
];

const drawMaze = () => {
    mazeElement.innerHTML = "";

    walls.forEach(wall => {
        if (wall.horizontal) {
            for (let i = 0; i < wall.length; i++) {
                const wallElement = document.createElement("div");
                wallElement.setAttribute("class", "wall horizontal");
                wallElement.style.cssText = `left: ${wall.column * pathW}px; top: ${wall.row * pathW
                    }px; width: ${pathW}px; height: ${wallW}px; `;
                mazeElement.appendChild(wallElement);
            }
        } else {
            for (let i = 0; i < wall.length; i++) {
                const wallElement = document.createElement("div");
                wallElement.setAttribute("class", "wall vertical");
                wallElement.style.cssText = `left: ${wall.column * pathW}px; top: ${wall.row * pathW
                    }px; width: ${wallW}px; height: ${pathW}px; `;
                mazeElement.appendChild(wallElement);
            }
        }
    });

    holePositions.forEach(({ column, row }) => {
        const holeElement = document.createElement("div");
        holeElement.setAttribute("class", "hole");
        holeElement.style.cssText = `left: ${column * pathW + (pathW - holeSize) / 2}px; top: ${row * pathW + (pathW - holeSize) / 2
            }px; width: ${holeSize}px; height: ${holeSize}px; `;
        mazeElement.appendChild(holeElement);
        holeElements.push(holeElement);
    });
};

// Initialize the game
function resetGame() {
    balls = [{ x: pathW * 1.5, y: pathW * 7.5, velocityX: 0, velocityY: 0, nextX: 0, nextY: 0 }];

    ballElements.forEach(ballElement => {
        mazeElement.removeChild(ballElement);
    });

    ballElements = [];

    // Draw the maze walls and holes
    drawMaze();

    // Reset game state
    previousTimestamp = null;
    gameInProgress = true;
    noteElement.textContent = "Guide the ball through the maze!";
    noteElement.classList.remove("show");

    // Draw balls
    balls.forEach(({ x, y }) => {
        const ball = document.createElement("div");
        ball.setAttribute("class", "ball");
        ball.style.cssText = `left: ${x}px; top: ${y}px; `;
        mazeElement.appendChild(ball);
        ballElements.push(ball);
    });

    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Game loop
function gameLoop(timestamp) {
    if (!previousTimestamp) {
        previousTimestamp = timestamp;
    }
    const deltaTime = timestamp - previousTimestamp;
    previousTimestamp = timestamp;

    // Move the ball based on gyroscope input
    if (gameInProgress) {
        moveBall(deltaTime);
        checkCollisions();
        checkWinCondition();
        checkHoles();
        updateGame();
        requestAnimationFrame(gameLoop);
    }
}

// Update ball position based on gyroscope input
function moveBall(deltaTime) {
    // Update acceleration based on gyroscope input
    accelerationX = Math.minmax(accelerationX, maxAcceleration);
    accelerationY = Math.minmax(accelerationY, maxAcceleration);

    // Apply friction
    accelerationX = slow(accelerationX, friction);
    accelerationY = slow(accelerationY, friction);

    // Update ball velocity based on acceleration
    balls.forEach(ball => {
        ball.velocityX += accelerationX;
        ball.velocityY += accelerationY;

        // Limit maximum velocity
        ball.velocityX = Math.minmax(ball.velocityX, maxAcceleration);
        ball.velocityY = Math.minmax(ball.velocityY, maxAcceleration);

        // Move the ball
        ball.x += ball.velocityX * (deltaTime / 1000);
        ball.y += ball.velocityY * (deltaTime / 1000);
    });
}

// Check for collisions with walls and adjust ball position
function checkCollisions() {
    balls.forEach(ball => {
        walls.forEach(wall => {
            if (wall.horizontal) {
                // Horizontal walls
                if (
                    ball.y > wall.row * pathW - ballSize &&
                    ball.y < (wall.row + 1) * pathW &&
                    ball.x > wall.column * pathW - ballSize &&
                    ball.x < wall.column * pathW + pathW
                ) {
                    ball = rollAroundCap(
                        {
                            x: wall.column * pathW + pathW / 2,
                            y: wall.row * pathW
                        },
                        ball
                    );
                }
            } else {
                // Vertical walls
                if (
                    ball.x > wall.column * pathW - ballSize &&
                    ball.x < (wall.column + 1) * pathW &&
                    ball.y > wall.row * pathW - ballSize &&
                    ball.y < wall.row * pathW + pathW
                ) {
                    ball = rollAroundCap(
                        {
                            x: wall.column * pathW,
                            y: wall.row * pathW + pathW / 2
                        },
                        ball
                    );
                }
            }
        });
    });
}

// Check if the ball has reached the goal
function checkWinCondition() {
    const goal = { column: 9, row: 0 }; // Adjust this based on the maze layout

    balls.forEach(ball => {
        if (
            ball.x > goal.column * pathW &&
            ball.x < goal.column * pathW + pathW &&
            ball.y > goal.row * pathW &&
            ball.y < goal.row * pathW + pathW
        ) {
            gameInProgress = false;
            noteElement.textContent = "You won!";
            noteElement.classList.add("show");
        }
    });
}

// Check if the ball has fallen into a hole
function checkHoles() {
    holePositions.forEach(({ column, row }) => {
        balls.forEach(ball => {
            if (
                ball.x > column * pathW &&
                ball.x < column * pathW + holeSize &&
                ball.y > row * pathW &&
                ball.y < row * pathW + holeSize
            ) {
                gameInProgress = false;
                noteElement.textContent = "You fell into a hole!";
                noteElement.classList.add("show");
            }
        });
    });
}

// Update game visuals
function updateGame() {
    balls.forEach((ball, index) => {
        ballElements[index].style.left = `${ball.x}px`;
        ballElements[index].style.top = `${ball.y}px`;
    });
}

// Handle device orientation change events
window.addEventListener("deviceorientation", handleOrientation, true);

// Handle orientation changes to control ball movement
function handleOrientation(event) {
    // Note: This approach assumes that the device is held in portrait mode.
    // Adjust handling based on actual device orientation if needed.
    const beta = event.beta; // In degree in the range [-180,180]
    const gamma = event.gamma; // In degree in the range [-90,90]

    // Calculate acceleration values based on device orientation
    accelerationX = gamma / 90 * maxAcceleration;
    accelerationY = -beta / 180 * maxAcceleration; // Invert Y-axis for correct direction

    // Update joystick head position for visual feedback (optional)
    joystickHeadElement.style.transform = `translate(${accelerationX}px, ${accelerationY}px)`;
}
