const AFK_TIME_LIMIT = 25000;  // 25 segundos de límite para kickear
const WARNING_TIME = 10000;  // 10 segundos para mostrar advertencia
const MOVEMENT_TOLERANCE = 1;  // Tolerancia al movimiento (1 píxel)
const WARNING_COLOR = 0xFFFF00;  // Color amarillo para la advertencia
const afkPlayers = {};  // Almacena el estado de inactividad de los jugadores
function handlePlayerLeave(player) {
    const playerId = player.id;
    delete afkPlayers[playerId];
}

function LoadAfkHandler(room) {

    function checkAfkStatus(player) {
        const playerId = player.id;
        const now = Date.now();
        const playerPosition = player.position;

        // Ignorar a los jugadores en el equipo espectador (asumiendo que el equipo 0 es espectador)
        if (player.team === 0 || !playerPosition) return;

        // Si el jugador no está en el registro de AFK, inicializamos su estado
        if (!afkPlayers[playerId]) {
            afkPlayers[playerId] = {
                lastPosition: { ...playerPosition },
                lastMoveTime: now,
                warningSent: false,
            };
        }

        const playerData = afkPlayers[playerId];
        const { lastPosition, lastMoveTime, warningSent } = playerData;

        // Calcular la diferencia en las posiciones para determinar si ha habido movimiento
        const deltaX = playerPosition.x - lastPosition.x;
        const deltaY = playerPosition.y - lastPosition.y;
        const distanceMoved = Math.abs(deltaX) + Math.abs(deltaY);  // Usamos la suma de diferencias absolutas para mayor eficiencia

        // Si el jugador se ha movido más que la tolerancia, actualizar el estado
        if (distanceMoved > MOVEMENT_TOLERANCE) {
            playerData.lastPosition = { ...playerPosition };
            playerData.lastMoveTime = now;
            playerData.warningSent = false;
            return;  // El jugador se ha movido, no está AFK
        }

        // Calcular el tiempo que el jugador ha estado AFK
        const timeAfk = now - lastMoveTime;

        // Si ha pasado más del tiempo de advertencia, y no se ha enviado aún
        const timeLeft = Math.ceil((AFK_TIME_LIMIT - timeAfk) / 1000);
        if (timeLeft === 10 && !playerData.warningSent) {
            room.sendAnnouncement(
                `¡Estás inactivo! Muévete en los próximos ${timeLeft} segundos o serás expulsado.`,
                playerId,
                WARNING_COLOR,
                "bold"
            );
            playerData.warningSent = true;
        }
            

        // Si el jugador ha estado AFK más allá del límite, expulsarlo
        if (timeAfk >= AFK_TIME_LIMIT) {
            room.kickPlayer(playerId, "Expulsado por estar inactivo durante 25 segundos.", false);
            delete afkPlayers[playerId];  // Limpiar el estado AFK del jugador expulsado
        }
    }

    // Limpieza del estado cuando un jugador se desconecta o sale del juego
   

    // Verificación periódica de la actividad de los jugadores
    setInterval(() => {
        const players = room.getPlayerList();
        players.forEach(player => {
            checkAfkStatus(player);
        });
    }, 1000);  // Verificar cada segundo

   
}

module.exports = { LoadAfkHandler, handlePlayerLeave };
