const HaxballJS = require("haxball.js");
const fs = require("fs");
let serverStatus = { online: false }; // Estado del servidor
const CONFIG = JSON.parse(fs.readFileSync("./json/config.json", "utf-8"));
require("dotenv").config();
const { loadBannedPlayers } = require("./utils");





// Verifica y crea players.json si no existe
const playersPath = "./json/players.json";
if (!fs.existsSync(playersPath)) {
    fs.writeFileSync(playersPath, JSON.stringify([]));
}

const svPatch = "./json/serverStatus.json";
if (!fs.existsSync(svPatch)) {
    fs.writeFileSync(svPatch, JSON.stringify([]));
}

// Función para actualizar el estado del servidor
function updateServerStatus(online) {
    serverStatus.online = online;
    fs.writeFileSync('./json/serverStatus.json', JSON.stringify(serverStatus));
}

const { LoadDiscordHandler } = require("./discord/discord");
const { LoadMessageHandler } = require("./messageHandler");
const { LoadBallHandler } = require("./ballHandler");
const { LoadPlayerHandler } = require("./playerHandler");
const { LoadRecordHandler } = require("./recordHandler");
const { LoadCommandHandler } = require("./commandHandler");
const { LoadMatchHandler } = require("./matchHandler");
const { LoadAfkHandler } = require('./afkHandler'); 
const { getTopPlayers } = require('./leaderboardHandler');

const mapX11Content = fs.readFileSync("./maps/x11.hbs", "utf-8");
const mapX7Content = fs.readFileSync("./maps/x7.hbs", "utf-8");
const mapX5Content = fs.readFileSync("./maps/x5.hbs", "utf-8");

function cambiarMapaSegunJugadores(room) {
    const jugadores = room.getPlayerList().length;

    try {
        if (jugadores > 19) {
            room.setCustomStadium(mapX11Content);
        } else if (jugadores > 13) {
            room.setCustomStadium(mapX7Content);
        } else if (jugadores > 0) {
            room.setCustomStadium(mapX5Content);
        }
    } catch (error) {
        console.error("Error iniciando estadio personalizado:", error);
    }
}

HaxballJS.then((HBInit) => {
    const room = HBInit({
        roomName: CONFIG.server_name,
        maxPlayers: CONFIG.max_players,
        public: false,
        noPlayer: true,
        auth: true,
        token: process.env.HAXBALL_TOKEN,
        geo: CONFIG.geo,
    });

    room.map = mapX5Content;

    try {
        room.groups = JSON.parse(fs.readFileSync("./json/groups.json", "utf-8"));
        room.config = JSON.parse(fs.readFileSync("./json/config.json", "utf-8"));
        room.playersdb = JSON.parse(fs.readFileSync("./json/players.json", "utf-8"));
        room.insultos = JSON.parse(fs.readFileSync("./json/insultos.json", "utf-8"));
    } catch (error) {
        console.error("Error leyendo los archivos de configuración:", error);
        updateServerStatus(false);
        return;
    }

    try {
        room.setCustomStadium(room.map);
        room.setScoreLimit(room.config.limit_goals);
        room.setTimeLimit(room.config.time_limit);
        room.setTeamsLock(true);
        room.startGame();

        let linkReceived = false;  // Variable para verificar si se ha recibido un enlace

        room.onRoomLink = function (link) {
            console.log(link);
            room.config.current_link = link;

            if (link) {
                console.log("Servidor en línea, link generado correctamente.");
                updateServerStatus(true);  // Actualizamos el estado del servidor a "en línea"
                linkReceived = true;  // Marcamos que se ha recibido el enlace
            } else {
                console.log("Error al generar el link, servidor fuera de línea.");
                updateServerStatus(false);  // Actualizamos el estado del servidor a "fuera de línea"
            }
        };

        // Temporizador para verificar si se ha recibido el enlace en 5 segundos
        setTimeout(() => {
            if (!linkReceived) {
                console.log("No se recibió el enlace en 5 segundos, actualizando estado del servidor a fuera de línea.");
                updateServerStatus(false);
            }
        }, 5000);  // 5000 ms = 5 segundos

        LoadMessageHandler(room);
        LoadPlayerHandler(room);
        LoadBallHandler(room);
        LoadDiscordHandler(room);
        LoadRecordHandler(room);
        LoadCommandHandler(room);
        LoadMatchHandler(room);
        LoadAfkHandler(room);
        getTopPlayers(room);
        loadBannedPlayers(room);
        
        const sendAnnouncement = () => {
            const announcement = `🦈 Siguenos en TikTok - https://www.tiktok.com/@tjctb 🦈\n
         🦈 Discord de la Comunidad - discord.gg/Wjhc2cxSHD 🦈`;
      
            room.sendAnnouncement(announcement, null, 0xFFD700, "italic");
        };

        const intervalAnnouncementTime = room.config.announcement_time * 1000;

        setInterval(() => {
            cambiarMapaSegunJugadores(room);
        }, 2000);

        setInterval(sendAnnouncement, intervalAnnouncementTime);

        // Actualizamos el estado del servidor a online
        updateServerStatus(true);
    } catch (error) {
        console.error("Error durante la inicialización de mapas:", error);
        updateServerStatus(false);
    }
}).catch(error => {
    console.error("Error iniciando Haxball:", error);
    
    // Manejo del error de token
    if (error.message.includes("Invalid Token Provided")) {
        console.error("Token inválido proporcionado, servidor fuera de línea.");
        updateServerStatus(false);  // Actualizamos el estado del servidor a "fuera de línea"
    } else {
        updateServerStatus(false);  // Asegúrate de marcar el servidor como fuera de línea por otros errores también
    }
});
