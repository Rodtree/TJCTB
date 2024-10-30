let powerDuration = 1500;
let powerColor = 0xFF0000;
let normalBallColor = 0xFFFFFF;
let powerMultiplier = 1.5;
let lastKickTime = 0; 
let lastPossessionTime = Date.now(); // Momento del último toque de balón
let lastPossessingTeam = null; // Equipo que tiene la posesión actualmente
let lastPlayerTouchTimes = {}; // Objeto para almacenar los tiempos de los últimos toques de cada jugador
let timeSinceLastTouch = 0; // Tiempo desde el último toque

let powerSettings = {
    isPowerActive: true, // true or false
    powerApplied: false,
    powerPlayerId: null,
    powerStartTime: 0,
    powerUsedBy: null,
    powerForUse: false,
};

function togglePowerActive() {
    powerSettings.isPowerActive = !powerSettings.isPowerActive;
   
}

function LoadBallHandler(room) {
    room.onPlayerBallKick = function (player) {
        const currentTime = Date.now(); // Actualizamos el tiempo del pateo

        // Si ya hay un equipo en posesión, acumulamos el tiempo de posesión
        if (lastPossessingTeam !== null) {
            const possessionDuration = currentTime - lastPossessionTime;
            if (lastPossessingTeam === 1) {
                room.redPosesion += possessionDuration;
            } else if (lastPossessingTeam === 2) {
                room.bluePosesion += possessionDuration;
            }
            
        }

        // Guardar el tiempo del último toque para este jugador
        timeSinceLastTouch = (currentTime - (room.lastPlayerTouchTimes[room.previousTouchId] || currentTime)) / 1000; // Tiempo en segundos
        room.lastPlayerTouchTimes[player.id] = currentTime; // Guardar tiempo del toque actual

        room.previousTouchId = player.id;

        // Actualizar el equipo en posesión y el momento del último toque
        lastPossessingTeam = player.team;
        lastPossessionTime = currentTime;
        lastKickTime = currentTime; // Asignación única

        // Guardar el último toque y actualizar la posesión actual
        if (room.lastPlayerPossession !== "") {
            room.previousTouch = room.lastPlayerPossession;
        }

        room.lastPlayerPossession = player.name;
        room.lastPlayerPossessionId = player.id;

        // Registrar el toque del jugador y sumar puntos MVP
        room.playerAddTouch(player.name);
        room.addScoreMvp(player.name, 1);

        // Lógica del power-up (si aplica)
        if (powerSettings.isPowerActive && powerSettings.powerApplied && player.id === powerSettings.powerPlayerId && powerSettings.powerForUse) {
            const ballProperties = room.getDiscProperties(0);
            room.setDiscProperties(0, {
                xspeed: ballProperties.xspeed * powerMultiplier,
                yspeed: ballProperties.yspeed * powerMultiplier,
                color: normalBallColor
            });
            powerSettings.powerPlayerId = null;
            powerSettings.powerForUse = false;
        }
    };
}

module.exports = { 
    LoadBallHandler, 
    lastPossessingTeam, 
    lastPossessionTime, 
    lastKickTime,
    lastPlayerTouchTimes, 
    timeSinceLastTouch, // Exportamos este valor ahora
    togglePowerActive, 
    powerDuration, 
    powerColor, 
    normalBallColor, 
    powerSettings 
};
