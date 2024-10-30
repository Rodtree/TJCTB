const fs = require("fs");

function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function isCommand(message, callback) {
  if (message.startsWith("!")) {
    const words = message.substring(1).split(" ");

    const command = words[0];

    const combinedText = words.slice(1).join(" ");

    if (callback && typeof callback === "function") {
      callback(command, combinedText);
    }
    return true;
  } else {
    return false;
  }
}

function format(str, ...args) {
  return str.replace(/{(\d+)}/g, (match, index) => args[index] || "");
}

function secondsToMMSS(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(remainingSeconds).padStart(2, '0');
  return `${formattedMinutes}:${formattedSeconds}`;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
  }
  return array;
}

function cargarRangos() {
  const rangos = JSON.parse(fs.readFileSync("./json//rangos.json", "utf-8"));
  return rangos;
}

module.exports = { calculateDistance, isCommand, format, secondsToMMSS, shuffleArray, cargarRangos };
