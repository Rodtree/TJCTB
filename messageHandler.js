const { client } = require("./discord/discord");
const fs = require("fs");
const { isCommand, format } = require("./utils");

const playerMessages = {};  // Almacena los mensajes recientes de cada jugador
const spamCooldownTime = 10000;  // Tiempo de bloqueo (10 segundos)
const spamLimit = 3;  // Límite de repeticiones antes de aplicar el cooldown
const exemptMessages = ["1", "2", "9", "q", "!nv", "!bb", "!size","!afk", "!discord", "!stats", "!power", "!unban", "!unsanc", "!changemap", "!staff", "!adv", "!kick", "!ban", "!gk", "!verify", "!help", "!me"];  // Mensajes exentos de la verificación de spam

function checkForSpam(room, player, message) {
  const playerId = player.id;

  // Si el mensaje está en la lista de exentos, no lo verificamos
  if (exemptMessages.includes(message.trim())) {
      return false;
  }

  // Si es la primera vez que el jugador envía un mensaje, inicializamos su registro
  if (!playerMessages[playerId]) {
      playerMessages[playerId] = {
          messages: [],  // Mensajes recientes
          cooldown: null  // Tiempo en el que se activó el cooldown
      };
  }

  const now = Date.now();
  const playerData = playerMessages[playerId];

  // Si el jugador está en cooldown, verificamos si ya pasaron los 10 segundos
  if (playerData.cooldown && now - playerData.cooldown < spamCooldownTime) {
      room.sendAnnouncement("Has sido bloqueado temporalmente por repetir el mismo mensaje. Espera unos segundos antes de intentarlo de nuevo.", player.id, 0xFF0000, "bold");
      return true;  // Bloqueamos el mensaje
  }

  // Agregamos el mensaje al historial de mensajes recientes del jugador
  playerData.messages.push(message);

  // Solo mantenemos los últimos 3 mensajes en el historial
  if (playerData.messages.length > 3) {
      playerData.messages.shift();  // Eliminamos el mensaje más antiguo
  }

  // Verificamos si los últimos 3 mensajes son iguales
  if (playerData.messages.length === 3 && playerData.messages.every((msg) => msg === message)) {
      playerData.cooldown = now;  // Activamos el cooldown
      playerData.messages = [];  // Reseteamos el historial de mensajes
      room.sendAnnouncement("Estás repitiendo el mismo mensaje. Debes esperar 10 segundos antes de enviar el mismo mensaje nuevamente.", player.id, 0xFF0000, "bold");
      return true;  // Bloqueamos el mensaje
  }

  return false;  // No hay spam, permitimos el mensaje
}

function LoadMessageHandler(room) {
  async function sendMessageDiscord(message) {
    const blackListWords = ["@"];
    const messageContent = message.toLowerCase();
    const containsBlackListWord = blackListWords.some((word) => messageContent.includes(word));
    if (containsBlackListWord) {
      return;
    }

    let channel = client.channels.cache.get(room.config.discord_channels.messages);
    channel.send(message);
  }

  function formatMessage(player, message) {
    let group = room.playerGetGroup(player.name);
    return format(group.format, player.team === 0 ? "⚫" : player.team === 1 ? "🔴" : "🔵", player.name, message);
  }

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.channel.id !== room.config.discord_channels.messages) return;

    room.sendAnnouncement(
      `${message.member.displayName}: ${message.content}`,
      null,
      room.config.discord_message_color,
      null,
      0
    );
  });

  room.onPlayerChat = function (player, message) {
    // Verificamos si el jugador está haciendo spam
    if (checkForSpam(room, player, message)) {
        return false;  // Bloqueamos el mensaje y no lo mostramos en el chat
    }

    if (
        !isCommand(message, (command, parameters) => {
            room.onPlayerCommand(player, command, parameters);
        })
    ) {
        sendMessageDiscord(`**${player.name}**: ${message}`);
        let group = room.playerGetGroup(player.name);
        room.sendAnnouncement(formatMessage(player, message), null, group.color);
    }
    return false;
  };
}

module.exports = { LoadMessageHandler };
