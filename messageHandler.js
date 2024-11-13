const { client } = require("./discord/discord");
const fs = require("fs");
const path = require("path");
const { isCommand, format } = require("./utils");

const playerMessages = {};  // Almacena los mensajes recientes de cada jugador
const spamCooldownTime = 10000;  // Tiempo de bloqueo (10 segundos)
const spamLimit = 3;  // Límite de repeticiones antes de aplicar el cooldown
const exemptMessages = ["1", "2", "9", "q", "!nv", "!bb", "!size","!afk", "!discord", "!stats", "!power", "!unban", "!unsanc", "!changemap", "!staff", "!adv", "!kick", "!ban", "!gk", "!verify", "!help", "!me"];  // Mensajes exentos de la verificación de spam



const specialGroups = [
  'Fundador', 'Leviatán', 'Asistente', 'Mod', 'Admin', 
  'Ayudante', 'Tiburon de oro', 'Jefe de Staff', 'Programador'
];


function getDiscordUserEmojiAndColor(discordUser) {
  try {
    const discordUserData = JSON.parse(fs.readFileSync(path.join(__dirname, "./json/config-vips.json"), "utf-8"));
    return discordUserData.find(user => user.username === discordUser) || null;
  } catch (error) {
    console.error("Error leyendo el archivo config-vips.json:", error);
    return null;
  }
}



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

  // Solo mantenemos los últimos `spamLimit` mensajes en el historial
  if (playerData.messages.length > spamLimit) {
      playerData.messages.shift();  // Eliminamos el mensaje más antiguo
  }

  // Verificamos si los últimos `spamLimit` mensajes son iguales
  if (playerData.messages.length === spamLimit && playerData.messages.every((msg) => msg === message)) {
      playerData.cooldown = now;  // Activamos el cooldown
      playerData.messages = [];  // Reseteamos el historial de mensajes
      room.sendAnnouncement("Estás repitiendo el mismo mensaje. Debes esperar 10 segundos antes de enviar el mismo mensaje nuevamente.", player.id, 0xFF0000, "bold");
      return true;  // Bloqueamos el mensaje
  }

  return false;  // No hay spam, permitimos el mensaje
}

function formatMessage(room, player, message) {
  const group = room.playerGetGroup(player.name);

  // Verificar si `group` y `group.group` existen
  if (group && group.group === "Vip") {
    const playerStats = room.getPlayerStats(player.name);
    
    if (playerStats && playerStats.discordUser) {
      const discordUserInfo = getDiscordUserEmojiAndColor(playerStats.discordUser);

      if (discordUserInfo) {
        const vipPrefix = discordUserInfo.vipCategory === "Vip Eternal" ? "[VIP ETERNAL]" : "[VIP]";
        return {
          text: `${vipPrefix} [${discordUserInfo.emoji}] ${player.name}: ${message}`,
          color: parseInt(discordUserInfo.color.replace("#", ""), 16),
          style: "bold"
        };
      } else {
        const teamEmoji = player.team === 1 ? "🔴" : player.team === 2 ? "🔵" : "⚫";
        const defaultColor = "#00CCBE";  
        return {
          text: `[VIP] [${teamEmoji}] ${player.name}: ${message}`,
          color: parseInt(defaultColor.replace("#", ""), 16),
          style: "bold"
        };
      }
    }
  }

  // Mensajes en negrita para grupos especiales
  if (group && specialGroups.includes(group.group)) {
    return {
      text: format(group.format, player.team === 1 ? "🔴" : player.team === 2 ? "🔵" : "⚫", player.name, message),
      color: parseInt(group.color, 16),
      style: "bold"
    };
  }

  const teamEmoji = player.team === 1 ? "🔴" : player.team === 2 ? "🔵" : "⚫";
  const pastelColor = player.team === 1 ? 0xFFB6C1 : player.team === 2 ? 0xADD8E6 : 0xD3D3D3;  
  return { text: `[${teamEmoji}] ${player.name}: ${message}`, color: pastelColor };
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

  client.on("messageCreate", async (message) => {
    // Ignorar mensajes de bots
    if (message.author.bot) return;

    // Filtrar mensajes solo del canal configurado
    if (message.channel.id !== room.config.discord_channels.messages) return;

    // Prefijo de Discord y formato mejorado
    const discordPrefix = `💬 Discord: `;
    const styledMessage = `${discordPrefix}${message.member.displayName}: ${message.content}`;
    
    // Enviar anuncio al chat de Haxball
    room.sendAnnouncement(
      styledMessage,
      null,
      room.config.discord_message_color || 0x7289DA, // Color azul predeterminado de Discord
      "bold",
      2 // Duración prolongada en pantalla para mayor visibilidad
    );
  });

  room.onPlayerChat = function (player, message) {
    // Verificamos si el jugador está haciendo spam
    if (checkForSpam(room, player, message)) {
        return false;  // Bloqueamos el mensaje y no lo mostramos en el chat
    }

    if (!isCommand(message, (command, parameters) => {
        room.onPlayerCommand(player, command, parameters);
    })) {
        sendMessageDiscord(`**${player.name}**: ${message}`);
        
        const formattedMessage = formatMessage(room, player, message);
        
        if (typeof formattedMessage === "string") {
          room.sendAnnouncement(formattedMessage, null, group.color, "bold");
        } else {
          room.sendAnnouncement(formattedMessage.text, null, formattedMessage.color, formattedMessage.style || null);
        }
    }
    return false;
};
}

module.exports = { LoadMessageHandler };
