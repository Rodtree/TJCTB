function getTopPlayers(room, tipoEstadistica) {
  return new Promise((resolve, reject) => {
    // Utilizar room.playersdb para acceder a los datos de los jugadores
    const players = room.playersdb;

    // Ordenar los jugadores según la estadística especificada
    const sortedPlayers = players.sort((a, b) => b[tipoEstadistica] - a[tipoEstadistica]);

    // Filtrar solo los jugadores que tienen un valor válido para la estadística
    const filteredPlayers = sortedPlayers.filter(player => player[tipoEstadistica] !== undefined);

    // Redondear las estadísticas a un decimal y devolver los 10 mejores jugadores con su posición, nombre y estadística
    resolve(filteredPlayers.slice(0, 10).map((player, index) => ({
      position: index + 1,
      playerName: player.name,
      statistic: tipoEstadistica === "timePlayed" 
        ? formatTime(player[tipoEstadistica]) // Formatear el tiempo jugado
        : Math.round(player[tipoEstadistica] * 10) / 10 // Redondear a un decimal
    })));
  });
}


function formatTime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else {
    return `${minutes}m ${secs}s`;
  }
}


module.exports = { getTopPlayers };
