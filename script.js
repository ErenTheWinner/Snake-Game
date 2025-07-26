const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const size = 20;
const rows = canvas.width / size;
const cols = canvas.height / size;

let snake, dir, food, superFood, superFoodTimer;
let score, streak, paused, gameSpeed = 150;

// Audio system
let audioSystem = {
  bgMusic: null,
  sounds: {},
  musicEnabled: true,
  sfxEnabled: true,
  volume: 0.5,
  initialized: false
};

// Local storage key for leaderboard
const LEADERBOARD_KEY = 'snake_game_leaderboard';

// Initialize audio system
async function initAudio() {
  try {
    // Background music - you can replace these paths with your actual WAV files
    audioSystem.bgMusic = new Audio('sounds/retro.wav');
    audioSystem.bgMusic.loop = true;
    audioSystem.bgMusic.volume = audioSystem.volume * 1; // Background music quieter
    
    // Sound effects
    audioSystem.sounds.eat = new Audio('sounds/eat.wav');
    audioSystem.sounds.superFood = new Audio('sounds/superfood.wav');
    audioSystem.sounds.gameOver = new Audio('sounds/game-over.wav');
    audioSystem.sounds.levelUp = new Audio('sounds/level-up.wav');
    
    // Set volumes for sound effects
    Object.values(audioSystem.sounds).forEach(sound => {
      sound.volume = audioSystem.volume;
    });
    
    audioSystem.initialized = true;
    document.getElementById('audioStatus').textContent = 'Audio ready! 🎵';
    
    // Auto-start music if enabled
    if (audioSystem.musicEnabled) {
      playBackgroundMusic();
    }
    
  } catch (error) {
    console.log('Audio files not found - using fallback sounds');
    document.getElementById('audioStatus').textContent = 'Using browser beeps (add WAV files to sounds/ folder)';
    
    // Fallback to Web Audio API for retro beeps
    initFallbackAudio();
  }
}

// Fallback audio using Web Audio API for retro sounds
function initFallbackAudio() {
  if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    
    audioSystem.sounds.eat = () => playBeep(audioCtx, 440, 0.1);
    audioSystem.sounds.superFood = () => playBeep(audioCtx, 660, 0.2);
    audioSystem.sounds.gameOver = () => playBeep(audioCtx, 220, 0.5);
    audioSystem.sounds.levelUp = () => playBeep(audioCtx, 880, 0.3);
    
    audioSystem.initialized = true;
  }
}

// Generate retro beep sounds
function playBeep(audioCtx, frequency, duration) {
  if (!audioSystem.sfxEnabled) return;
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'square'; // Retro square wave
  
  gainNode.gain.setValueAtTime(audioSystem.volume * 0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

// Audio control functions
function playBackgroundMusic() {
  if (audioSystem.bgMusic && audioSystem.musicEnabled && audioSystem.bgMusic.play) {
    audioSystem.bgMusic.play().catch(e => console.log('Music autoplay blocked'));
  }
}

function pauseBackgroundMusic() {
  if (audioSystem.bgMusic && audioSystem.bgMusic.pause) {
    audioSystem.bgMusic.pause();
  }
}

function playSound(soundName) {
  if (!audioSystem.sfxEnabled) return;
  
  if (typeof audioSystem.sounds[soundName] === 'function') {
    // Fallback beep sound
    audioSystem.sounds[soundName]();
  } else if (audioSystem.sounds[soundName]) {
    // WAV file sound
    audioSystem.sounds[soundName].currentTime = 0;
    audioSystem.sounds[soundName].play().catch(e => console.log('Sound play failed'));
  }
}

function toggleMusic() {
  audioSystem.musicEnabled = !audioSystem.musicEnabled;
  const btn = document.getElementById('musicToggle');
  
  if (audioSystem.musicEnabled) {
    btn.textContent = '🎵 Music: ON';
    btn.classList.add('active');
    playBackgroundMusic();
  } else {
    btn.textContent = '🎵 Music: OFF';
    btn.classList.remove('active');
    pauseBackgroundMusic();
  }
}

function toggleSFX() {
  audioSystem.sfxEnabled = !audioSystem.sfxEnabled;
  const btn = document.getElementById('sfxToggle');
  
  if (audioSystem.sfxEnabled) {
    btn.textContent = '🔊 SFX: ON';
    btn.classList.add('active');
  } else {
    btn.textContent = '🔊 SFX: OFF';
    btn.classList.remove('active');
  }
}

function updateVolume() {
  const volume = document.getElementById('volumeSlider').value / 100;
  audioSystem.volume = volume;
  
  if (audioSystem.bgMusic) {
    audioSystem.bgMusic.volume = volume * 0.6;
  }
  
  Object.values(audioSystem.sounds).forEach(sound => {
    if (sound && sound.volume !== undefined) {
      sound.volume = volume;
    }
  });
}

function initGame() {
  snake = [{ x: 5, y: 5 }];
  dir = { x: 1, y: 0 };
  food = spawnFood();
  superFood = null;
  superFoodTimer = 0;
  score = 0;
  streak = 0;
  paused = false;
  gameSpeed = 150;
  document.getElementById('gameOverModal').style.display = 'none';
  
  // Start background music
  if (audioSystem.initialized && audioSystem.musicEnabled) {
    playBackgroundMusic();
  }
}

function drawBlock(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size, y * size, size - 1, size - 1);
}

function spawnFood() {
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * rows),
      y: Math.floor(Math.random() * cols)
    };
  } while (snake.some(s => s.x === newFood.x && s.y === newFood.y) || 
           (superFood && superFood.x === newFood.x && superFood.y === newFood.y));
  return newFood;
}

// Local storage functions for leaderboard
function getLeaderboard() {
  const stored = localStorage.getItem(LEADERBOARD_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveScore(name, score) {
  const leaderboard = getLeaderboard();
  const newEntry = {
    name: name || 'Anonymous',
    score: score,
    date: new Date().toLocaleDateString()
  };
  
  leaderboard.push(newEntry);
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard.splice(5); // Keep only top 5
  
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  return true;
}

async function submitScoreToServer(name, score) {
  try {
    // Use local storage instead of server
    const success = saveScore(name, score);
    
    if (success) {
      console.log('Score saved locally:', { name, score });
      setTimeout(renderLeaderboard, 100);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
}

async function renderLeaderboard() {
  const list = document.getElementById('leaderboard');
  
  try {
    list.innerHTML = '<li class="loading">Loading...</li>';
    
    // Get scores from local storage
    const scores = getLeaderboard();
    list.innerHTML = '';
    
    if (scores.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No scores yet. Be the first!';
      li.style.opacity = '0.6';
      list.appendChild(li);
      return;
    }
    
    scores.forEach((entry, index) => {
      const li = document.createElement('li');
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      li.textContent = `${medal} ${entry.name} — ${entry.score} pts — ${entry.date}`;
      list.appendChild(li);
    });
    
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    list.innerHTML = '<li class="error">Failed to load leaderboard</li>';
  }
}

function gameLoop() {
  if (paused) return;

  let head = {
    x: (snake[0].x + dir.x + rows) % rows,
    y: (snake[0].y + dir.y + cols) % cols
  };

  // Check for collision with self
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  // Check for food collision
  if (head.x === food.x && head.y === food.y) {
    const bonus = Math.floor(streak / 5);
    score += 1 + bonus;
    streak++;
    food = spawnFood();
    
    // Play eat sound
    playSound('eat');
    
    // Level up sound every 10 points
    if (score % 10 === 0) {
      playSound('levelUp');
    }
    
    gameSpeed = Math.max(100, gameSpeed - 1);

    const superFoodChance = Math.min(0.4, 0.15 + (streak * 0.02));
    if (!superFood && Math.random() < superFoodChance) {
      superFood = spawnFood();
      superFoodTimer = Date.now();
    }
  } else if (superFood && head.x === superFood.x && head.y === superFood.y) {
    score += 5 + Math.floor(streak / 3);
    streak++;
    superFood = null;
    
    // Play super food sound
    playSound('superFood');
    
  } else {
    snake.pop();
    streak = 0;
    gameSpeed = Math.min(150, gameSpeed + 0.5);
  }

  if (superFood && Date.now() - superFoodTimer > 6000) {
    superFood = null;
  }

  draw();
  updateGameSpeed();
}

function updateGameSpeed() {
  clearInterval(window.gameInterval);
  window.gameInterval = setInterval(gameLoop, gameSpeed);
}

function gameOver() {
  clearInterval(window.gameInterval);
  
  // Play game over sound
  playSound('gameOver');
  
  // Pause background music
  pauseBackgroundMusic();
  
  document.getElementById('finalScore').textContent = score;
  document.getElementById('streakBonus').textContent = Math.floor(streak / 5);
  document.getElementById('gameOverModal').style.display = 'flex';
  document.getElementById('playerName').focus();
  
  // Reset submit button state
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Score';
  document.getElementById('playerName').value = '';
}

async function submitScore() {
  const name = document.getElementById('playerName').value.trim();
  const submitBtn = document.getElementById('submitBtn');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  const success = await submitScoreToServer(name, score);
  
  if (success) {
    initGame();
    startGame();
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Retry Submit';
    alert('Failed to save score. Please try again or skip.');
  }
}

function skipScore() {
  initGame();
  startGame();
}

function startGame() {
  clearInterval(window.gameInterval);
  window.gameInterval = setInterval(gameLoop, gameSpeed);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  snake.forEach((s, i) => {
    if (i === 0) {
      ctx.shadowColor = '#00ff88';
      ctx.shadowBlur = 15;
      drawBlock(s.x, s.y, '#00ff88');
      ctx.shadowBlur = 0;
    } else {
      const intensity = Math.max(30, 100 - i * 5);
      const hue = 120 + (i * 5);
      drawBlock(s.x, s.y, `hsl(${hue}, 70%, ${intensity}%)`);
    }
  });

  const time = Date.now() * 0.005;
  const foodPulse = Math.sin(time) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(255, 255, 255, ${foodPulse})`;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.fillRect(food.x * size, food.y * size, size - 1, size - 1);
  ctx.shadowBlur = 0;

  if (superFood) {
    const goldTime = time * 2;
    const goldPulse = Math.sin(goldTime) * 0.4 + 0.6;
    const goldHue = (goldTime * 10) % 60 + 40;
    
    ctx.fillStyle = `hsla(${goldHue}, 80%, 60%, ${goldPulse})`;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillRect(superFood.x * size, superFood.y * size, size - 1, size - 1);
    ctx.shadowBlur = 0;
    
    const timeLeft = Math.max(0, 6000 - (Date.now() - superFoodTimer));
    const timerRatio = timeLeft / 6000;
    if (timerRatio < 0.3) {
      ctx.fillStyle = `rgba(255, 0, 0, ${Math.sin(goldTime * 10) * 0.5 + 0.5})`;
      ctx.fillRect(superFood.x * size, superFood.y * size, size - 1, size - 1);
    }
  }

  if (paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Press P to continue', canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = 'left';
  }

  document.getElementById('score').innerText = `Score: ${score}`;
  const bonus = Math.floor(streak / 5);
  document.getElementById('streak').innerText = `Streak: ${streak} (Bonus: +${bonus})`;
}

// Handle keyboard input
window.addEventListener('keydown', e => {
  const { key } = e;
  
  // Prevent default behavior for arrow keys to stop page scrolling
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
    e.preventDefault();
  }
  
  if (paused && key.toLowerCase() !== 'p') return;
  
  if (key === 'ArrowUp' && dir.y === 0) dir = { x: 0, y: -1 };
  else if (key === 'ArrowDown' && dir.y === 0) dir = { x: 0, y: 1 };
  else if (key === 'ArrowLeft' && dir.x === 0) dir = { x: -1, y: 0 };
  else if (key === 'ArrowRight' && dir.x === 0) dir = { x: 1, y: 0 };
  else if (key.toLowerCase() === 'p') {
    paused = !paused;
    if (paused) {
      pauseBackgroundMusic();
    } else if (audioSystem.musicEnabled) {
      playBackgroundMusic();
    }
    draw();
  }
  else if (key.toLowerCase() === 'm') {
    toggleMusic();
  }
  else if (key === 'Enter' && document.getElementById('gameOverModal').style.display === 'flex') {
    submitScore();
  }
});

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  // Initialize audio controls
  document.getElementById('musicToggle').classList.add('active');
  document.getElementById('sfxToggle').classList.add('active');
  
  // Initialize game
  initGame();
  renderLeaderboard();
  startGame();
  
  // Initialize audio system
  initAudio();
});