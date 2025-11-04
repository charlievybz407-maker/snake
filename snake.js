(function(){
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const speedEl = document.getElementById('speed');
  const overlay = document.getElementById('overlay');
  const message = document.getElementById('message');

  // Fixed logical grid for consistent gameplay; SCALE is derived from canvas size
  const COLS = 20;
  const ROWS = 20;
  let SCALE = 24; // computed per resize

  let speed = 110; // ms per tick
  let timer = null;
  let running = false;
  let gameOver = false;

  let snake, dir, nextDir, food, score, high;

  function haptic(ms){
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch(_){}
  }

  function resizeCanvas(){
    const stage = canvas.parentElement;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const padding = 24; // stage inner padding
    const maxCss = 640; // cap size on desktop
    const cssSize = Math.max(260, Math.min(maxCss, Math.min(stage.clientWidth - padding*2, window.innerWidth - 32)));
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    canvas.width = Math.floor(cssSize * dpr);
    canvas.height = Math.floor(cssSize * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    SCALE = Math.floor(cssSize / COLS);
    render();
  }

  function reset(){
    snake = [
      {x: Math.floor(COLS/2), y: Math.floor(ROWS/2)},
      {x: Math.floor(COLS/2)-1, y: Math.floor(ROWS/2)},
      {x: Math.floor(COLS/2)-2, y: Math.floor(ROWS/2)}
    ];
    dir = {x: 1, y: 0};
    nextDir = {x: 1, y: 0};
    score = 0;
    updateScore();
    placeFood();
    gameOver = false;
    message.textContent = 'Press Start';
    overlay.classList.remove('hidden');
    render();
  }

  function updateScore(){
    scoreEl.textContent = String(score);
    high = Number(localStorage.getItem('tt_snake_high') || 0);
    if (score > high){
      high = score;
      localStorage.setItem('tt_snake_high', String(high));
    }
    highEl.textContent = String(high);
  }

  function placeFood(){
    while(true){
      const x = Math.floor(Math.random()*COLS);
      const y = Math.floor(Math.random()*ROWS);
      if (!snake.some(s => s.x===x && s.y===y)){
        food = {x,y};
        return;
      }
    }
  }

  function start(){
    if (running) return;
    if (gameOver) reset();
    overlay.classList.add('hidden');
    running = true;
    timer = setInterval(tick, speed);
    haptic(10);
  }

  function pause(){
    if (!running) return;
    running = false;
    clearInterval(timer);
    overlay.classList.remove('hidden');
    message.textContent = 'Paused';
    haptic(5);
  }

  function end(){
    running = false;
    gameOver = true;
    clearInterval(timer);
    overlay.classList.remove('hidden');
    message.textContent = 'Game Over – Press Restart';
    haptic([10,40,10]);
  }

  function setSpeed(label){
    const map = { Slow: 150, Normal: 110, Fast: 80 };
    speedEl.textContent = label;
    speed = map[label];
    if (running){
      clearInterval(timer);
      timer = setInterval(tick, speed);
    }
  }

  // draw helpers
  function drawCell(x,y,color){
    ctx.fillStyle = color;
    ctx.fillRect(x*SCALE, y*SCALE, SCALE, SCALE);
  }

  function drawGrid(){
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    ctx.strokeStyle = '#1f2a44';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for(let i=1;i<COLS;i++){
      ctx.beginPath();
      ctx.moveTo(i*SCALE,0); ctx.lineTo(i*SCALE,ROWS*SCALE); ctx.stroke();
    }
    for(let j=1;j<ROWS;j++){
      ctx.beginPath();
      ctx.moveTo(0,j*SCALE); ctx.lineTo(COLS*SCALE,j*SCALE); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function tick(){
    // apply nextDir once per tick to avoid double-turn bug
    if ((nextDir.x !== -dir.x) || (nextDir.y !== -dir.y)){
      dir = nextDir;
    }

    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

    // wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS){
      end();
      render();
      return;
    }
    // self collision
    if (snake.some((s,i) => i>0 && s.x===head.x && s.y===head.y)){
      end();
      render();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y){
      score += 10;
      updateScore();
      placeFood();
      haptic(8);
    } else {
      snake.pop();
    }

    render();
  }

  function render(){
    drawGrid();

    // draw food (apple)
    ctx.save();
    ctx.shadowColor = 'rgba(239,68,68,.6)';
    ctx.shadowBlur = 14;
    drawCell(food.x, food.y, '#ef4444');
    ctx.restore();

    // draw snake
    for (let i=0;i<snake.length;i++){
      const c = i===0 ? '#22c55e' : '#16a34a';
      if (i===0){
        ctx.save();
        ctx.shadowColor = 'rgba(34,197,94,.45)';
        ctx.shadowBlur = 12;
        drawCell(snake[i].x, snake[i].y, c);
        ctx.restore();
      } else {
        drawCell(snake[i].x, snake[i].y, c);
      }
    }
  }

  // input
  function handleDir(nx,ny){
    // prevent immediate reversal in same tick
    if ((nx === -dir.x && ny === -dir.y) || (nx === dir.x && ny === dir.y)) return;
    nextDir = {x:nx,y:ny};
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') handleDir(0,-1);
    else if (k === 'arrowdown' || k === 's') handleDir(0,1);
    else if (k === 'arrowleft' || k === 'a') handleDir(-1,0);
    else if (k === 'arrowright' || k === 'd') handleDir(1,0);
    else if (k === ' '){ running ? pause() : start(); }
  });

  document.querySelectorAll('.dpad').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.dir;
      if (dir==='up') handleDir(0,-1);
      if (dir==='down') handleDir(0,1);
      if (dir==='left') handleDir(-1,0);
      if (dir==='right') handleDir(1,0);
      haptic(5);
    });
  });

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', pause);
  restartBtn.addEventListener('click', () => { reset(); render(); });

  // Right-click speed toggle
  speedEl.addEventListener('click', () => {
    const order = ['Slow','Normal','Fast'];
    const i = order.indexOf(speedEl.textContent || 'Normal');
    const next = order[(i+1)%order.length];
    setSpeed(next);
  });

  // init
  window.addEventListener('resize', resizeCanvas);
  reset();
  resizeCanvas();
})();
