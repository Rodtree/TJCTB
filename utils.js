const fs = require('fs');
const path = require('path');
const bannedPlayersFile = path.join(__dirname, 'json', 'bannedPlayers.json');
const playerAuthMap = new Map();
const recentlyLeftPlayers = new Map();
let bannedPlayers = [];

function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

const predefinedColors = {
  "Vip Eternal": ["#FFE4E1", "#B0C2F2", "#BC98F3", "#B186F1"],
  "Vip Mensual": ["#B2E2F2", "#A2C8CC", "#C3F9EA", "#6A9EDA"]  
};


const colorChoices = Object.entries(predefinedColors).flatMap(([category, colors]) => 
  colors.map(color => ({ name: `${category} - ${color}`, value: color }))
);

function unbanPlayer(playerName) {
  loadBannedPlayers(); // Cargar la lista de baneados desde el JSON

  // Filtrar la lista para eliminar el jugador
  const initialLength = bannedPlayers.length;
  bannedPlayers = bannedPlayers.filter(banned => banned.name !== playerName);

  // Guardar la lista actualizada
  saveBannedPlayers();

  if (bannedPlayers.length < initialLength) {
      console.log(`Jugador ${playerName} ha sido desbaneado.`);
  } else {
      console.log(`El jugador ${playerName} no estaba en la lista de baneados.`);
  }
}

function loadBannedPlayers() {
  try {
    const data = fs.readFileSync(bannedPlayersFile, 'utf8');
    bannedPlayers = JSON.parse(data);
    console.log(`Lista de baneados cargada. Jugadores baneados: ${bannedPlayers.length}`);
  } catch (err) {
    bannedPlayers = [];
    console.log("No se encontró un archivo de baneados. Iniciando con lista vacía.");
  }
}

function saveBannedPlayers() {
  fs.writeFileSync(bannedPlayersFile, JSON.stringify(bannedPlayers, null, 2));
  console.log("Lista de baneados guardada correctamente.");
}

function addBannedPlayer(player, reason) {
  if (!player.auth) {
    console.log(`Error: Intento de banear a ${player.name} sin Auth ID. Ban cancelado.`);
    return;
  }

  const playerData = {
    auth: player.auth,
    name: player.name,
    reason,
    date: new Date().toISOString()
  };

  bannedPlayers.push(playerData);
  console.log(`Jugador baneado: ${player.name} (Auth: ${player.auth})`);
  saveBannedPlayers();
}



function isPlayerBanned(auth) {
  return bannedPlayers.some(banned => banned.auth === auth);
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

module.exports = { calculateDistance, colorChoices, predefinedColors, isCommand, format, secondsToMMSS, unbanPlayer, playerAuthMap, shuffleArray, cargarRangos, isPlayerBanned, addBannedPlayer, loadBannedPlayers, recentlyLeftPlayers, saveBannedPlayers, bannedPlayers };
