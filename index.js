// In this case, We set width 320, and the height will be computed based on the input stream.
let width = 960;
let height = 0;

const videoElement = document.getElementById("video");
const speedButton = document.getElementById("speed-button");
const positionButton = document.getElementById("position-button");
const acceralationButton = document.getElementById("acceralation-button");
const buttonMap = {
  speed: speedButton,
  position: positionButton,
  acceralation: acceralationButton
};

let stream = null;
let vc = null;

let src = null;
let dst = null;
let dst2 = null;
let soundMode = null;
let lastMoment = { x: 0, y: 0 };
let lastSpeed = 0;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const oscillator = audioCtx.createOscillator();
const gainNode = audioCtx.createGain();

const scaleOptions = {
  height: 50,
  width: 960,
  lowerHeltz: 350,
  upperHeltz: 1200
};

const main = () => {
  initScale();
  initButton();
  setMode("speed");
  startCamera();
};

const setMode = mode => {
  soundMode = mode;
  for (key in buttonMap) {
    if (mode == key) {
      buttonMap[key].classList.add("button-primary");
    } else {
      buttonMap[key].classList.remove("button-primary");
    }
  }
};

const initButton = () => {
  speedButton.addEventListener(
    "click",
    _ => {
      setMode("speed");
    },
    false
  );
  positionButton.addEventListener(
    "click",
    _ => {
      setMode("position");
    },
    false
  );
  acceralationButton.addEventListener(
    "click",
    _ => {
      setMode("acceralation");
    },
    false
  );
};

const initScale = () => {
  const backgroundCanvas = document.getElementById("background");
  const scales = [
    { label: "ラ", heltz: 220 },
    { label: "シ", heltz: 246 },
    { label: "ド", heltz: 261 },
    { label: "レ", heltz: 293 },
    { label: "ミ", heltz: 329 },
    { label: "ファ", heltz: 349 },
    { label: "ソ", heltz: 391 },
    { label: "ラ", heltz: 440 },
    { label: "シ", heltz: 493 },
    { label: "ド", heltz: 523 },
    { label: "レ", heltz: 587 },
    { label: "ミ", heltz: 659 },
    { label: "ファ", heltz: 698 },
    { label: "ソ", heltz: 783 },
    { label: "ラ", heltz: 880 },
    { label: "シ", heltz: 987 },
    { label: "ド", heltz: 1046 },
    { label: "レ", heltz: 1174 },
    { label: "ミ", heltz: 1318 },
    { label: "ファ", heltz: 1396 },
    { label: "ソ", heltz: 1567 }
  ];
  const ctx = backgroundCanvas.getContext("2d");
  ctx.fillStyle = "#aaa";
  ctx.strokeStyle = "#aaa";
  ctx.beginPath();
  ctx.moveTo(0, scaleOptions.height / 2);
  ctx.lineTo(scaleOptions.width, scaleOptions.height / 2);
  ctx.lineWidth = 2;
  ctx.stroke();
  for (const scale of scales) {
    const x =
      ((scale.heltz - scaleOptions.lowerHeltz) /
        (scaleOptions.upperHeltz - scaleOptions.lowerHeltz)) *
      scaleOptions.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, scaleOptions.height);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "18px 'Roboto'";
    ctx.fillText(scale.label, x, 18);
  }
};

const startCamera = () => {
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then(function(s) {
      stream = s;
      videoElement.srcObject = s;
      videoElement.play();
      videoElement.muted = true;
      createOscillator();
    })
    .catch(function(err) {
      console.log("An error occured! " + err);
    });

  videoElement.addEventListener(
    "canplay",
    function(ev) {
      height = videoElement.videoHeight / (videoElement.videoWidth / width);
      videoElement.setAttribute("width", width);
      videoElement.setAttribute("height", height);
      vc = new cv.VideoCapture(videoElement);
      startVideoProcessing();
    },
    false
  );
};

const createOscillator = () => {
  oscillator.type = "square";
  oscillator.frequency.value = 440;
  oscillator.detune.value = 0;
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start(0);
};

const drawScale = heltz => {
  const circleCanvas = document.getElementById("circle");
  const ctx = circleCanvas.getContext("2d");
  const y = scaleOptions.height / 2;
  const x =
    ((heltz - scaleOptions.lowerHeltz) / (scaleOptions.upperHeltz - scaleOptions.lowerHeltz)) *
    scaleOptions.width;
  ctx.clearRect(0, 0, scaleOptions.width, scaleOptions.height);
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2, false);
  ctx.fillStyle = "#f55";
  ctx.fill();
};

function startVideoProcessing() {
  stopVideoProcessing();
  src = new cv.Mat(height, width, cv.CV_8UC4);
  dst = new cv.Mat(height, width, cv.CV_8UC3);
  dst2 = new cv.Mat(height, width, cv.CV_8UC1);
  requestAnimationFrame(processVideo);
}

// 重心を取得
function getMomemnt(src) {
  cv.cvtColor(src, dst, cv.COLOR_RGB2HSV);
  let lowScalar = new cv.Scalar(70, 100, 30);
  let highScalar = new cv.Scalar(120, 255, 200);
  let low = new cv.Mat(height, width, dst.type(), lowScalar);
  let high = new cv.Mat(height, width, dst.type(), highScalar);
  cv.inRange(dst, low, high, dst2);
  let mu = cv.moments(dst2);
  return { x: mu.m10 / mu.m00, y: mu.m01 / mu.m00 };
}

const distancesSize = 30;
let distances = Array(distancesSize).fill(0);

const fixHeltz = heltz => {
  return 440 * Math.pow(2, Math.floor(Math.log2(heltz / 440) * 12) / 12);
};

const processSpeedMode = moment => {
  const distance = Math.sqrt((moment.x - lastMoment.x) ** 2 + (moment.y - lastMoment.y) ** 2) / 3;
  if (!isNaN(distance) && !(moment.x == 0 && moment.y == 0)) {
    distances.push(distance);
    distances.shift();
  }
  const totalDistance = distances.reduce((accumlator, currentValue) => accumlator + currentValue);
  const speed = totalDistance / distances.length;
  const heltz = fixHeltz(speed * 10 + 400); //speedが0-80の範囲で400Hz-1200Hzぐらいになるように調整
  document.querySelector(".speed").innerText = speed.toString();
  oscillator.frequency.value = heltz;
  document.querySelector(".heltz").innerText = heltz;
  drawScale(heltz);
};

const processAcceralationMode = moment => {
  const distance = Math.sqrt((moment.x - lastMoment.x) ** 2 + (moment.y - lastMoment.y) ** 2) / 3;
  if (!isNaN(distance) && !(moment.x == 0 && moment.y == 0)) {
    distances.push(distance);
    distances.shift();
  }
  const totalDistance = distances.reduce((accumlator, currentValue) => accumlator + currentValue);
  const speed = totalDistance / distances.length;
  let acceralation = speed - lastSpeed;
  if (acceralation < 0) acceralation *= -1;
  const heltz = fixHeltz(acceralation * 150 + 150); //fixheltzを通すと音程が補正される
  oscillator.frequency.value = heltz;
  document.querySelector(".speed").innerText = speed.toString();
  document.querySelector(".heltz").innerText = heltz;
  drawScale(heltz);
  lastSpeed = speed;
};

const processPositonMode = moment => {
  let soundnum = Math.floor((8 * moment.x) / width);
  if (soundnum == NaN) soundnum = 0;
  soundnum = Math.min(Math.max(Math.floor(soundnum), 0), 11);
  const sArr = [3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 20, 22, 24];
  const heltz = 440 * Math.pow(2, sArr[soundnum] / 12);
  if (!Number.isNaN(heltz)) {
    oscillator.frequency.value = heltz;
    const gain = 1 - moment.y / height > 0.5 ? 1 - moment.y / height : 0.1;
    gainNode.gain.setValueAtTime(gain, audioCtx.currentTime);
    document.querySelector(".heltz").innerText = heltz;
    drawScale(heltz);
  }
};

function processVideo() {
  try {
    vc.read(src);
  } catch (e) {
    window.location.reload();
  }
  const moment = getMomemnt(src);
  cv.circle(src, moment, 2, [255, 0, 0, 255]);
  cv.line(src, lastMoment, moment, [255, 0, 0, 255]);
  cv.imshow("canvasOutput", src);
  switch (soundMode) {
    case "speed":
      processSpeedMode(moment);
      break;
    case "acceralation":
      processAcceralationMode(moment);
      break;
    case "position":
      processPositonMode(moment);
      break;
    default:
  }
  lastMoment = moment;
  requestAnimationFrame(processVideo);
}

function stopVideoProcessing() {
  if (src != null && !src.isDeleted()) src.delete();
  if (dst != null && !dst.isDeleted()) dst.delete();
  if (dst2 != null && !dst2.isDeleted()) dst2.delete();
}
