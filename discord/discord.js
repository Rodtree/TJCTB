const path = require("path");
const fs = require("fs");
const { exec } = require('child_process')
const { getTopPlayers } = require('../leaderboardHandler.js');
const { cargarRangos, addBannedPlayer, recentlyLeftPlayers, playerAuthMap, unbanPlayer, predefinedColors } = require("../utils.js");
const {
  Client,
  GatewayIntentBits,
  ActivityType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContextMenuCommandAssertions,
} = require("discord.js");
const client = new Client({
  intents: [ 
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
  ],
});
require("../registerCommands.js");
const programadorRoleId = "1198718698245062777";
const jefedestaffRolId = "1133233668199026799";
const adminRolId = "1133233628894216302";
const tibustaffRolID = "1270937228859674645";


// Función para verificar si el miembro tiene uno de los roles permitidos
function hasPermission(member) {
  return member.roles.cache.has(programadorRoleId) ||
    member.roles.cache.has(jefedestaffRolId) ||
    member.roles.cache.has(adminRolId);
}

function hasStaffPermission(member) {
  return member.roles.cache.has(programadorRoleId) ||
    member.roles.cache.has(jefedestaffRolId) ||
    member.roles.cache.has(tibustaffRolID) ||
    member.roles.cache.has(adminRolId);
}


const CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "json", "players.json"))
);
require("dotenv").config();

function ejecutarComandoTerminal(comando) {
  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al ejecutar el comando: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error en la salida estándar de la terminal: ${stderr}`);
      return;
    }
    console.log(`Comando ejecutado correctamente: ${stdout}`);
  });
}

function sendBanAnnouncementToDiscord(playerName, banAnnouncement) {
  // Construir la ruta de manera segura
  const configPath = path.join(__dirname, '../json/config.json'); // __dirname es el directorio actual del archivo
  const CONFIG = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const channelID = CONFIG.discord_channels.sanciones; // Ajustar al canal correcto de sanciones
  const serverName = CONFIG.server_name;

  let embed = {
    color: 0x00CCBE, // Convertir a entero
    description: banAnnouncement,
  };

  client.channels.cache.get(channelID).send({ embeds: [embed] })
    .catch(error => {
      console.error(`Error al enviar mensaje de baneo a Discord para ${playerName}:`, error);
    });
}








function modificarTokenEnv(nuevoToken) {
  try {
    // Leer el archivo .env
    const envPath = './.env';
    let envFile = fs.readFileSync(envPath, 'utf8');

    // Buscar y reemplazar el valor antiguo del token con el nuevo token
    const tokenRegex = /HAXBALL_TOKEN=(.+)/;
    envFile = envFile.replace(tokenRegex, `HAXBALL_TOKEN=${nuevoToken}`);

    // Escribir los cambios de vuelta en el archivo .env
    fs.writeFileSync(envPath, envFile);

    return `El token de Haxball se ha modificado correctamente a: ${nuevoToken}`;
  } catch (error) {
    console.error('Error al modificar el token de Haxball en el archivo .env:', error);
    throw new Error('No se pudo modificar el token de Haxball en el archivo .env');
  }
}

function sendPlayerJoinMessage(playerName, playerGroup) {
  const welcomeGroups = ["Ayudante", "Mod", "Programador", "Admin", "Jefe de Staff", "Fundador", "Asistente"];
  const CONFIG = require(path.join(__dirname, "..", "json", "config.json"));
  if (welcomeGroups.includes(playerGroup)) {
    const channelID = CONFIG.discord_channels.registro_staff;
    


    const embed = {
      color: 0xFFD700,
      description: `El **${playerGroup}** **${playerName}** se ha unido al servidor.`,
    };

    // Enviar el mensaje embed al canal de Discord
    client.channels.cache.get(channelID).send({ embeds: [embed] });
  }
}

function sendPlayerLeaveMessage(playerName, playerGroup) {
  const CONFIG = require(path.join(__dirname, "..", "json", "config.json"));
  const farewellGroups = ["Ayudante", "Mod", "Programador", "Admin", "Jefe de Staff", "Fundador", "Asistente"];
  if (playerGroup && farewellGroups.includes(playerGroup)) {
    const channelID = CONFIG.discord_channels.registro_staff; // Obtener el ID del canal de Discord desde la configuración

    const embed = {
      color: 0xFF4500, // Color rojo
      description: `El **${playerGroup}** **${playerName}** ha salido del servidor.`,
    };

    // Enviar el mensaje embed al canal de Discord
    client.channels.cache.get(channelID).send({ embeds: [embed] });
  }
}



function sendGeneralCommandToDiscord(command, playerName, args) {
  const CONFIG = require(path.join(__dirname, "..", "json", "config.json"));
  const channelID = CONFIG.discord_channels.logs;
  const channelID2 = CONFIG.discord_channels.staff;
  const serverName = CONFIG.server_name;
  let embed;

  if (command === "staff") {
    const reason = args; // args ya es un string
    client.channels.cache.get(channelID2).send("@here").then(() => {
      embed = {
        color: 0xFFD700,
        description: `**${playerName}** ha solicitado la ayuda de un administrador en **${serverName}** Razón: **${reason}**`,
      };
      client.channels.cache.get(channelID2).send({ embeds: [embed] });
    }).catch(error => {
      console.error('Error al enviar el mensaje @here:', error);
    });
  } else {

    embed = {
      color: 0xFFD700,
      description: `**${playerName}** usó \`${command}\` en **${serverName}**`,
    };

    // Enviar el mensaje formateado a los registros
    client.channels.cache.get(channelID).send({ embeds: [embed] });
  }
}

client.on('interactionCreate', async (interaction) => {
  try {
    // Tu código actual que podría generar un error
    if (!interaction.guild) return;
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const roles = member.roles.cache.map((role) => role.name);
    console.log(roles);
  } catch (error) {
    console.error('Error en el manejo de la interacción:', error);
  }

  const { commandName, options, user } = interaction;

  if (commandName === "reiniciar-servidor") {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
    }

    // Ejecutar el comando para reiniciar el servidor
    ejecutarComandoTerminal('pm2 restart index'); // Opcionalmente, puedes cambiar 'pm2 restart 0' por 'node index.js' si prefieres reiniciar directamente desde el archivo principal

    // Responder confirmando que se ha enviado el comando para reiniciar el servidor
    interaction.reply({
      content: "Se ha enviado el comando para reiniciar el servidor.",
      ephemeral: false // Solo visible para el usuario que ejecutó el comando
    });
  }



  if (commandName === "cambiar-token") {
    // Obtener el nuevo token de Haxball proporcionado como argumento
    const nuevoToken = options.getString("nuevo_token");
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
    }

    // Modificar el token de Haxball en el archivo .env
    try {
      const mensaje = modificarTokenEnv(nuevoToken);

      // Responder confirmando que se ha cambiado el token
      interaction.reply({
        content: mensaje,
        ephemeral: false // Solo visible para el usuario que ejecutÃ³ el comando
      });
    } catch (error) {
      // Si ocurre un error al modificar el token en el archivo .env, responder con un mensaje de error
      console.error(error.message);
      interaction.reply({
        content: `Se produjo un error al modificar el token de Haxball en el archivo .env: ${error.message}`,
        ephemeral: true // Solo visible para el usuario que ejecutÃ³ el comando
      });
    }
  }





  if (commandName === "borrarstats") {
    if (!hasPermission(interaction.member)) {
      return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
    }

    // Lógica para borrar estadísticas aquí
    borrarEstadisticas(interaction);
  }
});

async function borrarEstadisticas(interaction) {
  try {
    // Crear la ruta absoluta para el archivo players.json
    const filePath = path.join(__dirname, "../json/players.json");

    // Leer el archivo players.json
    const data = fs.readFileSync(filePath, "utf8");
    const players = JSON.parse(data);

    // Establecer todas las estadísticas de los jugadores a 0
    players.forEach((player) => {
      player.goals = 0;
      player.counterGoals = 0;
      player.touches = 0;
      player.games = 0;
      player.defeated = 0;
      player.victories = 0;
      player.assistances = 0;
      player.cleanSheets = 0;
      player.xp = 0;
    });

    // Guardar los cambios en el archivo players.json
    fs.writeFileSync(filePath, JSON.stringify(players, null, 2));

    // Leer el archivo nuevamente para verificar si se guardaron los cambios
    const updatedData = fs.readFileSync(filePath, "utf8");
    const updatedPlayers = JSON.parse(updatedData);
    console.log("Datos actualizados:", updatedPlayers);

    // Responder en Discord confirmando que las estadísticas han sido reiniciadas
    await interaction.reply({
      content: "Las estadísticas han sido reiniciadas correctamente.",
      ephemeral: true, // Solo visible para el usuario que ejecutó el comando
    });
  } catch (error) {
    console.error("Error al reiniciar las estadísticas:", error);
    await interaction.reply({
      content: "Se produjo un error al intentar reiniciar las estadísticas.",
      ephemeral: true, // Solo visible para el usuario que ejecutó el comando
    });
  }
}


client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

  client.user.setPresence({
    activities: [
      {
        name: "/link to join!",
        type: ActivityType.Streaming,
        url: CONFIG.current_url,
      },
    ],
    status: "dnd",
  });
});


function LoadDiscordHandler(room) {
  room.verifyDiscord = async (name, player) => {
    try {
      const guild = client.guilds.cache.get("1132790184891645952");

      if (!guild) {
        room.sendAnnouncement(
          "Servidor de Discord no encontrado.",
          player.id,
          0xff0000
        );
        return;
      }

      // Función que implementa un timeout manual para la búsqueda de miembros
      async function fetchMemberWithTimeout(guild, name, limit = 1, timeout = 60000) {
        return Promise.race([
          guild.members.fetch({ query: name, limit }).then(fetchedMembers => fetchedMembers.first()),
          new Promise((_, reject) => setTimeout(() => reject(new Error('GuildMembersTimeout')), timeout))
        ]);
      }

      // Usamos la función con timeout para buscar el miembro
      const member = await fetchMemberWithTimeout(guild, name, 1)
        .catch(error => {
          if (error.message === 'GuildMembersTimeout') {
            room.sendAnnouncement(
              `La búsqueda del miembro en Discord ha excedido el tiempo límite.`,
              player.id,
              0xff0000
            );
          } else {
            console.error("Error al buscar miembro en Discord:", error);
          }
          return null;
        });

      if (!member) {
        room.sendAnnouncement(
          "Nombre no válido en Discord, usa !verify nombrediscord",
          player.id,
          0xff0000
        );
        return;
      }

      if (room.getPlayerStatsByDiscord(name)) {
        room.sendAnnouncement(
          "Este usuario ya está sincronizado con Discord.",
          player.id,
          0xff0000
        );
        return;
      }

      const embed = {
        color: 0x0E3937,
        title: "Verifica tu cuenta en 🩸🦈Todos Juegan Con Tiburón🦈🩸!",
        description: `**${player.name}** quiere sincronizar su cuenta.`,
        footer: {
          text: "¡Únete y juega con nosotros!"
        }
      };

      const join = new ButtonBuilder()
        .setLabel("Verify")
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`verify:${player.name}:${name}`);

      // Intentamos enviar el mensaje directo al miembro
      try {
        await member.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(join)] });
        room.sendAnnouncement(
          `Mensaje de verificación enviado a ${name}. Por favor, revisa tu Discord.`,
          player.id,
          0x00ff00
        );
      } catch (error) {
        // Manejo del error si el miembro no puede recibir DMs
        if (error.code === 50007) {
          room.sendAnnouncement(
            `No se puede enviar mensajes a ${name}, revisa la configuración de Discord.`,
            player.id,
            0xff0000
          );
        } else {
          console.error("Error al enviar mensaje de verificación:", error);
          room.sendAnnouncement(
            `Hubo un error al enviar el mensaje de verificación a **${name}**.`,
            player.id,
            0xff0000
          );
        }
      }

    } catch (error) {
      console.error("Error general en la verificación de Discord:", error);
      room.sendAnnouncement(
        `Hubo un error al intentar verificar el nombre de Discord **${name}**.`,
        player.id,
        0xff0000
      );
    }
  };




  client.on("interactionCreate", async (interaction) => {
    const { commandName, customId, options, user } = interaction;
  
    // Función para actualizar el archivo JSON de jugadores
    const updatePlayerDatabase = () => {
      fs.writeFileSync("./json/players.json", JSON.stringify(room.playersdb, null, 2));
    };
  
    // Función para enviar un mensaje de error con emojis y embed estilizado
    const sendError = async (interaction, message) => {
      const embed = {
        color: 0xff3333,
        title: "⚠️ ❌ **Error**",
        description: `🚫 | ${message}`,
        footer: { text: "🔄 Por favor, intenta de nuevo o contacta a un administrador." },
      };
      await interaction.reply({ embeds: [embed], ephemeral: true });
    };
  
    // Función para enviar un mensaje de éxito con emojis y embed estilizado
    const sendSuccess = async (interaction, message, isEphemeral = false) => {
      const embed = {
        color: 0x33ff99,
        title: "✅ 🎉 **Éxito**",
        description: `🎊 | ${message}`,
        footer: { text: "🦈 ¡Operación completada satisfactoriamente!" },
      };
      await interaction.reply({ embeds: [embed], ephemeral: isEphemeral });
    };
  
    // Botón de desvinculación
    if (interaction.isButton()) {
      const customId = interaction.customId;
  
      // Lógica para el botón de desvinculación
      if (customId.startsWith("unlink:")) {
        const [, playerName] = customId.split(":");
        const foundPlayer = room.playersdb.find(player => player && player.name === playerName);
  
        if (foundPlayer && foundPlayer.discordUser === user.username) {
          foundPlayer.discordUser = "";
          foundPlayer.auth = "";
          updatePlayerDatabase();
  
          sendSuccess(
            interaction,
            `🔓 Tu cuenta de Discord ha sido **desvinculada** correctamente del jugador **${playerName}**.`
          );
        } else {
          sendError(
            interaction,
            `🔍 No estás vinculado a la cuenta de jugador **${playerName}**. ⚠️ Verifica tu información o contacta a un administrador.`
          );
        }
      }
  
      // Lógica para confirmar desvinculación manual
      if (customId.startsWith("confirm_unlink:")) {
        const [, discordUsername] = customId.split(":");
  
        // Buscar al jugador en la base de datos
        const foundPlayer = room.playersdb.find(player => player && player.discordUser && player.discordUser.includes(discordUsername));
  
        if (foundPlayer) {
          // Desvincular la cuenta del jugador
          foundPlayer.discordUser = null;
          foundPlayer.group = null;
          updatePlayerDatabase();
  
          // Enviar mensaje de éxito
          const successMessage = `🔓 La cuenta vinculada al usuario de Discord **${discordUsername}** ha sido desvinculada correctamente.`;
          await sendSuccess(interaction, successMessage);
  
          // Eliminar el mensaje original de solicitud de desvinculación después de enviar el mensaje de éxito
          try {
            await interaction.message.delete(); // Se usa interaction.message en lugar de buttonInteraction.message
            console.log("Mensaje de solicitud de desvinculación eliminado exitosamente.");
          } catch (error) {
            console.error("Error al eliminar el mensaje de solicitud de desvinculación:", error);
          }
        } else {
          // Si no se encuentra el jugador, enviar mensaje de error
          await interaction.reply({
            content: `⚠️ No se pudo encontrar la cuenta vinculada al nombre de usuario **${discordUsername}**.`,
            ephemeral: true,
          });
        }
      }
  
      // Lógica para verificación de jugador
      if (customId.startsWith("verify:")) {
        const [, playerName, playerDiscord] = customId.split(":");
        const player = room.getPlayerObjectByName(playerName);
  
        if (player) {
          const embed = {
            color: 0x0E3937,
            title: "✅ 🩸🦈 **Verificación completada** 🩸🦈",
            description: `🎉 ¡Felicidades, **${playerDiscord}**! Tu cuenta **${playerName}** ha sido **verificada** con éxito.`,
            footer: { text: "🎮 ¡Prepárate para jugar!" },
          };
  
          try {
            await user.send({ embeds: [embed], components: [] });
  
            interaction.message.delete().catch(err => {
              console.error("❌ Error al eliminar mensaje de verificación:", err);
              interaction.reply({
                content: "⚠️ Hubo un error al eliminar el mensaje de verificación.",
                ephemeral: true,
              });
            });
  
            room.setUserDiscord(playerDiscord, playerName);
  
            // Enviar botón de desvinculación después de un pequeño delay
            setTimeout(() => {
              const unlinkButton = new ButtonBuilder()
                .setLabel("🔓 Unlink")
                .setStyle(ButtonStyle.Danger)
                .setCustomId(`unlink:${playerName}`);
  
              const row = new ActionRowBuilder().addComponents(unlinkButton);
  
              const unlinkEmbed = {
                color: 0xff0000,
                title: "🔓 🩸🦈 **Desvinculación de cuenta** 🩸🦈",
                description: `⚠️ Si deseas desvincularte, presiona el botón **"Unlink"**.`,
                footer: { text: "⏳ ¡El botón estará disponible temporalmente!" },
              };
  
              user.send({ embeds: [unlinkEmbed], components: [row] })
                .catch(error => {
                  console.error("❌ Error al enviar mensaje de desvinculación:", error);
                  interaction.followUp({
                    content: "⚠️ Hubo un error al enviarte el mensaje de desvinculación.",
                    ephemeral: true,
                  });
                });
            }, 1000); // Espera 1 segundo antes de enviar el botón de desvinculación
          } catch (error) {
            console.error("❌ Error al enviar mensaje de verificación:", error);
            interaction.reply({
              content: "⚠️ Hubo un error al enviarte el mensaje de verificación.",
              ephemeral: true,
            });
          }
        } else {
          sendError(interaction, "🔍 No se pudo encontrar el jugador asociado con esta solicitud de verificación.");
        }
      }
    }
  
  



    if (commandName === "top") {
      const tipo = options.getString("tipo");

      // Definición de variables
      let tipoEstadistica, tituloTipo, icono, color;
      const serverIconUrl = 'https://drive.google.com/uc?export=view&id=1Ajss2YRDxkQ-NbC940eKDbnbu_LRhXN8'; // URL del ícono del servidor


      // Mapeo de tipos de estadísticas a sus atributos
      const estadisticas = {
        goleadores: {
          tipo: "goals",
          titulo: "🏅 Top de Goleadores",
          icono: "🥅",
          color: 0xFFD700,
        },
        asistidores: {
          tipo: "assistances",
          titulo: "🅰️ Top de Asistidores",
          icono: "🤝",
          color: 0x1E90FF,
        },
        vallas: {
          tipo: "cleanSheets",
          titulo: "🧤 Top de Vallas Invictas",
          icono: "🏆",
          color: 0x32CD32,
        },
        golesContra: {
          tipo: "counterGoals",
          titulo: "❌ Top de Goles en Contra",
          icono: "⚽",
          color: 0xFF4500,
        },
        tiempoJugado: {
          tipo: "timePlayed",
          titulo: "⏱️ Top de Tiempo Jugado",
          icono: "⏳",
          color: 0x8A2BE2,
        },
      };

      // Validar tipo y obtener propiedades correspondientes
      if (estadisticas[tipo]) {
        ({ tipo: tipoEstadistica, titulo: tituloTipo, icono, color } = estadisticas[tipo]);
      } else {
        return interaction.reply("Tipo de estadística no válida. Debe ser 'goleadores', 'asistidores', 'vallas', 'golesContra', o 'tiempoJugado'.");
      }

      // Obtener los 10 mejores jugadores según la estadística especificada
      getTopPlayers(room, tipoEstadistica)
        .then(topPlayers => {
          const embed = {
            color: color, // Usar el color definido para cada top
            author: {
              name: `${tituloTipo}`,
              icon_url: serverIconUrl, // Icono del servidor
            },
            description: topPlayers.map(player =>
              `**${icono} ${player.position}. ${player.playerName}** - ${player.statistic}`
            ).join('\n'),
            footer: {
              text: "🏆 Estadísticas de jugadores",
              icon_url: serverIconUrl, // Icono del servidor
            },
            timestamp: new Date(),
          };

          interaction.reply({ embeds: [embed] });
        })
        .catch(error => {
          console.error('Error al obtener los mejores jugadores:', error);
          interaction.reply('Ocurrió un error al obtener los mejores jugadores. Por favor, intenta nuevamente más tarde.');
        });
    }


    if (commandName === "desvinculacion-manual") {
      // Verificar si el usuario tiene permisos para ejecutar el comando
      if (!hasPermission(interaction.member)) {
        return interaction.reply({
          content: "🚫 **Permiso denegado**\n\n❌ ¡No tienes permisos para ejecutar este comando!",
          ephemeral: true,
        });
      }
    
      // Obtener el nombre de usuario de Discord del argumento
      const discordUsername = interaction.options.getString('usuario');
      const foundPlayer = room.playersdb.find(player => player && player.discordUser && player.discordUser.includes(discordUsername));
    
      if (foundPlayer) {
        // Crear el botón de confirmación de desvinculación
        const unlinkButton = new ButtonBuilder()
          .setLabel("❌ Confirmar Desvinculación")
          .setStyle(ButtonStyle.Danger)
          .setCustomId(`confirm_unlink:${discordUsername}`);
    
        const row = new ActionRowBuilder().addComponents(unlinkButton);
    
        // Crear el embed con la información del jugador y emojis añadidos
        const unlinkEmbed = {
          color: 0xff0000,
          title: "🦈 **Solicitud de Desvinculación** 🦈",
          description:
            `🔍 **Jugador**: **${discordUsername}**\n` +
            `\n🔓 **Grupo**: ${foundPlayer.group || "Sin grupo"}\n` +
            `\n🌟 **Estadísticas Actuales**:\n` +
            `🏆 **Victorias**: ${foundPlayer.victories || 0}\n` +
            `😔 **Derrotas**: ${foundPlayer.defeated || 0}\n` +
            `⚽ **Goles**: ${foundPlayer.goals || 0}\n` +
            `\n❗ **Nota**: Si deseas **desvincular** esta cuenta de Discord, presiona el botón **"Confirmar Desvinculación"** aquí abajo.`,
          footer: {
            text: "⚠️ Este botón es temporal. Contacta con un administrador si tienes problemas.",
          },
        };
    
        // Enviar el embed con el botón de confirmación al canal de administración
        await interaction.reply({
          content: `📩 **Solicitud de Desvinculación Enviada**\n\n🔄 Se ha generado una solicitud de desvinculación para el jugador **${discordUsername}**. Espera la confirmación.`,
          embeds: [unlinkEmbed],
          components: [row],
          ephemeral: false,
        });
      } else {
        // Mensaje de error si no se encuentra el jugador
        await interaction.reply({
          content: `⚠️ **Jugador No Encontrado**\n\n❓ No se encontró ninguna cuenta de jugador vinculada al nombre de usuario de Discord **${discordUsername}**. Verifica el nombre y vuelve a intentarlo.`,
          ephemeral: true,
        });
      }
    }
    
    
    



    if (commandName === "desvincular") {

      // Obtener el nombre de usuario de Discord
      const discordUsername = interaction.user.username;

      // Buscar en room.playersdb al jugador con discordUser igual al nombre de usuario de Discord
      const foundPlayer = room.playersdb.find(player => player && player.discordUser === discordUsername);

      if (foundPlayer) {
        const playerName = foundPlayer.name;

        // Crear el botón de desvinculación
        const unlinkButton = new ButtonBuilder()
          .setLabel("❌ Desvincular")
          .setStyle(ButtonStyle.Danger)
          .setCustomId(`unlink:${playerName}`);

        const row = new ActionRowBuilder().addComponents(unlinkButton);

        const unlinkEmbed = {
          color: 0xff0000,
          title: "🦈 **Solicitud de Desvinculación en 'Todos Juegan Con Tiburón'** 🦈",
          description: `Estás vinculado a la cuenta del jugador **${playerName}**.\n\n` +
            `🔓 **Grupo**: ${foundPlayer.group}\n` +
            `🌟 **Estadísticas Actuales**:\n` +
            `- 🏆 **Victorias**: ${foundPlayer.victories}\n` +
            `- 😔 **Derrotas**: ${foundPlayer.defeated}\n` +
            `- ⚽ **Goles**: ${foundPlayer.goals}\n\n` +
            `Si deseas **desvincularte** de esta cuenta, presiona el botón de **Desvincular** aquí abajo.`,
          footer: {
            text: "⚠️ ¡El botón de desvinculación es temporal! Contacta con un administrador si tienes problemas."
          }
        };

        // Enviar mensaje directo con el botón al usuario de Discord
        await interaction.user.send({ embeds: [unlinkEmbed], components: [row] });

        await interaction.reply({
          content: `📩 **Solicitud enviada**\n\nSe ha enviado un mensaje de solicitud de **desvinculación** a tu cuenta de Discord.`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: `⚠️ **No estás vinculado**\n\nNo se encontró ninguna cuenta de jugador vinculada a tu Discord.`,
          ephemeral: true
        });
      }
    }

    if (commandName === "config-vip") {
      const discordUsername = interaction.user.username;
      const emoji = interaction.options.getString("emoji");
      const color = interaction.options.getString("color");
    
      // IDs de roles
      const eternalRoleId = "1235334957262700564";
      const mensualRoleId = "1209195725787897866";
    
      // Comprobar roles del usuario
      const isEternal = interaction.member.roles.cache.has(eternalRoleId);
      const isMensual = interaction.member.roles.cache.has(mensualRoleId);
    
      // Validar el color seleccionado según los roles del usuario
      if (
        (isEternal && !predefinedColors["Vip Eternal"].includes(color)) &&
        (isMensual && !predefinedColors["Vip Mensual"].includes(color))
      ) {
        return interaction.reply({
          content: "⚠️ **Color no válido**\nSelecciona un color de las opciones disponibles para tu categoría VIP.",
          ephemeral: true
        });
      }
    
      // Definir la categoría VIP basada en el color elegido
      const vipCategory = predefinedColors["Vip Eternal"].includes(color) ? "Vip Eternal" : "Vip Mensual";
    
      // Validar que el emoji sea estándar (Unicode) y no personalizado
      const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
      if (!emojiRegex.test(emoji)) {
        return interaction.reply({
          content: "⚠️ **Emoji no válido**\nSolo se permiten emojis estándar, no personalizados de Discord.",
          ephemeral: true
        });
      }
    
      // Convertir el color del formato '#RRGGBB' a un número entero en base 16 (hexadecimal)
      const colorInt = parseInt(color.replace("#", ""), 16);
    
      // Ruta al archivo JSON y datos del usuario
      const filePath = path.join(__dirname, '../json/config-vips.json');
      const userData = { username: discordUsername, emoji, color, vipCategory };
    
      // Leer, actualizar o agregar datos del usuario, y guardar en JSON
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
          console.error("Error al leer el archivo JSON:", err);
          return interaction.reply({
            content: "❌ **Error al cargar los datos**\nInténtalo nuevamente más tarde.",
            ephemeral: true
          });
        }
    
        const jsonData = data ? JSON.parse(data) : [];
        const userIndex = jsonData.findIndex(user => user.username === discordUsername);
    
        if (userIndex !== -1) {
          jsonData[userIndex] = userData;
        } else {
          jsonData.push(userData);
        }
    
        fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8', (writeErr) => {
          if (writeErr) {
            console.error("Error al guardar la personalización:", writeErr);
            return interaction.reply({
              content: "❌ **Error al guardar los datos**\nInténtalo nuevamente más tarde.",
              ephemeral: true
            });
          }
    
          // Crear el embed de respuesta
          const serverIconUrl = 'https://drive.google.com/uc?export=view&id=1Ajss2YRDxkQ-NbC940eKDbnbu_LRhXN8';
          const embed = {
            color: colorInt,
            author: {
              name: `Configuración VIP de ${discordUsername}`,
              icon_url: serverIconUrl, // Icono del servidor
            },
            title: "✅ Configuración Guardada",
            description: `**Emoji:** ${emoji}\n**Color:** ${color}\n**Categoría VIP:** ${vipCategory}`,
            footer: {
              text: "Gracias por apoyar a la TibuFamilia<3",
              icon_url: interaction.client.user.avatarURL(), // Icono del bot
            },
            timestamp: new Date(),
          };
    
          interaction.reply({ embeds: [embed] });
        });
      });
    }
    
    
    
    





    if (commandName === "ban") {
      if (!hasStaffPermission(interaction.member)) {
        return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
      }
      const targetName = options.getString("nombre");
      const banReason = options.getString("razon") || "No especificada";

      // Buscar el jugador en la sala de Haxball
      const targetPlayer = room.getPlayerList().find(p => p.name === targetName);
      let authId;

      // Primero, intenta obtener el authId del jugador en la sala
      if (targetPlayer) {
        authId = playerAuthMap.get(targetPlayer.id);
      }

      // Si no está en la sala, verifica en recentlyLeftPlayers
      if (!authId) {
        const recentlyLeftEntry = Array.from(recentlyLeftPlayers.entries()).find(([id, data]) => data.name === targetName);
        if (recentlyLeftEntry) {
          authId = recentlyLeftEntry[1].auth;
        }
      }

      if (authId) {
        console.log(`Intentando expulsar a ${targetName} con Auth ID: ${authId}`);
        addBannedPlayer({ name: targetName, auth: authId }, banReason);
        room.kickPlayer(targetPlayer?.id, "Has sido expulsado de esta sala.");

        const currentDate = new Date().toLocaleString();
        const banAnnouncementInGame = `🦈🚫 ${targetName} ha sido baneado del servidor por ${user.username}. Razón: ${banReason}. Fecha de sanción: ${currentDate} 🚫🦈`;
        room.sendAnnouncement(banAnnouncementInGame, null, 0xFFD700);

        const playerStats = room.getPlayerStats(targetName);
        if (playerStats) {
          playerStats.sancion = `Baneado por DS:${user.username} - Razón: ${banReason} - Fecha: ${currentDate}`;
        }

        const banAnnouncementForDiscord = `🦈🚫 **${targetName}** ha sido baneado del servidor por **${user.username}**. Razón: **${banReason}**. Fecha de sanción: **${currentDate}** 🚫🦈`;
        sendBanAnnouncementToDiscord(targetName, banAnnouncementForDiscord);

        await interaction.reply({
          content: `✅ **${targetName}** ha sido baneado exitosamente.`,
          ephemeral: false
        });
      } else {
        await interaction.reply({
          content: `⚠️ No se encontró Auth ID para **${targetName}**. No se pudo proceder con el baneo.`,
          ephemeral: false
        });
      }
    }

    if (commandName === "adv") {
      if (!hasStaffPermission(interaction.member)) {
        return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
      }
      const targetName = options.getString("nombre");
      const advReason = options.getString("razon");

      const playerId = room.getPlayerByName(targetName);

      if (playerId < 0) {
        await interaction.reply({
          content: "⚠️ Ese jugador no existe.",
          ephemeral: true
        });
      } else {
        const player = room.getPlayer(playerId);
        room.sendAnnouncement(
          `⚠️ ${player.name} ha sido advertido verbalmente por DS:${interaction.user.username}\nRazón: ${advReason} ⚠️`,
          null,
          0xFF0000,
          "bold"
        );
        room.playerAddAdvVerbal(player.name, advReason, interaction.user.username);

        await interaction.reply({
          content: `✅ **${targetName}** ha sido advertido correctamente.`,
          ephemeral: false
        });
      }
    }
    if (commandName === "kick") {
      if (!hasStaffPermission(interaction.member)) {
        return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
      }
      const targetName = options.getString("nombre");
      const kickReason = options.getString("razon");

      const playerId = room.getPlayerByName(targetName);

      if (playerId < 0) {
        await interaction.reply({
          content: "⚠️ Ese jugador no existe.",
          ephemeral: true
        });
      } else {
        const player = room.getPlayer(playerId);
        room.sendAnnouncement(
          `${player.name} ha sido expulsado por DS:${interaction.user.username}. Razón: ${kickReason}`,
          null,
          0xFF0000
        );
        const kickMessage = `Has sido expulsado por DS:${interaction.user.username}. Razón: ${kickReason}`;
        room.kickPlayer(playerId, kickMessage);
        room.playerAddKick(player.name, kickReason, interaction.user.username);

        await interaction.reply({
          content: `✅ **${targetName}** ha sido expulsado correctamente.`,
          ephemeral: false
        });
      }
    }


    if (commandName === "unban") {
      if (!hasStaffPermission(interaction.member)) {
        return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
      }
      const targetName = options.getString("nombre");

      // Llamar a la función para desbanear al jugador
      unbanPlayer(targetName); // Asegúrate de que esta función esté disponible

      // Limpiar las sanciones del jugador en la sala de Haxball
      const playerStats = room.getPlayerStats(targetName);
      if (playerStats) {
        playerStats.sancion = ""; // Limpia la sanción del jugador
      }

      // Anunciar el desbaneo en el servidor de Haxball
      const unbanAnnouncement = `Jugador ${targetName} ha sido desbaneado y sus sanciones han sido eliminadas.`;
      room.sendAnnouncement(unbanAnnouncement, null, 0x00FF00); // Enviar anuncio a la sala

      await interaction.reply({
        content: `✅ **${targetName}** ha sido desbaneado exitosamente y sus sanciones han sido eliminadas.`,
        ephemeral: false // Asegúrate de que este mensaje sea visible para todos
      });
    }


    if (commandName === "link") {
      const CONFIG = require(path.join(__dirname, "..", "json", "config.json"));
      let serverStatus;
    
      try {
        // Asegúrate de que la ruta al archivo sea correcta
        serverStatus = JSON.parse(fs.readFileSync('./json/serverStatus.json', 'utf-8')); // Cambia la ruta según tu estructura de carpetas
      } catch (error) {
        console.error("Error leyendo el estado del servidor:", error);
        serverStatus = { online: false }; // Valor por defecto si hay un error
      }
    
      // Verificamos si el servidor está en línea
      let embed;
      if (serverStatus.online) {
        const playersOnline = room.getPlayerList().length; // Devuelve la cantidad de jugadores conectados en tiempo real
        const maxPlayers = CONFIG.max_players; // Obtiene el valor del máximo de jugadores desde la configuración
    
        // Separamos los jugadores en equipos rojo y azul
        const redTeam = room.getPlayerList().filter(player => player.team === 1); // Red team
        const blueTeam = room.getPlayerList().filter(player => player.team === 2); // Blue team
    
        // Creamos las listas de jugadores por equipo
        const redTeamPlayers = redTeam.length > 0
          ? redTeam.map((player) => `🟥 ${player.name}`).join("\n")
          : "No hay jugadores en el equipo rojo";
        const blueTeamPlayers = blueTeam.length > 0
          ? blueTeam.map((player) => `🟦 ${player.name}`).join("\n")
          : "No hay jugadores en el equipo azul";
    
        // Creamos el embed con fondo negro para la información
        embed = {
          color: 0x00FF00, // Verde si el servidor está en línea
          title: "🟢 Estado Actual del Servidor 🟢",
          description: `🦈 **Todos Juegan Con Tiburón** 🦈\n\n` +
            `📊 **Información del Servidor**\n` +
            `**Región**: :flag_ar: Argentina\n` +
            `**Jugadores Conectados**: 👥 ${playersOnline}/${maxPlayers}\n` +
            `**Estado**: 🟢 En Línea\n\n` +
            `¡Únete al servidor y juega ahora! 🩸🦈`,
          fields: [
            {
              name: " ",
              value: '<:emoji_24:1285417320122159185>'.repeat(26), // Línea decorativa con emoji
              inline: false,
            },
            {
              name: "Equipo Rojo 🔴",
              value: `\`\`\`yaml\n${redTeamPlayers}\n\`\`\``, // Fondo negro para la lista de jugadores del equipo rojo
              inline: true, // Esto hará que los equipos estén uno al lado del otro
            },
            {
              name: "Equipo Azul 🔵",
              value: `\`\`\`yaml\n${blueTeamPlayers}\n\`\`\``, // Fondo negro para la lista de jugadores del equipo azul
              inline: true, // Esto hará que los equipos estén uno al lado del otro
            },
          ],
          footer: {
            text: "¡Gracias por jugar! 🥳",
          },
          timestamp: new Date(),
        };
    
        // Crear el botón para unirse al servidor si está en línea
        const join = new ButtonBuilder()
          .setLabel("👥 Unirse")
          .setURL(room.config.current_link)
          .setStyle(ButtonStyle.Link);
    
        const row = new ActionRowBuilder().addComponents(join);
    
        interaction.reply({ embeds: [embed], components: [row] });
    
      } else {
        // Si el servidor está offline
        embed = {
          color: 0xFF0000, // Rojo si el servidor está offline
          title: "🔴 Estado Actual del Servidor 🔴",
          description: `🦈 **Todos Juegan Con Tiburón** 🦈\n\n` +
            `📊 **Información del Servidor**\n` +
            `**Región**: :flag_ar: Argentina\n` +
            `**Jugadores Conectados**: ❌ No disponible\n` +
            `**Estado**: 🔴 Fuera de Línea\n\n` +
            `⚠️ **El servidor está actualmente apagado.**\n` +
            `🔔 **Mantente atento al ping server.**`,
        };
    
        interaction.reply({ embeds: [embed] }); // Sin botón, ya que el servidor está offline
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
    function generarLineaDivisoria(emoji, cantidad) {
      return new Array(cantidad).fill(emoji).join('');
    }


    if (commandName === "stats") {
      const playerName = interaction.options.getString("player");

      await interaction.deferReply();

      let playerStats;

      if (playerName == null) {
        playerStats = room.getPlayerStatsByDiscord(interaction.user.username);
      } else {
        playerStats = room.getPlayerStats(playerName);
      }

      if (playerStats && playerStats.name) {
        const rango = obtenerRango(playerStats.xp);
        actualizarGrupoJugador(playerStats, rango);

        const embed = {
          color: 0xFFD700,
          author: {
            name: `${playerStats.name}'s Stats`,
            icon_url: 'https://drive.google.com/uc?id=1_G8S8pcSGTSLZxniEsOSWMhQ0rXaDZs0',
          },
          fields: [
            {
              name: "🏅 **Rendimiento General**",
              value:
                `🥅 **Goles:** ${playerStats.goals}\n` +
                `❌ **Goles en contra:** ${playerStats.counterGoals}\n` +
                `👟 **Asistencias:** ${playerStats.assistances}\n` +
                `🧤 **Vallas invictas:** ${Math.round(playerStats.cleanSheets * 10) / 10}\n` + // Redondear a un decimal
                `🦵 **Tocadas:** ${playerStats.touches}\n` +
                `⏱️ **Tiempo Jugado:** ${formatTime(playerStats.timePlayed)}`,
              inline: false,
            },
            {
              name: " ", // Nombre de campo en blanco para evitar espacio
              value: '<:emoji_24:1285417320122159185>'.repeat(15),
              inline: false,
            },
            {
              name: "🎮 **Partidas y Resultados**",
              value:
                `🎮 **Partidos Jugados:** ${playerStats.games}\n` +
                `✅ **Victorias:** ${playerStats.victories}\n` +
                `❎ **Derrotas:** ${playerStats.defeated}`,
              inline: false,
            },
            {
              name: " ", // Nombre de campo en blanco para evitar espacio
              value: '<:emoji_24:1285417320122159185>'.repeat(15),
              inline: false,
            },
            {
              name: "🏆 **Información del Jugador**",
              value:
                `📃 **Grupo:** ${playerStats.group}\n` +
                `💬 **Discord:** ${playerStats.discordUser}\n` +
                `✨ **XP:** ${playerStats.xp}\n` +
                `🦈 **Rango:** ${rango}\n` +
                `🚫 **Sanción:** ${playerStats.sancion || "Ninguna"}`,
              inline: false,
            },
          ],
          thumbnail: {
            url: 'https://drive.google.com/uc?id=1_G8S8pcSGTSLZxniEsOSWMhQ0rXaDZs0',
          },
          footer: {
            text: "Estadísticas actualizadas",
            icon_url: 'https://drive.google.com/uc?id=1_G8S8pcSGTSLZxniEsOSWMhQ0rXaDZs0',
          },
          timestamp: new Date(),
        };

        await interaction.followUp({ embeds: [embed] });
      } else {
        await interaction.followUp("No se encontraron estadísticas para este jugador.");
      }
      return;
    }

    if (commandName === "group") {

      if (!hasPermission(interaction.member)) {
        return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
      }
      if (!interaction.member) {
        return interaction.reply({ content: "No se pudo obtener información del miembro.", ephemeral: true });
      }


      // Obtener las opciones del comando
      const playerName = interaction.options.getString("player");
      const playerGroupName = interaction.options.getString("group");

      // Validar que el jugador existe
      const player = room.playersdb.find(p => p.name === playerName);
      if (!player) {
        return interaction.reply({ content: `No se encontró al jugador con el nombre ${playerName}.`, ephemeral: true });
      }

      // Cambiar el grupo del jugador con manejo de errores
      try {
        room.playerSetGroup(playerName, playerGroupName);
      } catch (error) {
        return interaction.reply({ content: "Ocurrió un error al cambiar el grupo.", ephemeral: true });
      }

      // Respuesta con embed
      const embed = {
        color: 0xFFD700,
        title: "Cambio de grupo",
        description: `Se ha cambiado el grupo de ${playerName} a ${playerGroupName}`
      };

      interaction.reply({ embeds: [embed] });
    }





  });
}

client.login(process.env.DISCORD_TOKEN);

module.exports = { client, sendBanAnnouncementToDiscord, sendGeneralCommandToDiscord, LoadDiscordHandler, sendPlayerJoinMessage, sendPlayerLeaveMessage };

