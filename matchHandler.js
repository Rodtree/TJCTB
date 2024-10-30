const fs = require("fs");
const { client } = require("./discord/discord");
const { secondsToMMSS, shuffleArray } = require("./utils");
const {currentTime} = require('./ballHandler');
const { resetPositionClaims, reiniciarPosiciones, gkClaimed, gks, resetPlayerSize } = require("./commandHandler");
const { getCurrentMapCoordinates, setCurrentMapCoordinates } = require('./sharedConfig');
var { powerDuration, powerColor, normalBallColor, powerSettings } = require('./ballHandler');
let {  lastPossessingTeam, lastPossessionTime  } = require('./ballHandler');


let teamRedScore = 0;
let teamBlueScore = 0;
let gameFinished = false;
let gamePaused = false;
let pauseTimer;






function LoadMatchHandler(room) {
 

  function generatePossessionEmojis(redPosesion, bluePosesion) {
    const totalPossession = redPosesion + bluePosesion;

    if (totalPossession === 0) {
        return "🔴🔴🔴🔴🔴🔵🔵🔵🔵🔵"; // Default cuando no hay posesión
    }

    const redPercentage = (redPosesion / totalPossession) * 100;
    const totalEmojis = 10;
    const redEmojis = Math.round((redPercentage / 100) * totalEmojis);
    const blueEmojis = totalEmojis - redEmojis;

    const redEmoji = "🔴";
    const blueEmoji = "🔵";

    return redEmoji.repeat(redEmojis) + blueEmoji.repeat(blueEmojis);
}

function formatPossessionPercentages(redPosesion, bluePosesion) {
    const totalPossession = redPosesion + bluePosesion;

    if (totalPossession === 0) {
        return "0% 🔴 - 🔵 0%"; // Default cuando no hay posesión
    }

    const redPercentage = (redPosesion / totalPossession) * 100;
    const bluePercentage = (bluePosesion / totalPossession) * 100;

    const possessionString = `${redPercentage.toFixed(1)}% 🔴 - 🔵 ${bluePercentage.toFixed(1)}%`;

    // Agregar espacios para centrar el porcentaje
    const totalLength = 20; // longitud total para centrar la cadena (puedes ajustarlo)
    const spacesBefore = Math.floor((totalLength - possessionString.length) / 2);
    const centeredPossessionString = ' '.repeat(spacesBefore) + possessionString;

    return centeredPossessionString;
}





function getMvpName() {
  try {
      let highestPlayer = room.mvpList.reduce((highest, current) => {
          return current.score > highest.score ? current : highest;
      });

      let playerName = highestPlayer.name.replace(/<:.+?:\d+>/g, "").trim(); // Eliminar emojis
      let player = room.getPlayerList().find(x => x.name === playerName);

    

      return player ? playerName : ""; // Solo retornamos el nombre
  } catch {
      console.error("Error al obtener el MVP sin emojis");
      return "";
  }
}

function getMvpWithEmojis() {
  try {
      let highestPlayer = room.mvpList.reduce((highest, current) => {
          return current.score > highest.score ? current : highest;
      });

      let playerName = highestPlayer.name; // Mantener el nombre original con emojis
      let player = room.getPlayerList().find(x => x.name === playerName);

      // Retornar el nombre del jugador con el emoji correspondiente
      return player ? `${player.team === 1 ? "🟥" : "🟦"} ${playerName}` : ""; 
  } catch {
      console.error("Error al obtener el MVP con emojis");
      return "";
  }
}


  function sendInsulto() {
    const randomIndex = Math.floor(Math.random() * room.insultos.length);
    room.sendAnnouncement(
      `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n   🎙️ 🧐 Relator: ${room.insultos[randomIndex]} \n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`,
      null,
      0xffff00
    );
  }

  room.resetGKPosition = function () {
    let coordinates = getCurrentMapCoordinates();
  
    if (gks.length === 0) {
      return;
    }
  
    gks.forEach(id => {
      const player = room.getPlayer(id);
  
      // Verificar si player es null antes de acceder a player.team
      if (player !== null) {
        const gkTeam = player.team;
  
        if (!coordinates.red || !coordinates.blue) {
          coordinates = {
            red: { x: -750, y: 0 },
            blue: { x: 750, y: 0 }
          };
        }
  
        if (gkTeam === 1) {
          room.setPlayerDiscProperties(id, { x: coordinates.red.x, y: coordinates.red.y });
        } else if (gkTeam === 2) {
          room.setPlayerDiscProperties(id, { x: coordinates.blue.x, y: coordinates.blue.y });
        }
      }
    });
  };
  

  function handlePause() {
    setTimeout(() => {
      if (!gamePaused && !gameFinished) {
        room.pauseGame(true);
        gamePaused = true;
      }
    }, 3000);

    pauseTimer = setTimeout(() => {
      if (!gameFinished) {
        room.pauseGame(false);
        gamePaused = false;

        setTimeout(() => {
          room.resetGKPosition();
        }, 3000);
      }
    }, 7000);
  }

  function updatePowerState() {
    const currentTime = Date.now();
    const elapsed = currentTime - powerSettings.powerStartTime;
    if (powerSettings.powerApplied) {
      const player = room.getPlayer(powerSettings.powerPlayerId);
      if (player && isPlayerTouchingBall(player) && elapsed >= powerDuration) {
        powerInit();
      } else if (!player || !isPlayerTouchingBall(player)) {
        room.setDiscProperties(0, { color: normalBallColor });
        powerSettings.powerApplied = false;
        powerSettings.powerPlayerId = null;
        powerSettings.powerForUse = false;
      }
    } else {
      const players = room.getPlayerList();
      players.forEach(player => {
        const isTouching = isPlayerTouchingBall(player)
        if (isTouching && !(powerSettings.powerPlayerId == player.id)) {
          powerSettings.powerApplied = true;
          powerSettings.powerStartTime = Date.now();
          powerSettings.powerPlayerId = player.id;
        }
      });
    }
  }

  function cambiarCoordenadasSegunJugadores(room) {
    const jugadores = room.getPlayerList().length;

    try {
        if (jugadores > 19) {
            setCurrentMapCoordinates('x11');
        } else if (jugadores > 13) {
            setCurrentMapCoordinates('x7');
        } else if (jugadores > 0) {
            setCurrentMapCoordinates('x5');
        }
    } catch (error) {
        console.error("Error iniciando coordenadas del gk:", error);
    }
}

  function powerInit() {
    room.setDiscProperties(0, { color: powerColor });
    powerSettings.powerForUse = true;
  }

  function isPlayerTouchingBall(player) {
    if (!player || !player.position) {
      return false;
    }

    const ballProperties = room.getDiscProperties(0);
    if (!ballProperties) {
      console.error("BallProperties is null or undefined");
      return false;
    }

    const dx = ballProperties.x - player.position.x;
    const dy = ballProperties.y - player.position.y;
    const distanceSquared = dx * dx + dy * dy;
    const radiusSum = 45;

    return distanceSquared < radiusSum * radiusSum;
  }


  room.onGameTick = function () {
    if (room.lastTouched === 1) {
      room.redPosesion = (room.redPosesion || 0) + 1;
    } else if (room.lastTouched === 2) {
      room.bluePosesion = (room.bluePosesion || 0) + 1;
    }
    
    if (powerSettings.isPowerActive) {
      updatePowerState();
    }

    
};


  room.onGameStart = function () {
    cambiarCoordenadasSegunJugadores(room);
    powerSettings.powerStartTime = Date.now();
    room.redPosesion = 0; // Tiempo de posesión del equipo rojo en milisegundos
    room.bluePosesion = 0; // Tiempo de posesión del equipo azul en milisegundos
    room.startTime = Date.now(); // Al iniciar el partido
    room.setDiscProperties(0, { color: normalBallColor });
    room.startRecord();
    room.sendAnnouncement("¡La grabación del partido ha comenzado!", null, 0x00ff00);

    room.redPosesion = 0;
    room.bluePosesion = 0;
    room.lastPlayerPossession = "";
    room.previousTouch = "";
    room.lastPlayerTouchTimes = {}; // Para almacenar los tiempos de los últimos toques
    room.previousTouchId = null; // Para rastrear el ID del jugador que hizo el último toque
    room.goalListRed = []; // Reiniciar lista de goles del equipo rojo
    room.goalListBlue = []; // Reiniciar lista de goles del equipo azul
    teamRedScore = 0; // Reiniciar marcador del equipo rojo
    teamBlueScore = 0; // Reiniciar marcador del equipo azul

    room.goalList = [];
    room.redScore = 0;
    room.blueScore = 0;

    room.mvpList = [];
    resetPlayerSize(room);
    gameFinished = false;
  };

  room.onPositionsReset = function () {
    room.resetGKPosition();
    resetPlayerSize(room);
  };

  setInterval(() => {
    powerSettings.powerStartTime += 1000;
  }, 2000);

  room.onTeamVictory = function (scores) {
    clearTimeout(pauseTimer);
    gameFinished = true;

    const mvpPlayerName = getMvpName(); // Obtén el MVP sin emojis

    if (mvpPlayerName) {
        room.playerAddMvp(mvpPlayerName); // Aquí usamos el nombre limpio
    }

    const mvpPlayerNameWithEmojis = getMvpWithEmojis(); // Obtén el MVP con emojis

    let players = room.getPlayerList();
    let victoryTeam = scores.red > scores.blue ? 1 : 2;

    teamRedScore = scores.red;
    teamBlueScore = scores.blue;

    for (let x = 0; x < players.length; x++) {
        if (players[x].team === victoryTeam) {
            room.playerAddVictory(players[x].name);
        } else {
            room.playerAddDefeat(players[x].name);
        }
    }

    // Usar los nombres de los porteros reclamados, si existen
    const redGKDisplayName = gkClaimed.red ? gkClaimed.red : "No asignado";  
    const blueGKDisplayName = gkClaimed.blue ? gkClaimed.blue : "No asignado";  

    const emojiLine = generatePossessionEmojis(room.redPosesion || 0, room.bluePosesion || 0);
    const possessionLine = formatPossessionPercentages(room.redPosesion || 0, room.bluePosesion || 0);
    
    const embed = {
        color: 0x2aff00,
        title: "🏆 ¡Partido Finalizado! 🏆",
        description: `🩸🦈 Todos Juegan Con Tiburón 🦈🩸`,
        fields: [
          {
            name: " ",
            value: '<:emoji_24:1285417320122159185>'.repeat(26),
            inline: false,
          },
            {
                name: "⚽ Resumen del Partido",
                value: `\`\`\`
🔴 Goles del Equipo Rojo:
${room.goalListRed.length > 0 ? room.goalListRed.map(goal => `  - ${goal}`).join("\n") : "No se registraron goles."}

🔵 Goles del Equipo Azul:
${room.goalListBlue.length > 0 ? room.goalListBlue.map(goal => `  - ${goal}`).join("\n") : "No se registraron goles."}

                    🔴 Resultado 🔵
                         ${teamRedScore} - ${teamBlueScore}
      
                     📊 Posesión 📊
                   ${emojiLine}
                  ${possessionLine}
      \`\`\``,
                inline: false,
            },
            {
                name: "🥇 MVP",
                value: `${mvpPlayerNameWithEmojis || "No se ha determinado el MVP."}`, // Con emojis para el anuncio
                inline: false,
            },
            {
                name: "🧤 Porteros",
                value: `🔴 Rojo: ${redGKDisplayName || "No asignado"}\n🔵 Azul: ${blueGKDisplayName || "No asignado"}`,
                inline: false,
            }
        ],
        footer: {
            text: "¡Gracias por jugar! 🥳",
        },
        timestamp: new Date(),
    };

    const channel = client.channels.cache.get(room.config.discord_channels.games);
    if (channel) {
        channel.send({ embeds: [embed] });
    }

    room.sendAnnouncement(
        `📃 Resumen de Partido\n` +
        `───────────────\n` +
        `⚽ Goles: 🔴 ${scores.red} - ${scores.blue} 🔵\n` +
        `📊 Posesión: ${generatePossessionEmojis(room.redPosesion, room.bluePosesion)}\n` +
        `🥇 MVP: ${mvpPlayerNameWithEmojis || "No se ha determinado el MVP."}\n` +
        `───────────────\n` +
        `¡Gracias por jugar! 🥳`,
        null,
        0xfffb00,
        "bold"
    );

    sendInsulto();
};



room.onGameStop = function () {
  const currentTime = Date.now();
  gameFinished = true;
  clearTimeout(pauseTimer);
  room.stopRecord();
  room.sendAnnouncement("✉️ Rect enviada a Discord!", null, 0x00ff00, "bold");

  

  if (lastPossessingTeam !== null) {
      const possessionDuration = currentTime - lastPossessionTime;
      if (lastPossessingTeam === 1) {
          room.redPosesion += possessionDuration;
      } else if (lastPossessingTeam === 2) {
          room.bluePosesion += possessionDuration;
      }
  }

  let players = room.getPlayerList().filter(p => p.team !== 0); // Filtra solo los jugadores que están en equipos, no en espectadores

  function increaseCleanSheet(room, score, team, gkClaimed) {
    // Cambiar el equipo a minúsculas para que coincida con la estructura de gkClaimed
    const teamName = team.toLowerCase();  
    const teamColor = teamName === "red" ? { name: "rojo", color: 0xFF6961 } : { name: "azul", color: 0xC7F5F5 };

    if (gkClaimed[teamName]) {  // Verifica si hay un GK asignado para el equipo
        switch (score) {
            case 0:
                room.playerAddCleanSheet(gkClaimed[teamName]);  // Incrementa el clean sheet completo
                break;
            case 1:
                room.playerAddHalfCleanSheet(gkClaimed[teamName]);  // Incrementa el half clean sheet
                break;
            case 2:
                room.playerAddThirdCleanSheet(gkClaimed[teamName]);  // Incrementa el third clean sheet
                break;
            default:
                room.sendAnnouncement(
                    `🚫 No le dio la polenta a ${gkClaimed[teamName]} para la valla invicta! 🥴`,
                    null,
                    teamColor.color,
                    "bold",
                    2
                );
        }
    } 
}

  



  increaseCleanSheet(room, teamBlueScore, "Red", gkClaimed);
  increaseCleanSheet(room, teamRedScore, "Blue", gkClaimed);

  // Actualizar estadísticas de jugadores
  for (let x = 0; x < players.length; x++) {
      const foundPlayer = room.playersdb.find((player) => player.name === players[x].name);
      if (foundPlayer) {
          foundPlayer.games += 1;
      }
  }

  // Guardar en JSON
  try {
      fs.writeFileSync("./json/players.json", JSON.stringify(room.playersdb));
  } catch (error) {
      console.error("Error escribiendo en el archivo players.json:", error);
  }

  // Limpiar gks y posiciones
  gks.length = 0;
  resetPositionClaims();
  reiniciarPosiciones();
  lastPossessingTeam = null;
  lastPossessionTime = 0;

  // Reorganizar solo a los jugadores activos (sin espectadores)
  let teamRed = [];
  let teamBlue = [];

  // Barajar jugadores
  players.sort(() => Math.random() - 0.5);

  // Distribuir jugadores en los equipos
  for (let i = 0; i < players.length; i++) {
      if (i % 2 === 0) {
          teamRed.push(players[i]);
      } else {
          teamBlue.push(players[i]);
      }
  }

  // Asignar jugadores a sus nuevos equipos
  teamRed.forEach(player => room.setPlayerTeam(player.id, 1));  // Equipo Rojo
  teamBlue.forEach(player => room.setPlayerTeam(player.id, 2)); // Equipo Azul

  // Reiniciar el juego después de 3 segundos
  setTimeout(() => {
      room.startGame();
  }, 3000);
};




room.goalListRed = room.goalListRed || []; // Lista para goles del equipo rojo
room.goalListBlue = room.goalListBlue || []; // Lista para goles del equipo azul

room.onTeamGoal = function (teamId) {
  if (!room.lastPlayerPossessionId) {
    return;
  }

  let player = room.getPlayer(room.lastPlayerPossessionId);

  if (!player) {
    return;
  }

  let isOwnGoal = player.team !== teamId;

  // Actualizar los puntajes
  if (teamId === 1) {  // Equipo Rojo
    room.redScore++;
  } else {  // Equipo Azul
    room.blueScore++;
  }

  const scores = room.getScores(); // Obtenemos el estado del marcador
  const timeInSeconds = scores.time; // Tiempo en segundos desde que comenzó el partido
  const formattedTime = formatTime(timeInSeconds); // Formatear el tiempo

  let goalMessage = '';

  if (isOwnGoal) {
    room.playerAddCounterGoal(player.name);
    goalMessage = `⚽ Gol en Contra: ${player.name} - ${formattedTime}`;
  } else {
    room.playerAddGoal(player.name);
    goalMessage = `⚽ Gol: ${player.name} - ${formattedTime}`;

    // Manejo de asistencias
    if (room.previousTouch && room.previousTouch !== room.lastPlayerPossession) {
      room.playerAddAssistance(room.previousTouch); // Añadir asistencia
      goalMessage += ` (Asistencia: ${room.previousTouch})`;
    } else {
      goalMessage += ` (Sin Asistencia)`;
    }
  }

  // Guardar el gol en la lista del equipo correspondiente
  if (teamId === 1) {
    room.goalListRed.push(isOwnGoal ? `⚠️ ${goalMessage}` : goalMessage);  // Equipo Rojo
  } else {
    room.goalListBlue.push(isOwnGoal ? `⚠️ ${goalMessage}` : goalMessage);  // Equipo Azul
  }

  room.addScoreMvp(player.name, 10);

  // Enviar el anuncio del gol
  const assistanceMessage = (!isOwnGoal && room.previousTouch && room.previousTouch !== player.name)
    ? `👋 Asistencia: ${room.previousTouch}`
    : "";

  const message = `[⚽] Gol: ${player.name} ${isOwnGoal ? "(Gol en Contra ⚠️)" : ""} ${assistanceMessage} - ${formattedTime}`;

  // Calcular la longitud aproximada de caracteres visibles
  const cleanMessage = message.replace(/ +/g, ' ').trim();  // Reemplaza múltiples espacios por uno solo y recorta
  const getVisualLength = (str) => {
    return Array.from(str).reduce((acc, char) => {
      // Considerar diferentes anchos según el carácter
      if (/[\u{1D400}-\u{1D7FF}]/u.test(char)) {
        return acc + 1.5; // Ajuste para caracteres estilizados (𝓐, etc.)
      } else if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}]/u.test(char)) {
        return acc + 2; // Ajuste para emojis y otros símbolos
      } else if (char.charCodeAt(0) > 0xFF) {
        return acc + 2; // Ajuste para caracteres Unicode de doble ancho
      } else {
        return acc + 1; // Caracteres normales, incluidos números y letras simples
      }
    }, 0);
  };

  // Restar 6 para ajustar el ancho de las barras de los bordes.
  const borderLength = Math.max(1, Math.ceil(getVisualLength(cleanMessage)) - 6);
  const topBorder = `┏${'━'.repeat(borderLength)}┓`;  // Generamos la línea superior
  const bottomBorder = `┗${'━'.repeat(borderLength)}┛`;  // Generamos la línea inferior

  room.sendAnnouncement(
    `${topBorder}\n${cleanMessage}\n${bottomBorder}`,
    null,
    teamId === 1 ? 0xf8312f : 0x0074ba,
    "bold"
  );

  // Limpiar posesiones y asistencias
  room.lastPlayerPossession = "";
  room.previousTouch = "";
  room.lastPlayerPossessionId = null;
  room.previousTouchId = null;
};












// Función para formatear el tiempo
function formatTime(seconds) {
  const totalSeconds = Math.floor(seconds); // Redondear hacia abajo
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; // Formato MM:SS
}

  room.addScoreMvp = function (name, add) {
    let scorePlayer = room.mvpList.find((x) => x.name === name);
    if (scorePlayer) {
      scorePlayer.score += add;
    } else {
      room.mvpList.push({ name: name, score: add });
    }
  };

  room.reorganizePlayers = () => {
    let players = shuffleArray(room.getPlayerList());

    for (let i = 0; i < players.length; i++) {
      room.setPlayerTeam(players[i].id, i % 2 + 1);
    };
  }
};

module.exports = { LoadMatchHandler };