const fs = require("fs");
const { actualizarGrupoJugador, obtenerRango, claimedPositions, gkClaimed } = require('./commandHandler');
const {handlePlayerLeave} = require('./afkHandler');
const { isPlayerBanned } = require("./utils");
const { playerAuthMap, recentlyLeftPlayers } = require('./utils'); // Importa desde utils.js
const Discord = require('./discord/discord');
let playerTimeTracker = {};


function obtenerRangoYActualizarGrupo(playerStats) {
  const xp = playerStats.xp;
  const nuevoRango = obtenerRango(xp);
  actualizarGrupoJugador(playerStats, nuevoRango);
  return nuevoRango;
}

function LoadPlayerHandler(room) {
  function moveToTeam(player) {
    let players = room.getPlayerList();

    let reds = players.filter((player) => player.team === 1).length;
    let blues = players.filter((player) => player.team === 2).length;

    room.setPlayerTeam(player.id, reds > blues ? 2 : 1);
  }


  room.onPlayerJoin = function (player) {
    console.log(`Jugador ${player.name} Auth ID: ${player.auth}`);
    if (player.auth) {
        playerAuthMap.set(player.id, player.auth);
    } else {
        console.log("Auth ID no disponible, posiblemente autenticación no habilitada.");
    }

    // Comprobamos si el jugador está baneado
    if (isPlayerBanned(player.auth)) {
        console.log(`El jugador ${player.name} (Auth: ${player.auth}) está en la lista de baneados. Expulsando...`);
        room.kickPlayer(player.id, "🤣🚫 Estás baneado 🚫🤣", false);
    } else {
        console.log(`El jugador ${player.name} ha ingresado.`);
    }

    // Reinicia el temporizador si el jugador estaba en recentlyLeftPlayers
    if (recentlyLeftPlayers.has(player.id)) {
        clearTimeout(recentlyLeftPlayers.get(player.id).timeoutId);
        recentlyLeftPlayers.delete(player.id); // Limpia de recentlyLeftPlayers ya que está en la sala
    }

    const startTime = Date.now();
    playerTimeTracker[player.name] = startTime;

    room.playerSetAuth(player.name, player.auth)

    room.verifyUserAuth(player);

    const group = room.playerGetGroup(player.name);

    if (group) {
      if (group.gameAdmin === true) {
        room.setPlayerAdmin(player.id, true)
      }
    }


// Busca el jugador en la base de datos
let existingPlayer = room.playersdb.find((x) => x.name === player.name);

if (existingPlayer) {
    // Verifica y agrega campos que falten con valores predeterminados
    existingPlayer.goals = existingPlayer.goals || 0;
    existingPlayer.counterGoals = existingPlayer.counterGoals || 0;
    existingPlayer.touches = existingPlayer.touches || 0;
    existingPlayer.group = existingPlayer.group || "Default";
    existingPlayer.games = existingPlayer.games || 0;
    existingPlayer.discordUser = existingPlayer.discordUser || "";
    existingPlayer.defeated = existingPlayer.defeated || 0;
    existingPlayer.victories = existingPlayer.victories || 0;
    existingPlayer.assistances = existingPlayer.assistances || 0;
    existingPlayer.mvp = existingPlayer.mvp || 0;
    existingPlayer.auth = existingPlayer.auth || "";
    existingPlayer.cleanSheets = existingPlayer.cleanSheets || 0;
    existingPlayer.xp = existingPlayer.xp || 0;
    existingPlayer.range = existingPlayer.range || "Ninguno";
    existingPlayer.timePlayed = existingPlayer.timePlayed || 0; // Asegúrate de inicializar el tiempo jugado aquí
} else {
    // Si el jugador no está en la base de datos, lo agrega
    room.playersdb.push({
        name: player.name,
        goals: 0,
        counterGoals: 0,
        touches: 0,
        group: "Default",
        games: 0,
        discordUser: "",
        defeated: 0,
        victories: 0,
        assistances: 0,
        mvp: 0,
        auth: "",
        cleanSheets: 0,
        xp: 0,
        range: "Ninguno",
        timePlayed: 0 // Asegúrate de inicializar el tiempo jugado aquí
    });
}

  

    // Cargar las estadísticas del jugador desde players.json
    const playerData = JSON.parse(fs.readFileSync("./json/players.json", "utf-8")).find(x => x.name === player.name);
    if (!playerData) {
      // Si no se encuentran estadísticas para el jugador, se asigna el grupo "Default"
      player.group = "Default";
    } else {
      // Si se encuentran estadísticas para el jugador, se usa el grupo especificado en las estadísticas
      player.group = playerData.group;
    }

    const rangosNoExpulsables = ['Fundador', 'Leviatán','Asistente', 'Mod', 'Admin', 'Ayudante', 'Vip', 'Tiburon de oro', 'Jefe de Staff', 'Programador'];

    const mensajesPorRango = {
      'Asistente': `✨ Desde las sombras emerge... 🌙\n🪐 ${player.name}, tan frío y distante como la propia luna.\n✨ Un silencio profundo lo acompaña, reflejando su enigma.\n🌌 Su presencia lo envuelve todo, como un eco en el vacío.`,
      'Fundador': `🔥 I am the Alpha and the Omega 🔥\n💀 The First and the Last 💀\n⚡ The Beginning ⚡\n🔥 And the End 🔥\n👑 Bow before me 👑\n💥 For I am ${player.name} 💥\n⚡ And my reign is eternal ⚡`,
      'Mod': `⚖️ Ni sí ni no... ⚖️\n🛡️ ¡Llega el mod ${player.name}! 🛡️\n⚖️ Te puede crucificar o dejarla pasar... ⚖️`,
      'Admin': `🌊 El admin ${player.name} nadó 🌊\nhacia el servidor porque ya enferma\n🤔 cómo están jugando. 🤔`,
      'Ayudante': `🛠️ ¡Hasta que entró a laburar! 🛠️\n👀 Cuidado con lo que hacen que ${player.name}\n🔧 quiere rascar ascenso. 🔧`,
      'Vip': `💰 ¿Quién le metería plata a un jueguito...? 💰\n🎉 ¡Así es, el VIP ${player.name}! 🎉`,
      'Tiburon de oro': `🐟 Denle la bienvenida al Tiburón de Oro! 🐟\n✨ Tanto por magia como por farmeo, ✨\naunque ${player.name} es más de la segunda. 🥇`,
      'Jefe de Staff': `💤 Levantaron al gordo ${player.name}  de la siesta... 💤\n🚀 Más les vale jugar a algo. 🚀`,
      'Programador': `💻 Si se pasan de wachín, los doxea. 💻\n🛠️ Así es, el programador ${player.name}. 🛠️`
    };
    
    
    const estilosPorRango = {
      'Asistente': {color: 0x0979B0, font: 'bold', sound: 2},
      'Fundador': { color: 0xF6DB77, font: 'bold', sound: 2 },         // Dorado
      'Mod': { color: 0xFF6961, font: 'italic', sound: 2 },            // Rojo
      'Admin': { color: 0x87CEEB, font: 'bold', sound: 2 },            // Azul
      'Ayudante': { color: 0x98FB98, font: 'italic', sound: 2 },       // Verde Claro
      'Vip': { color: 0x00CCBE, font: 'bold', sound: 2 },              // Cian
      'Tiburon de oro': { color: 0xFFCE1A, font: 'bold', sound: 2 },   // Naranja
      'Jefe de Staff': { color: 0xD496E4, font: 'bold', sound: 2 },    // Violeta
      'Programador': { color: 0xDBC4FE, font: 'italic', sound: 2 }     // Lila Claro
    };
    
    if (player.auth && room.getPlayerList().length >= 22 && !rangosNoExpulsables.includes(player.group)) {
      room.kickPlayer(player.id, 'Lo siento, la sala está llena.');
      room.sendAnnouncement('⚠️ Se ha expulsado a un jugador porque la sala está llena ⚠️', null, 0xFF0000, 'italic');
      return;
    }
    
    setTimeout(() => {
      if (rangosNoExpulsables.includes(player.group)) {
        const mensajePersonalizado = mensajesPorRango[player.group] || '🎉 ¡Bienvenido! Disfruta del juego.';
        const estilo = estilosPorRango[player.group] || { color: 0xFFFFFF, font: 'normal', sound: 0 };
        room.sendAnnouncement(mensajePersonalizado, null, estilo.color, estilo.font, estilo.sound);
      } else {
        room.sendAnnouncement(
          `╔════════════════════════════════════════════════════════════════════╗\n` + 
          `║                         🦈 ¡Bienvenido ${player.name} a Todos Juegan con Tiburón! 🦈                      ║\n` +
          `║                     ⚽ Revisa los comandos con !help y recuerda usar las posiciones ⚽           ║\n` +
          `║                                 🌊 ¡Diviértete y nada con los tiburones! 🌊                                              ║\n` +
          `╚════════════════════════════════════════════════════════════════════╝`,
          player.id,
          0x01C4BC,
          "bold",
          2
        );
      }
    }, 500);
    
    

    

    moveToTeam(player);

    const playerGroup = room.playerGetGroup(player.name)?.group;
    
    // Verificar si playerGroup tiene un valor antes de llamar a sendPlayerJoinMessage
    if (playerGroup) {
      // Llama a la función sendPlayerJoinMessage con el nombre y el grupo del jugador que sale del servidor
      Discord.sendPlayerJoinMessage(player.name, playerGroup);
    }


    const playerStats = room.getPlayerStats(player.name);
    if (playerStats) {
      if (playerStats.sancion && playerStats.sancion.includes("Baneado")) {
        room.kickPlayer(player.id, `🚫 Estás baneado del servidor: ${playerStats.sancion} 🚫`);
        room.sendAnnouncement(`🚫 ${player.name} intentó entrar pero está baneado: ${playerStats.sancion} 🚫`, null, 0xFF0000, "italic");
        return;
      }
    } else {
      console.log(`Error: No se encontraron estadísticas para el jugador ${player.name}`);
    }


    return false;


  };

  room.playerAddTouch = (name) => {
    if (room.getPlayerList().length > 8) {
      const foundPlayer = room.playersdb.find((x) => x.name === name);
      if (foundPlayer) {
        foundPlayer.touches += 1;
      }
    }
  };

  room.playerAddMvp = (name) => {
    if (room.getPlayerList().length > 0) { // Asegúrate de que haya suficientes jugadores
        const foundPlayer = room.playersdb.find((x) => x.name === name);
        if (foundPlayer) {
            foundPlayer.mvp += 1; // Asegúrate de que la propiedad 'mvp' exista
        } 
    } 
};


  room.playerAddGoal = (name) => {
    if (room.getPlayerList().length > 8) {
      const foundPlayer = room.playersdb.find((x) => x.name === name);
      if (foundPlayer) {
        foundPlayer.xp += 1;
        foundPlayer.goals += 1;
        obtenerRangoYActualizarGrupo(foundPlayer);
      }
    }
  };

  room.playerUnban = function (name) {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer && foundPlayer.sancion && foundPlayer.sancion.includes("Baneado")) {
      foundPlayer.sancion = null;
      room.sendAnnouncement(`${name} fue desbaneado.`, null, 0x00ff00);
    } else {
      room.sendAnnouncement("Ese jugador no está baneado.", player.id, 0xff0000);
    }
  };


  room.playerAddAssistance = (name) => {
    if (room.getPlayerList().length > 8) {
      const foundPlayer = room.playersdb.find((x) => x.name === name);
      if (foundPlayer) {
        foundPlayer.xp += 1;
        foundPlayer.assistances += 1;
        obtenerRangoYActualizarGrupo(foundPlayer);
      }
    }
  };

  room.playerAddCleanSheet = (name) => {
    const players = room.getPlayerList();
    if (players.length > 0) {
        const foundPlayer = room.playersdb.find((x) => x.name === name);
        if (foundPlayer) {
            foundPlayer.cleanSheets += 1;
            foundPlayer.xp += 14;
            obtenerRangoYActualizarGrupo(foundPlayer);
        } 
    }
};

room.playerAddHalfCleanSheet = (name) => {
    const players = room.getPlayerList();
    if (players.length > 0) {
        const foundPlayer = room.playersdb.find((x) => x.name === name);
        if (foundPlayer) {
            foundPlayer.cleanSheets += 0.5;
            foundPlayer.xp += 14;
            obtenerRangoYActualizarGrupo(foundPlayer);
        } 
    }
};

room.playerAddThirdCleanSheet = (name) => {
    const players = room.getPlayerList();
    if (players.length > 0) {
        const foundPlayer = room.playersdb.find((x) => x.name === name);
        if (foundPlayer) {
            foundPlayer.cleanSheets += 0.2;
            foundPlayer.xp += 14;
            obtenerRangoYActualizarGrupo(foundPlayer);
        } 
    }
};

  room.playerAddCounterGoal = (name) => {
    if (room.getPlayerList().length > 8) {
      const foundPlayer = room.playersdb.find((x) => x.name === name);
      if (foundPlayer) {
        foundPlayer.xp += -1;
        foundPlayer.counterGoals += 1; // Sumar solo en goles en contra
        obtenerRangoYActualizarGrupo(foundPlayer);
      }
    }
  };
  

  room.playerAddDefeat = (name) => {
    if (room.getPlayerList().length > 0) {
      const foundPlayer = room.playersdb.find((x) => x.name === name);
      if (foundPlayer) {
        foundPlayer.defeated += 1;
        foundPlayer.xp += -6;
        obtenerRangoYActualizarGrupo(foundPlayer);
      }
    }
  };

  room.playerAddAdvVerbal = (name, reason, author) => {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer) {
      foundPlayer.sancion = `Adv verbal de ${author} - Razón: ${reason}`;
      // Actualizar playerStats también, si es necesario
      const playerStats = room.getPlayerStats(name);
      if (playerStats) {
        playerStats.sancion = foundPlayer.sancion;
      }
    }
  };
  room.playerAddBan = (name, reason) => {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer) {
      foundPlayer.sancion = `Baneado: ${reason}`;
      // Actualizar playerStats también, si es necesario
      const playerStats = room.getPlayerStats(name);
      if (playerStats) {
        playerStats.sancion = foundPlayer.sancion;
      }
    }
  };

  room.playerAddKick = (name, reason, author) => {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer) {
      foundPlayer.sancion = `Kick 1/2 de ${author} - Razón: ${reason}`;
      // Actualizar playerStats también, si es necesario
      const playerStats = room.getPlayerStats(name);
      if (playerStats) {
        playerStats.sancion = foundPlayer.sancion;
      }
    }
  };

  room.playerAddVictory = (name) => {
    if (room.getPlayerList().length > 0) {
      const foundPlayer = room.playersdb.find((x) => x.name === name);
      if (foundPlayer) {
        foundPlayer.victories += 1;
        foundPlayer.xp += 10;
        obtenerRangoYActualizarGrupo(foundPlayer);
      }
    }
  };

  room.playerGetGroup = (name) => {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer) {
      let group = room.groups.find((x) => x.group === foundPlayer.group);
      return group;
    }
  };

  room.playerSetGroup = (name, group) => {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer) {
      foundPlayer.group = group;
    }
  };

  room.playerSetAuth = (name, auth) => {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer) {
      if (foundPlayer.auth == "") {
        foundPlayer.auth = auth;
      }
    }
  };

  room.verifyUserAuth = (player) => {
    const foundPlayer = room.playersdb.find((x) => x.name === player.name);

    if (foundPlayer) {
      if (foundPlayer !== "") {
        if (foundPlayer.discordUser === "") return;
        if (player.auth !== foundPlayer.auth) {
          room.kickPlayer(player.id, "Autenticación invalida");
        }
      }
    }
  };

  room.getPlayerStats = (name) => {
    const foundPlayer = room.playersdb.find((x) => x.name === name);
    if (foundPlayer) {
      return foundPlayer;
    }
  };

  room.onPlayerLeave = function (player) {
    if (playerAuthMap.has(player.id)) {
        const authId = playerAuthMap.get(player.id);

        // Agrega el authId a la lista temporal de recentlyLeftPlayers
        recentlyLeftPlayers.set(player.id, { auth: authId, name: player.name });

        // Crea un temporizador que eliminará el authId después de 2 minutos
        const timeoutId = setTimeout(() => {
            if (recentlyLeftPlayers.has(player.id)) { // Verifica si sigue en recentlyLeftPlayers
                recentlyLeftPlayers.delete(player.id); // Elimina de recentlyLeftPlayers después de 2 minutos
                playerAuthMap.delete(player.id); // También elimina del playerAuthMap
                console.log(`Auth ID de ${player.name} eliminado completamente después de 2 minutos.`);
            }
        }, 2 * 60 * 1000); // 2 minutos en milisegundos

        // Guardamos el ID del temporizador para poder cancelarlo más tarde
        recentlyLeftPlayers.get(player.id).timeoutId = timeoutId;
    }
    handlePlayerLeave(player);
    const playerGroup = room.playerGetGroup(player.name)?.group;

    if (playerGroup) {
        Discord.sendPlayerLeaveMessage(player.name, playerGroup);
    }

    // Colores en formato hexadecimal
    const colorRed = 0xFF0000; // Rojo
    const colorBlue = 0x0000FF; // Azul

    // Si el jugador era GK, liberamos su posición
    for (const team in gkClaimed) {
        if (gkClaimed[team] === player.name) {
            gkClaimed[team] = null;
            delete claimedPositions[player.name];
  
            // Asignar color basado en el equipo
            let color = team === "Red" ? colorRed : colorBlue;
  
            // Enviar mensaje con el color correspondiente
            room.sendAnnouncement(`${player.name} ha dejado de ser GK del equipo ${team}`, null, color);
            break;
        }
    }

    if (playerTimeTracker[player.name]) {
      const timeSpent = Math.floor((Date.now() - playerTimeTracker[player.name]) / 1000); // En segundos
      const foundPlayer = room.playersdb.find((x) => x.name === player.name);
      if (foundPlayer) {
          foundPlayer.timePlayed += timeSpent; // Suma el tiempo al total
      }
      delete playerTimeTracker[player.name]; // Elimina el temporizador para este jugador
    }

    // Otras lógicas que quieras agregar
};





  room.getPlayerObjectByName = (name) => {
    let players = room.getPlayerList();

    return players.find((x) => x.name === name);
  };

  room.getPlayerStatsByDiscord = function (name) {
    const foundPlayer = room.playersdb.find((x) => x.discordUser === name);

    return foundPlayer;
  };

  room.setUserDiscord = (discordName, gameName) => {
    const foundPlayer = room.playersdb.find((x) => x.name === gameName);
    if (foundPlayer) {
      foundPlayer.discordUser = discordName;
    }
  };
}

module.exports = {
  LoadPlayerHandler
};
