// Global game mode: "duo" or "solo"
let gameMode = "duo";

// Helper: draw a rounded rectangle
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Full screen toggle
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Default names and scores
const defaultP1Name = "Player 1";
const defaultP2Name = "Player 2";
let p1Name = defaultP1Name;
let p2Name = defaultP2Name;
let p1Score = 0, p2Score = 0;

const speed = 5;
let gameRunning = false;
let gamePaused = false;

// Audio elements
const bgMusic = document.getElementById("bgMusic");
const shootSound = document.getElementById("shootSound");
const hitSound = document.getElementById("hitSound");
const shieldBreakSound = document.getElementById("shieldBreakSound");

// Start background music when game starts
function startBackgroundMusic() {
  bgMusic.play();
}

// Set volume from slider
const volumeSlider = document.getElementById("volumeSlider");
function updateVolume() {
  let vol = volumeSlider.value / 100;
  bgMusic.volume = vol;
  shootSound.volume = vol;
  hitSound.volume = vol;
  shieldBreakSound.volume = vol;
}
volumeSlider.addEventListener("input", updateVolume);
updateVolume();

// Players (if solo mode, player2 is AI-controlled)
const player1 = {
  x: 100,
  y: 0,
  width: 40,
  height: 40,
  color: "blue",
  health: 100,
  shield: 100,
  shieldActive: false,
  shieldBroken: false,
  message: "",
  canShoot: true,
  lastDir: "right"
};
const player2 = {
  x: 600,
  y: 0,
  width: 40,
  height: 40,
  color: "red",
  health: 100,
  shield: 100,
  shieldActive: false,
  shieldBroken: false,
  message: "",
  canShoot: true,
  lastDir: "left"
};

let bullets = [];

// Controls mapping
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
  " ": false, q: false, Enter: false, m: false, p: false
};

// Update last direction based on key input
function updateDirection() {
  if (keys.w) { player1.lastDir = "up"; }
  else if (keys.s) { player1.lastDir = "down"; }
  else if (keys.a) { player1.lastDir = "left"; }
  else if (keys.d) { player1.lastDir = "right"; }
  
  if (gameMode === "duo") {
    if (keys.ArrowUp) { player2.lastDir = "up"; }
    else if (keys.ArrowDown) { player2.lastDir = "down"; }
    else if (keys.ArrowLeft) { player2.lastDir = "left"; }
    else if (keys.ArrowRight) { player2.lastDir = "right"; }
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "CapsLock") { e.preventDefault(); return; }
  if (keys.hasOwnProperty(e.key)) {
    if (e.key === "p") { togglePause(); return; }
    if (e.key === " " && player1.canShoot && gameRunning && !gamePaused) {
      shootBullet(player1, 1);
      player1.canShoot = false;
    } else if (e.key === "Enter" && gameMode === "duo" && player2.canShoot && gameRunning && !gamePaused) {
      shootBullet(player2, 2);
      player2.canShoot = false;
    }
    keys[e.key] = true;
    updateDirection();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === "CapsLock") { e.preventDefault(); return; }
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
    if (e.key === " ") player1.canShoot = true;
    if (e.key === "Enter" && gameMode === "duo") player2.canShoot = true;
    updateDirection();
  }
});

function movePlayers() {
  if (keys.a && player1.x > 0) player1.x -= speed;
  if (keys.d && player1.x + player1.width < canvas.width) player1.x += speed;
  if (keys.w && player1.y > 0) player1.y -= speed;
  if (keys.s && player1.y + player1.height < canvas.height) player1.y += speed;
  
  if (gameMode === "duo") {
    if (keys.ArrowLeft && player2.x > 0) player2.x -= speed;
    if (keys.ArrowRight && player2.x + player2.width < canvas.width) player2.x += speed;
    if (keys.ArrowUp && player2.y > 0) player2.y -= speed;
    if (keys.ArrowDown && player2.y + player2.height < canvas.height) player2.y += speed;
    player2.shieldActive = keys.m;
  } else {
    updateAI();
    player2.shieldActive = false;
  }
  player1.shieldActive = keys.q;
  updateDirection();
}

function updateAI() {
  // Simple AI: move player2 toward player1
  if (player2.x + player2.width / 2 < player1.x + player1.width / 2) {
    player2.x += speed * 0.6;
  } else {
    player2.x -= speed * 0.6;
  }
  if (player2.y + player2.height / 2 < player1.y + player1.height / 2) {
    player2.y += speed * 0.6;
  } else {
    player2.y -= speed * 0.6;
  }
  // Randomly shoot
  if (Math.random() < 0.01 && player2.canShoot && gameRunning && !gamePaused) {
    shootBullet(player2, 2);
    player2.canShoot = false;
    setTimeout(() => { player2.canShoot = true; }, 500);
  }
}

function drawTopStatus() {
  const leftX = 20, topY = 20, barWidth = 200, barHeight = 15;
  ctx.fillStyle = "red";
  ctx.fillRect(leftX, topY, (player1.health / 100) * barWidth, barHeight);
  ctx.strokeStyle = "white";
  ctx.strokeRect(leftX, topY, barWidth, barHeight);
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "white";
  ctx.fillText("Health: " + player1.health + "%", leftX + 5, topY + 13);
  
  let shieldColor1 = (player1.shield > 0) ? ctx.createLinearGradient(leftX, topY + barHeight + 5, leftX + barWidth, topY + barHeight + 5) : "#777";
  if (player1.shield > 0) {
    shieldColor1.addColorStop(0, "#4A90E2");
    shieldColor1.addColorStop(1, "#003366");
  }
  ctx.fillStyle = shieldColor1;
  ctx.fillRect(leftX, topY + barHeight + 5, (player1.shield / 100) * barWidth, barHeight);
  ctx.strokeStyle = "white";
  ctx.strokeRect(leftX, topY + barHeight + 5, barWidth, barHeight);
  ctx.fillStyle = "white";
  ctx.fillText("Shield: " + player1.shield + "% 🛡️", leftX + 5, topY + barHeight * 2 + 3);
  
  const nameBoxWidth = 220, nameBoxHeight = 30;
  ctx.fillStyle = "white";
  ctx.fillRect(leftX, topY + barHeight * 2 + 20, nameBoxWidth, nameBoxHeight);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.strokeRect(leftX, topY + barHeight * 2 + 20, nameBoxWidth, nameBoxHeight);
  ctx.fillStyle = "blue";
  ctx.font = "bold 16px Arial";
  ctx.fillText("🟦 " + p1Name, leftX + 10, topY + barHeight * 2 + 27);
  
  const rightX = canvas.width - barWidth - 20;
  ctx.textAlign = "right";
  ctx.fillStyle = "red";
  ctx.fillRect(rightX, topY, (player2.health / 100) * barWidth, barHeight);
  ctx.strokeStyle = "white";
  ctx.strokeRect(rightX, topY, barWidth, barHeight);
  ctx.font = "14px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Health: " + player2.health + "%", rightX + barWidth - 5, topY + 13);
  
  let shieldColor2 = (player2.shield > 0) ? ctx.createLinearGradient(rightX, topY + barHeight + 5, rightX + barWidth, topY + barHeight + 5) : "#777";
  if (player2.shield > 0) {
    shieldColor2.addColorStop(0, "#4A90E2");
    shieldColor2.addColorStop(1, "#003366");
  }
  ctx.fillStyle = shieldColor2;
  ctx.fillRect(rightX, topY + barHeight + 5, (player2.shield / 100) * barWidth, barHeight);
  ctx.strokeStyle = "white";
  ctx.strokeRect(rightX, topY + barHeight + 5, barWidth, barHeight);
  ctx.fillStyle = "white";
  ctx.fillText("Shield: " + player2.shield + "% 🛡️", rightX + barWidth - 5, topY + barHeight * 2 + 3);
  
  ctx.fillStyle = "white";
  ctx.fillRect(rightX, topY + barHeight * 2 + 20, nameBoxWidth, nameBoxHeight);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.strokeRect(rightX, topY + barHeight * 2 + 20, nameBoxWidth, nameBoxHeight);
  ctx.fillStyle = "red";
  ctx.font = "bold 16px Arial";
  ctx.fillText("🟥 " + (gameMode === "solo" ? "Computer" : p2Name), rightX + nameBoxWidth - 10, topY + barHeight * 2 + 27);
  ctx.textAlign = "left";
}

function drawControls() {
  const boxWidth = 300, boxHeight = 50, padding = 20, radius = 10;
  
  // Left control box for Player 1
  const leftX = padding;
  const leftY = canvas.height - boxHeight - padding;
  let grad1 = ctx.createLinearGradient(leftX, leftY, leftX, leftY + boxHeight);
  grad1.addColorStop(0, "#777");
  grad1.addColorStop(1, "#444");
  ctx.save();
  ctx.shadowColor = "black";
  ctx.shadowBlur = 6;
  drawRoundedRect(ctx, leftX, leftY, boxWidth, boxHeight, radius);
  ctx.fillStyle = grad1;
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "white";
  ctx.fillText("🟦P1: WASD | SPACE shoot | Q shield", leftX + 10, leftY + 30);
  
  // Right control box for Player 2
  const rightX = canvas.width - boxWidth - padding;
  const rightY = canvas.height - boxHeight - padding;
  let grad2 = ctx.createLinearGradient(rightX, rightY, rightX, rightY + boxHeight);
  grad2.addColorStop(0, "#777");
  grad2.addColorStop(1, "#444");
  ctx.save();
  ctx.shadowColor = "black";
  ctx.shadowBlur = 6;
  drawRoundedRect(ctx, rightX, rightY, boxWidth, boxHeight, radius);
  ctx.fillStyle = grad2;
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  if (gameMode === "duo") {
    // Shortened and centered text for P2
    ctx.fillText("🟥P2: Arrows | ENTER shoot | M shield", rightX + boxWidth/2, rightY + 30);
  } else {
    ctx.fillText("🟥AI Controlled", rightX + boxWidth/2, rightY + 30);
  }
  ctx.textAlign = "left";
}

function drawPlayerNamesBox() {
  const boxWidth = 500, boxHeight = 50;
  const x = (canvas.width - boxWidth) / 2;
  const y = 100;
  ctx.fillStyle = "white";
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, boxWidth, boxHeight);
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "blue";
  ctx.fillText("🟦 " + p1Name, x + 20, y + 30);
  ctx.textAlign = "right";
  ctx.fillStyle = "red";
  ctx.fillText("🟥 " + (gameMode === "solo" ? "Computer" : p2Name), x + boxWidth - 20, y + 30);
  ctx.textAlign = "left";
}

function gameLoop() {
  if (!gameRunning || gamePaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawTopStatus();
  movePlayers();
  updateBullets();
  drawPlayer(player1);
  drawPlayer(player2);
  drawControls();
  checkGameOver();
  requestAnimationFrame(gameLoop);
}

function drawPlayer(player) {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  if (player.shieldActive && player.shield > 0) {
    ctx.strokeStyle = player.shieldBroken ? "orange" : "cyan";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function shootBullet(player, owner) {
  if (shootSound) {
    shootSound.currentTime = 0;
    shootSound.play();
  }
  const bSize = 10;
  let bx = player.x, by = player.y, vx = 0, vy = 0;
  let dir = player.lastDir || (owner === 1 ? "right" : "left");
  if (dir === "up") {
    bx = player.x + player.width / 2 - bSize / 2;
    by = player.y - bSize;
    vx = 0; vy = -10;
  } else if (dir === "down") {
    bx = player.x + player.width / 2 - bSize / 2;
    by = player.y + player.height;
    vx = 0; vy = 10;
  } else if (dir === "left") {
    bx = player.x - bSize;
    by = player.y + player.height / 2 - bSize / 2;
    vx = -10; vy = 0;
  } else { // right
    bx = player.x + player.width;
    by = player.y + player.height / 2 - bSize / 2;
    vx = 10; vy = 0;
  }
  const bullet = {
    x: bx,
    y: by,
    width: bSize,
    height: 4,
    speedX: vx,
    speedY: vy,
    owner: owner
  };
  bullets.push(bullet);
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    bullet.x += bullet.speedX;
    bullet.y += bullet.speedY;
    ctx.fillStyle = bullet.owner === 1 ? "cyan" : "orange";
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      bullets.splice(i, 1);
      continue;
    }
    if (bullet.owner === 1 && rectCollision(bullet, player2)) {
      applyHit(player2);
      bullets.splice(i, 1);
      continue;
    } else if (bullet.owner === 2 && rectCollision(bullet, player1)) {
      applyHit(player1);
      bullets.splice(i, 1);
      continue;
    }
  }
}

function applyHit(player) {
  if (hitSound) {
    hitSound.currentTime = 0;
    hitSound.play();
  }
  if (player.shieldActive && player.shield > 0) {
    let prevShield = player.shield;
    player.shield -= 10;
    if (player.shield < 0) player.shield = 0;
    if (prevShield > 0 && player.shield === 0) {
      player.shieldBroken = true;
      if (shieldBreakSound) {
        shieldBreakSound.currentTime = 0;
        shieldBreakSound.play();
      }
      setTimeout(() => { player.shieldBroken = false; }, 500);
    }
  } else {
    player.health -= 10;
    if (player.health < 0) player.health = 0;
  }
}

function rectCollision(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

function checkGameOver() {
  if (player1.health <= 0 || player2.health <= 0) {
    gameRunning = false;
    let winnerText = "";
    if (player1.health <= 0 && player2.health <= 0) {
      winnerText = "It's a draw!";
    } else if (player1.health <= 0) {
      winnerText = "Player 2 wins!";
      p2Score++;
    } else if (player2.health <= 0) {
      winnerText = "Player 1 wins!";
      p1Score++;
    }
    document.getElementById("winnerText").textContent = winnerText;
    updateScoreboard();
    showGameOverScreen();
  }
}

function updateScoreboard() {
  document.getElementById("p1Score").textContent = "Player 1: " + p1Score;
  document.getElementById("p2Score").textContent = "Player 2: " + p2Score;
}

function togglePause() {
  gamePaused = !gamePaused;
  document.getElementById("pauseScreen").classList.toggle("hidden", !gamePaused);
  if (!gamePaused && gameRunning) {
    gameLoop();
  }
}

function showGameOverScreen() {
  document.getElementById("gameOverScreen").classList.remove("hidden");
}

function restartGame() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  document.getElementById("gameOverScreen").classList.add("hidden");
  document.getElementById("pauseScreen").classList.add("hidden");
  document.getElementById("startScreen").classList.remove("hidden");
  
  player1.x = 100; player1.y = 0; player1.health = 100; player1.shield = 100;
  player2.x = 600; player2.y = 0; player2.health = 100; player2.shield = 100;
  bullets = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  document.getElementById("p1Name").value = "";
  document.getElementById("p2Name").value = "";
  p1Name = defaultP1Name; p2Name = defaultP2Name;
  gameRunning = false;
}

function playAgain() {
  restartGame();
  document.getElementById("startScreen").classList.add("hidden");
  dropPlayers();
}

function drawPlayerNamesBox() {
  const boxWidth = 500, boxHeight = 50;
  const x = (canvas.width - boxWidth) / 2;
  const y = 100;
  ctx.fillStyle = "white";
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, boxWidth, boxHeight);
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = "blue";
  ctx.fillText("🟦 " + p1Name, x + 20, y + 30);
  ctx.textAlign = "right";
  ctx.fillStyle = "red";
  ctx.fillText("🟥 " + (gameMode === "solo" ? "Computer" : p2Name), x + boxWidth - 20, y + 30);
  ctx.textAlign = "left";
}

function dropPlayers() {
  let dropSpeed = 5;
  let countdown = 3;
  let countdownInterval = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(countdown, canvas.width / 2, canvas.height / 2);
    countdown--;
    if (countdown < 0) {
      clearInterval(countdownInterval);
      animateDrop();
    }
  }, 1000);
  
  function animateDrop() {
    function dropAnimation() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (player1.y < 300) player1.y += dropSpeed;
      if (player2.y < 300) player2.y += dropSpeed;
      drawPlayer(player1);
      drawPlayer(player2);
      if (player1.y >= 300 && player2.y >= 300) {
        drawPlayerNamesBox();
        setTimeout(() => {
          gameRunning = true;
          startBackgroundMusic();
          gameLoop();
        }, 2000);
        return;
      }
      requestAnimationFrame(dropAnimation);
    }
    dropAnimation();
  }
}

function startGame() {
  // Read mode selection
  let modeElems = document.getElementsByName("mode");
  for (let i = 0; i < modeElems.length; i++) {
    if (modeElems[i].checked) {
      gameMode = modeElems[i].value;
      break;
    }
  }
  let inputP1 = document.getElementById("p1Name").value.trim();
  let inputP2 = document.getElementById("p2Name").value.trim();
  p1Name = inputP1 ? inputP1 : defaultP1Name;
  if (gameMode === "solo") {
    p2Name = "Computer";
  } else {
    p2Name = inputP2 ? inputP2 : defaultP2Name;
  }
  document.getElementById("startScreen").classList.add("hidden");
  dropPlayers();
}

document.getElementById("p1Name").addEventListener("input", function() {
  let newName = this.value.trim();
  p1Name = newName === "" ? defaultP1Name : newName;
});
document.getElementById("p2Name").addEventListener("input", function() {
  let newName = this.value.trim();
  p2Name = newName === "" ? defaultP2Name : newName;
});
