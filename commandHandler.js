const { isCommand } = require("./utils");
const { DateTime } = require('luxon');
const fs = require("fs");
const { sendBanAnnouncementToDiscord, sendGeneralCommandToDiscord, client, LoadDiscordHandler } = require("./discord/discord");
const { cargarRangos } = require("./utils");
const { getCurrentMapCoordinates, setCurrentMapCoordinates } = require('./sharedConfig');
const gkClaimed = { red: null, blue: null };
const claimedPositions = {};
const colorRed = 0xFF9688; // Rojo
const colorBlue = 0xC4DAFA; // Azul
const despedidas = JSON.parse(fs.readFileSync('./json/despedidas.json', 'utf8'));
const commandCooldowns = {};
const gks = [];

const mapaContent = {
    x11red: { 1: -1050, 2: 0 },
    x7red: { 1: -1000, 2: 0 },
    x5red: { 1: -750, 2: 0 },
    x11blue: { 1: 1050, 2: 0 },
    x7blue: { 1: 1000, 2: 0 },
    x5blue: { 1: 750, 2: 0 }
}
let { powerSettings, togglePowerActive } = require('./ballHandler')
let formacionRed = [];
let formacionBlue = [];
let playerSizes = {};
let afkPlayers = {}; // Objeto para guardar los jugadores AFK y su equipo original.
let afkcooldowns = {};
let afkTimers = {};  // Objeto para manejar el tiempo que un jugador puede estar AFK.


function setPlayerSize(room, playerID, size) {
    room.setPlayerDiscProperties(playerID, { radius: size });
}


function resetPlayerSize(room) {
    for (const playerID in playerSizes) {
        setPlayerSize(room, playerID, playerSizes[playerID]);
    }
}

function getRandomDespedida() {
    const randomIndex = Math.floor(Math.random() * despedidas.length);
    return despedidas[randomIndex];
}

function LoadCommandHandler(room, command) {
    room.getPlayerByName = function (name) {
        const player = room.getPlayerList().find((x) => x.name === name);
        return player ? player.id : -1;
    };

    room.onPlayerCommand = function (player, command, args) {
        const playerStats = room.getPlayerStats(player.name);
    
        // Si el jugador no está verificado (sin Discord vinculado)
        if (!playerStats || !playerStats.discordUser || playerStats.discordUser.trim() === "") {
            // Permitir solo los comandos !discord y !verify
            if (command !== "discord" && command !== "verify" && command !== "afk") {
                room.sendAnnouncement("Debes vincular tu cuenta de Discord antes de usar otros comandos. Usa !verify [TuNombreEnDiscord]", player.id, 0xFF0000, "bold");
                return;
            }
        }
    
        const group = room.playerGetGroup(player.name);
    
        // Verificación de permisos para el resto de los comandos
        if (!group || !group.commands.includes(command)) {
            room.sendAnnouncement("No tienes permisos para este comando", player.id, 0xff0000, "bold");
            return;
        }
    
        const staffCooldowntime = 30000;
    
        const now = Date.now();
        if (command === "staff") {
            if (!commandCooldowns[player.name]) {
                commandCooldowns[player.name] = {};
            }
    
            if (commandCooldowns[player.name][command] && now - commandCooldowns[player.name][command] < staffCooldowntime) {
                room.sendAnnouncement(`${player.name}, debes esperar antes de usar el comando ${command} nuevamente.`, player.id, 0xFF0000);
                return;
            }
            commandCooldowns[player.name][command] = now;
        }
    
        // Lógica de los comandos
        switch (command) {
            case "power":
                sendGeneralCommandToDiscord("Power", player.name);
                handlePowerCommand(room, player);
                break;
            case "discord":
                sendGeneralCommandToDiscord("discord", player.name);
                room.sendAnnouncement(`🦈🩸Discord: ${room.config.discord_link}🩸🦈`, null, 0x00FFFF, "bold", 2);
                break;
            case "staff":
                const reason = args.trim();
                if (reason.length < 3) {
                  room.sendAnnouncement(`Error: La razón debe tener al menos 3 caracteres. Ejemplo: !staff <razón>`, player.id, 0xFF0000, "bold");
                  return;
                }
                sendGeneralCommandToDiscord("staff", player.name, reason);
                handleStaffCommand(room, player, reason);
                break;
            case "afk":
                sendGeneralCommandToDiscord("afk", player.name);
                handleAfkCommand(room, player, args);
                break;
            case "gk":
                sendGeneralCommandToDiscord("gk", player.name);
                handleGKCommand(room, player, args);
                break;
            case "nv":
            case "bb":
                sendGeneralCommandToDiscord("nvbb", player.name);
                const despedida = getRandomDespedida().replace("[name]", player.name);
                room.kickPlayer(player.id, despedida, false);
                break;
            case "unban":
                sendGeneralCommandToDiscord("unban", player.name);
                handleUnbanCommand(room, player, args);
                break;
            case "adv":
                sendGeneralCommandToDiscord("adv", player.name);
                handleAdvCommand(room, player, args);
                break;
            case "kick":
                sendGeneralCommandToDiscord("kick", player.name);
                handleKickCommand(room, player, args);
                break;
            case "ban":
                sendGeneralCommandToDiscord("ban", player.name);
                handleBanCommand(room, player, args);
                break;
            case "changemap":
                sendGeneralCommandToDiscord("changemap", player.name);
                handleChangeMapCommand(room, player, args);
                break;
            case "verify":
                sendGeneralCommandToDiscord("verify", player.name);
                room.verifyDiscord(args, player);
                break;
            case "unsanc":
                sendGeneralCommandToDiscord("unsanc", player.name);
                handleUnSancCommand(room, player, args);
                break;
            case "me":
            case "stats":
                sendGeneralCommandToDiscord("me", player.name);
                handleMeCommand(room, player, args);
                break;
            case "help":
                sendGeneralCommandToDiscord("help", player.name);
                handleHelpCommand(room, player, args);
                break;     
            case "rangos":
                sendGeneralCommandToDiscord("rangos", player.name);
                handleRangosCommand(room, player, args);
                break;           
            case "size":
                sendGeneralCommandToDiscord("size", player.name);
                handleSizeCommand(room, player, args);
                break;
            default:
                room.sendAnnouncement("Comando no reconocido", player.id, 0xFF0000);
                break;
        }
    };
    
}
function handleRangosCommand(room, player, args) {
    const rangos = [
        { 
            rango: "Axolote",
            niveles: [
                {nivel: "III", limite: 50},
                {nivel: "II", limite: 85},
                {nivel: "I", limite: 120}
            ]
        },
        {
            rango: "Caballito de Mar",
            niveles: [
                {nivel: "III", limite: 170},
                {nivel: "II", limite: 225},
                {nivel: "I", limite: 285}
            ]
        },
        {
            rango: "Mantarraya",
            niveles: [
                {nivel: "III", limite: 350},
                {nivel: "II", limite: 420},
                {nivel: "I", limite: 500}
            ]
        },
        {
            rango: "Tiburón Ballena",
            niveles: [
                {nivel: "III", limite: 580},
                {nivel: "II", limite: 660},
                {nivel: "I", limite: 740}
            ]
        },
        {
            rango: "Megalodón",
            niveles: [
                {nivel: "III", limite: 820},
                {nivel: "II", limite: 900},
                {nivel: "I", limite: 1000}
            ]
        },
        {
            rango: "Escila",
            niveles: [
                {nivel: "III", limite: 1125},
                {nivel: "II", limite: 1250},
                {nivel: "I", limite: 1400}
            ]
        },
        {
            rango: "Kraken",
            niveles: [
                {nivel: "III", limite: 1600},
                {nivel: "II", limite: 1800},
                {nivel: "I", limite: 2000}
            ]
        }
    ];

    let rangoMessage = `🦈🩸 Lista de Rangos y Niveles 🩸🦈\n═══════════════════════════════\n`;

    rangos.forEach(rango => {
        rangoMessage += `🐟 ${rango.rango}\n`;
        rango.niveles.forEach(nivel => {
            rangoMessage += `   Nivel ${nivel.nivel}: ${nivel.limite} XP\n`;
        });
        rangoMessage += `═══════════════════════════════\n`;
    });

    // Agregamos la sección de Leviatán
    rangoMessage += `🐙 Leviatán\n`;
    rangoMessage += `   🔥 Supera los 2000 XP y accede a Leviatán, con los mismos beneficios que los VIPs 🔥\n`;
    rangoMessage += `═══════════════════════════════\n`;
    rangoMessage += `⚽ ¡Sigue progresando para alcanzar el siguiente rango!`;

    room.sendAnnouncement(rangoMessage, player.id, 0x00B7AB, "bold", 2);
}



function handleHelpCommand(room, player, args) {
    const playerStats = room.getPlayerStats(args === "" ? player.name : args);

    const userCommands = [
        "• !nv / !bb - Despedirse y salir del juego",
        "• !afk - Marcarse como ausente",
        "• !rangos - Muestra la lista de rangos junto con la xp necesaria",
        "• !discord - Obtener el enlace del servidor de Discord",
        "• !stats / !me - Ver tus estadísticas personales",
        "• !gk - Convertirte en arquero",
        "• !verify [TuNombreEnDiscord] - Verificar tu cuenta de Discord",
        "• !staff [Razón] - Solicitar ayuda de un administrador"
    ];

    const vipCommands = [
        "• !size - Cambiar el tamaño propio (10-20)"
    ];

    const staffCommands = [
        "• !power - Activar/desactivar el power",
        "• !unban [Jugador] - Desbanear a un jugador",
        "• !unsanc [Jugador] - Eliminar sanción de un jugador",
        "• !changemap [Mapa] - Cambiar el mapa actual",
        "• !adv [Jugador] Razón - Advertir a un jugador",
        "• !kick [Jugador] Razón - Expulsar a un jugador",
        "• !ban [Jugador] Razón - Banear a un jugador"
    ];

    const vipGroups = ['Vip', 'Tiburon de oro'];
    const staffGroups = ['Fundador', 'Asistente', 'Mod', 'Admin', 'Ayudante', 'Jefe de Staff', 'Programador'];

    let helpMessage = `🦈🩸 Comandos Disponibles 🩸🦈\n═══════════════════════════════\n`;

    // Comandos para usuarios normales
    helpMessage += `👤 Comandos de Usuario\n`;
    helpMessage += userCommands.join("\n") + "\n";

    // Comandos adicionales para VIPs
    if (vipGroups.includes(playerStats.group) || staffGroups.includes(playerStats.group)) {
        helpMessage += `═══════════════════════════════\n💎 Comandos de VIP\n`;
        helpMessage += vipCommands.join("\n") + "\n";
    }

    // Comandos adicionales para Staff
    if (staffGroups.includes(playerStats.group)) {
        helpMessage += `═══════════════════════════════\n🛠️ Comandos de Staff\n`;
        helpMessage += staffCommands.join("\n") + "\n";
    }

    helpMessage += `═══════════════════════════════\n⚽ ¡Sigue dándolo todo en la cancha!`;

    room.sendAnnouncement(helpMessage, player.id, 0x00B7AB, "bold", 2);
}





function handleAfkCommand(room, player, args) {
    const afkTeam = 0; // Equipo AFK (puedes ajustar esto según tu configuración).
    const currentTime = Date.now();
    
    // Obtener las estadísticas del jugador
    const playerStats = room.getPlayerStats(player.name);
    if (!playerStats) {
        room.sendAnnouncement("Jugador no encontrado", player.id, 0xff0000);
        return;
    }

    // Verificar si el jugador está en cooldown
    if (afkcooldowns[player.id] && currentTime - afkcooldowns[player.id] < 10000) {
        const timeLeft = Math.ceil((10000 - (currentTime - afkcooldowns[player.id])) / 1000);
        room.sendAnnouncement(`⏳ | @${player.name}, debes esperar ${timeLeft} segundos para usar el comando de nuevo.`, player.id, 0xFFA500, "bold", 2);
        return;
    }

    // Verificar si el jugador ya está AFK
    if (afkPlayers[player.id]) {
        // Mover al jugador de vuelta a su equipo original
        clearTimeout(afkTimers[player.id]); // Cancelar el temporizador AFK
        room.setPlayerTeam(player.id, afkPlayers[player.id].previousTeam);
        room.sendAnnouncement(`✅ | @${player.name} ha vuelto a su equipo. ¡Bienvenido de vuelta! 🎉`, player.id, 0x00FF00, "bold", 2);
        
        // Eliminarlo del objeto afkPlayers y el temporizador
        delete afkPlayers[player.id];
        delete afkTimers[player.id];
    } else {
        // Guardar el equipo original del jugador
        afkPlayers[player.id] = {
            previousTeam: player.team // Guardar el equipo actual
        };

        // Mover al jugador al equipo AFK
        room.setPlayerTeam(player.id, afkTeam);
        room.sendAnnouncement(`💤 | @${player.name} está ahora AFK. ¡Nos vemos pronto!`, player.id, 0x0000FF, "bold", 2);

        // Asignar tiempos AFK según su grupo
        let afkTimeLimit;
        if (playerStats.group === "Vip") {
            afkTimeLimit = 6 * 60 * 1000; // 6 minutos para VIP
            room.sendAnnouncement(`⭐ | @${player.name}, tienes 6 minutos para estar AFK.`, player.id, 0xFFD700, "bold", 2);
        } else {
            afkTimeLimit = 2 * 60 * 1000; // 2 minutos para los demás
            room.sendAnnouncement(`⏲️ | @${player.name}, tienes 2 minutos para estar AFK.`, player.id, 0xFF4500, "bold", 2);
        }

        // Establecer temporizador para kickear al jugador cuando se acabe su tiempo AFK
        afkTimers[player.id] = setTimeout(() => {
            room.kickPlayer(player.id, "Se acabó tu tiempo AFK", false); // Expulsar al jugador
            room.sendAnnouncement(`⚠️ | @${player.name}, tu tiempo AFK ha terminado y has sido expulsado.`, null, 0xFF0000, "bold", 2);
            delete afkPlayers[player.id];
        }, afkTimeLimit);
    }

    // Establecer cooldown
    afkcooldowns[player.id] = currentTime;
}

function handleStaffCommand(room, player) {
    room.sendAnnouncement(
        `${player.name} Has solicitado la ayuda de un administrador. Por favor, aguarde unos instantes.`, player.id, 0xDBC4FE, "bold");
}

function getCurrentDate(timezone = 'America/Argentina/Buenos_Aires') {
    return DateTime.now().setZone(timezone).setLocale('es').toLocaleString({
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    });
}

function handlePowerCommand(room, player) {
    togglePowerActive();
    if (powerSettings.isPowerActive) {
        room.sendAnnouncement(
            `⚡️${player.name} ha activado el power⚡️`,
            null,
            0x33CC33,
            "bold"
        );
    } else {
        room.sendAnnouncement(
            `❌${player.name} ha desactivado el power❌`,
            null,
            0xFF0000,
            "bold"
        );
    }
}

function handleGKCommand(room, player, args) {
    let coordinates = getCurrentMapCoordinates();

    if (claimedPositions.hasOwnProperty(player.name)) {
        room.sendAnnouncement(`¡${player.name} ya ha reclamado una posición y no puede reclamar otra!`, player.id, 0xff0000);
        return;
    }
    
    if (!player.team) {
        room.sendAnnouncement(`¡${player.name}, debes pertenecer a un equipo para reclamar una posición!`, player.id, 0xff0000);
        return;
    }

    const teamName = player.team === 1 ? "red" : "blue";  // Usar minúsculas para las claves

    if (gkClaimed.hasOwnProperty(teamName) && gkClaimed[teamName] !== null) {
        room.sendAnnouncement(`¡Ya hay un GK en el ${teamName} ~ ${gkClaimed[teamName]}!`, player.id, 0xff0000);
        return;
    } else {
        if (gkClaimed.hasOwnProperty(teamName) && gkClaimed[teamName] !== null) {
            room.sendAnnouncement(`¡${gkClaimed[teamName]} ha dejado de ser GK en el ${teamName}!`);
        }

        gkClaimed[teamName] = player.name;  // Guarda el nombre del jugador como GK
        claimedPositions[player.name] = true;

        if (teamName === "red") {
            formacionRed += `GK - ${gkClaimed[teamName]}, `;
        } else {
            formacionBlue += `GK - ${gkClaimed[teamName]}, `;
        }

        let color = teamName === "red" ? colorRed : colorBlue;
        room.sendAnnouncement(`Posicion reclamada en ${teamName}: GK - ${gkClaimed[teamName]}`, null, color);
    }

    if (!coordinates.red || !coordinates.blue) {
        coordinates = {
            red: { x: -750, y: 0 },
            blue: { x: 750, y: 0 }
        };
    }
    
    if (player.team === 1) {
        room.setPlayerDiscProperties(player.id, { x: coordinates.red.x, y: coordinates.red.y });
    } else if (player.team === 2) {
        room.setPlayerDiscProperties(player.id, { x: coordinates.blue.x, y: coordinates.blue.y });
    }

    gks.push(player.id);
}


function handleUnbanCommand(room, player, args) {
    const match = args.match(/"([^"]+)"/);

    if (match) {
        const playerName = match[1];
        const playerStats = room.getPlayerStats(playerName);

        if (playerStats && playerStats.sancion && playerStats.sancion.includes("Baneado")) {
            playerStats.sancion = null;
            room.sendAnnouncement(`${playerName} fue desbaneado.`, null, 0x00ff00);
        } else {
            room.sendAnnouncement("Ese jugador no está baneado.", player.id, 0xff0000);
        }
    } else {
        room.sendAnnouncement("Formato incorrecto. Por favor, use comillas para encerrar el nombre del jugador.", player.id, 0xff0000);
    }
}

function handleUnSancCommand(room, player, args) {
    const match = args.match(/"([^"]+)"/);

    if (match) {
        const playerName = match[1];
        const playerStats = room.getPlayerStats(playerName);

        if (playerStats && playerStats.sancion && playerStats.sancion.includes("Razón")) {
            playerStats.sancion = null;
            room.sendAnnouncement(`${playerName} fue perdonado`, null, 0x00ff00);
        } else {
            room.sendAnnouncement("Ese jugador no está sancionado.", player.id, 0xff0000);
        }
    } else {
        room.sendAnnouncement("Formato incorrecto. Por favor, use comillas para encerrar el nombre del jugador.", player.id, 0xff0000);
    }
}



function handleAdvCommand(room, player, args) {
    const match = args.match(/"([^"]+)"/);

    if (match) {
        const playerName = match[1];
        const advReason = args.substring(match[0].length).trim();

        let id = room.getPlayerByName(playerName);

        if (id < 0) {
            room.sendAnnouncement("Ese jugador no existe", player.id, 0xff0000);
        } else {
            room.sendAnnouncement(
                `⚠️${room.getPlayer(id).name} ha sido advertido verbalmente por ${player.name}\nRazón: ${advReason}⚠️`,
                null,
                0xFF0000,
                "bold"
            );
            room.playerAddAdvVerbal(room.getPlayer(id).name, advReason, player.name);
        }
    } else {
        room.sendAnnouncement("Formato incorrecto. Por favor, use comillas para encerrar el nombre del jugador.", player.id, 0xff0000);
    }
}

function handleKickCommand(room, player, args) {
    const match = args.match(/"([^"]+)"/);

    if (match) {
        const playerName = match[1];
        const kickReason = args.substring(match[0].length).trim();

        let id = room.getPlayerByName(playerName);

        if (id < 0) {
            room.sendAnnouncement("Ese jugador no existe", player.id, 0xff0000);
        } else {
            room.sendAnnouncement(`${room.getPlayer(id).name} ha sido expulsado por ${player.name}. Razón: ${kickReason}`);
            room.kickPlayer(id);
            room.playerAddKick(room.getPlayer(id).name, kickReason, player.name);
        }
    } else {
        room.sendAnnouncement("Formato incorrecto. Por favor, use comillas para encerrar el nombre del jugador.", player.id, 0xff0000);
    }
}


function handleBanCommand(room, player, args) {
    const match = args.match(/"([^"]+)"/);

    if (match) {
        const playerName = match[1];
        const banReason = args.substring(match[0].length).trim();

        const playerId = room.getPlayerByName(playerName);
        if (playerId !== -1) {
            room.kickPlayer(playerId);
        }

        // Obtener la fecha actual usando la función getCurrentDate
        const currentDate = getCurrentDate();

        // Mensaje de anuncio en el juego con partes en negrita
        const banAnnouncementForDiscord = `🦈🚫 **${playerName}** ha sido baneado del servidor por **${player.name}**. Razón: **${banReason}**. Fecha de sanción: **${currentDate}** 🚫🦈`;

        // Mensaje de anuncio para Discord sin partes en negrita
        const banAnnouncementInGame = `🦈🚫 ${playerName} ha sido baneado del servidor por ${player.name}. Razón: ${banReason}. Fecha de sanción: ${currentDate} 🚫🦈`;

        // Enviar anuncio al juego
        room.sendAnnouncement(banAnnouncementInGame, null, 0xFFD700);

        const playerStats = room.getPlayerStats(playerName);
        if (playerStats) {
            // Mostrar claramente el nombre de quien realizó el baneo en la sanción
            playerStats.sancion = `Baneado por ${player.name} - Razón: ${banReason} - Fecha: ${currentDate}`;
        }

        // Enviar el mismo mensaje al canal de sanciones en Discord
        sendBanAnnouncementToDiscord(playerName, banAnnouncementForDiscord);
    } else {
        room.sendAnnouncement("Formato incorrecto. Por favor, use comillas para encerrar el nombre del jugador.", player.id, 0xff0000);
    }
}



function handleChangeMapCommand(room, player, args) {
    if (fs.existsSync(`./maps/${args}.hbs`)) {
        room.stopGame();
        room.map = fs.readFileSync(`./maps/${args}.hbs`);
        room.setCustomStadium(room.map);
        setCurrentMapCoordinates(args); // Update coordinates based on the new map
        room.startGame();
    } else {
        room.sendAnnouncement("Mapa no existente", player.id, 0xff0000);
    }
}

function obtenerRango(xp) {
    let rangoCompleto = "";
    const listaRangos = cargarRangos();

    for (let i = 0; i < listaRangos.length; i++) {
        for (let j = 0; j < listaRangos[i].niveles.length; j++) {
            if (xp < listaRangos[i].niveles[j].limite) {
                rangoCompleto = `${listaRangos[i].rango} ${listaRangos[i].niveles[j].nivel}`;
                return rangoCompleto;
            }
        }
    }

    return "Leviatán"; // Si no se encuentra ningún rango adecuado
}

function actualizarGrupoJugador(playerStats, nuevoRango) {
    const gruposExcluidos = ["Vip", "Tiburon de oro", "Ayudante", "Mod", "Programador", "Admin", "Jefe de Staff", "Fundador", "Asistente"];

    if (!gruposExcluidos.includes(playerStats.group)) {
        playerStats.group = nuevoRango;
    }
}

function handleSizeCommand(room, player, args) {
    const match = args.match(/^"(\d+)"$/);

    if (match) {
        let size = parseFloat(match[1]);
        if (!isNaN(size) && size >= 10 && size <= 20) {
            playerSizes[player.id] = size;
            setPlayerSize(room, player.id, playerSizes[player.id]);
        } else {
            room.sendAnnouncement("Por favor, introduce un tamaño válido entre 10 y 20.", player.id, 0xFF0000);
        }
    } else {
        room.sendAnnouncement("Por favor, introduce el tamaño entre comillas, por ejemplo: !size \"20\".", player.id, 0xFF0000);
    }
}

function formatTime(seconds) {
    const days = Math.floor(seconds / 86400); // Calcula los días
    const hours = Math.floor((seconds % 86400) / 3600); // Calcula las horas restantes
    const minutes = Math.floor((seconds % 3600) / 60); // Calcula los minutos restantes
    const secs = seconds % 60; // Calcula los segundos restantes

    let formattedTime = "";
    if (days > 0) {
        formattedTime += `${days} día${days > 1 ? 's' : ''}, `;
    }
    if (hours > 0) {
        formattedTime += `${hours} hora${hours > 1 ? 's' : ''}, `;
    }
    if (minutes > 0 || hours > 0 || days > 0) {
        formattedTime += `${minutes} minuto${minutes !== 1 ? 's' : ''}, `;
    }
    formattedTime += `${secs} segundo${secs !== 1 ? 's' : ''}`;

    return formattedTime;
}


function calcularWinRate(victories, games) {
    return games > 0 ? ((victories / games) * 100).toFixed(2) : "0.00";
}

function handleMeCommand(room, player, args) {
    const playerStats = room.getPlayerStats(args === "" ? player.name : args);

    if (playerStats) {
        const rango = obtenerRango(playerStats.xp);
        actualizarGrupoJugador(playerStats, rango);

        // Calcular el win rate usando solo victorias y partidas jugadas
        const winRate = calcularWinRate(playerStats.victories, playerStats.games);

        const statsString = 
        `📝 Estadísticas de ${playerStats.name}\n` +
        `─────────────────────────────\n` +
        `[🥅] Goles: ${playerStats.goals}  |  ` +
        `[❌] En contra: ${playerStats.counterGoals}\n` +
        `[👋] Asistencias: ${playerStats.assistances}  |  ` +
        `[🧤] Vallas invictas: ${Math.round(playerStats.cleanSheets * 10) / 10}\n` +
        `─────────────────────────────\n` +
        `[🦵] Tocadas: ${playerStats.touches}\n` +
        `[🎮] Partidas Jugadas: ${playerStats.games}\n` +
        `[✅] Victorias: ${playerStats.victories}  |  ` +
        `[❎] Derrotas: ${playerStats.defeated}\n` +
        `[🏆] Win Rate: ${winRate}%\n` +
        `─────────────────────────────\n` +
        `[⭐] MVPs: ${playerStats.mvp}\n` + // Nueva línea para la estadística de MVP
        `─────────────────────────────\n` +
        `[⏱️] Tiempo Jugado: ${formatTime(playerStats.timePlayed)}\n` + 
        `─────────────────────────────\n` +
        `[📃] Grupo: ${playerStats.group}  |  ` +
        `[💬] Discord: ${playerStats.discordUser}\n` +
        `─────────────────────────────\n` +
        `[🚫] Sanción: ${playerStats.sancion || "Ninguna"}\n` +
        `[✨] XP: ${playerStats.xp}  |  ` +
        `[🦈] Rango: ${rango}\n` +
        `─────────────────────────────\n` +
        `⚽ ¡Sigue dándolo todo en la cancha!`;

        room.sendAnnouncement(statsString, player.id, 0xffff00);
    } else {
        room.sendAnnouncement("Jugador no encontrado", player.id, 0xff0000);
    }
}









function resetPositionClaims() {


    const positions = [
        gkClaimed
    ];


    positions.forEach(position => {
        Object.keys(position).forEach(team => {
            position[team] = null;
        });
    });

    return true;
}

function reiniciarPosiciones() {
    for (let key in claimedPositions) {
        delete claimedPositions[key];
    }
}
module.exports = {
    LoadCommandHandler,
    setPlayerSize,
    obtenerRango,
    actualizarGrupoJugador,
    resetPositionClaims,
    reiniciarPosiciones,
    gkClaimed,
    claimedPositions,
    gks,
    resetPlayerSize,
    mapaContent,
    handleMeCommand
};