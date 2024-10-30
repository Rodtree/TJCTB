const fs = require("fs");
const path = require("path");
const { exec } = require('child_process')
const { getTopPlayers } = require('../leaderboardHandler.js');
const { cargarRangos } = require("../utils.js");
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





async function sancionarJugador(interaction) {
  const nombreJugador = interaction.options.getString("nombre");
  const tipoSancion = interaction.options.getString("tipo");
  const razon = interaction.options.getString("razon");

  // Leer el archivo players.json
  let players = [];
  try {
    players = JSON.parse(fs.readFileSync("./json/players.json", "utf8"));
  } catch (error) {
    console.error("Error al leer el archivo players.json:", error);
  }

  // Buscar al jugador por su nombre
  const jugador = players.find((jugador) => jugador.name === nombreJugador);
  if (jugador) {
    // Actualizar las sanciones del jugador
    if (tipoSancion === "adv verbal") {
      jugador.sancion = `Adv verbal - Razón: ${razon}`;
    } else if (tipoSancion === "kick") {
      jugador.sancion = `Kick - Razón: ${razon}`;
    } else if (tipoSancion === "ban") {
      jugador.sancion = `Baneado - Razón: ${razon}`;
    }

    // Guardar los cambios en el archivo players.json
    fs.writeFileSync("./json/players.json", JSON.stringify(players, null, 2));

    await interaction.reply({
      content: `Sanción aplicada a ${nombreJugador}: ${tipoSancion} - Razón: ${razon}`,
      ephemeral: false
    });
  } else {
    await interaction.reply({
      content: `El jugador ${nombreJugador} no se encontró en la base de datos.`,
      ephemeral: true
    });
  }
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





const SERVIDOR_ID = "1132790184891645952";

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
    // Verificar roles permitidos
    const programadorRoleId = "1198718698245062777";
    const jefedestaffRolId = "1133233668199026799";
    const adminRolId = "1133233628894216302";

    if (
      !interaction.member.roles.cache.has(programadorRoleId) &&
      !interaction.member.roles.cache.has(jefedestaffRolId) &&
      !interaction.member.roles.cache.has(adminRolId)
    ) {
      return interaction.reply({
        content: "¡No tienes permisos para ejecutar este comando!",
        ephemeral: true // Solo visible para el usuario que ejecutó el comando
      });
    }

    // Ejecutar el comando para reiniciar el servidor
    ejecutarComandoTerminal('pm2 restart index'); // Opcionalmente, puedes cambiar 'pm2 restart 0' por 'node index.js' si prefieres reiniciar directamente desde el archivo principal

    // Responder confirmando que se ha enviado el comando para reiniciar el servidor
    interaction.reply({
      content: "Se ha enviado el comando para reiniciar el servidor.",
      ephemeral: false // Solo visible para el usuario que ejecutó el comando
    });
  }

  if (commandName === 'sancionar') {
    // Verificar roles permitidos para sancionar
    const programadorRoleId = "1198718698245062777";
    const jefedestaffRolId = "1133233668199026799";
    const adminRolId = "1133233628894216302";
    const modRolid = "1133233615627620372";
    const ayudanteRolid = "1133233397045670022";

    if (
      !interaction.member.roles.cache.has(programadorRoleId) &&
      !interaction.member.roles.cache.has(jefedestaffRolId) &&
      !interaction.member.roles.cache.has(adminRolId) &&
      !interaction.member.roles.cache.has(modRolid) &&
      !interaction.member.roles.cache.has(ayudanteRolid)
    ) {
      return interaction.reply({
        content: "¡No tienes permisos para ejecutar este comando!",
        ephemeral: true // Solo visible para el usuario que ejecutó el comando
      });
    }

    // Ejecutar la función para sancionar al jugador
    await sancionarJugador(interaction);

  }


  if (commandName === "cambiar-token") {
    // Obtener el nuevo token de Haxball proporcionado como argumento
    const nuevoToken = options.getString("nuevo_token");

    // Verificar roles permitidos
    const programadorRoleId = "1198718698245062777";
    const jefedestaffRolId = "1133233668199026799";
    const adminRolId = "1133233628894216302";

    if (
      !interaction.member.roles.cache.has(programadorRoleId) &&
      !interaction.member.roles.cache.has(jefedestaffRolId) &&
      !interaction.member.roles.cache.has(adminRolId)
    ) {
      return interaction.reply({
        content:
          "Â¡No tienes permisos para ejecutar este comando!",
        ephemeral: true // Solo visible para el usuario que ejecutÃ³ el comando
      });
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
    // Obtener el ID del primer rol permitido
    const programadorRoleId = "1198718698245062777";
    // Obtener el ID del segundo rol permitido
    const jefedestaffRolId = "1133233668199026799";
    // Obtener el ID del tercer rol permitido
    const adminRolId = "1133233628894216302";

    // Verificar si el usuario que ejecuta el comando tiene alguno de los roles permitidos
    if (!interaction.member.roles.cache.has(programadorRoleId) &&
      !interaction.member.roles.cache.has(jefedestaffRolId) &&
      !interaction.member.roles.cache.has(adminRolId)) {
      // Si el usuario no tiene ninguno de los roles permitidos y tampoco es administrador, responder con un mensaje indicando que no tiene permiso
      return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
    }

    // Lógica para borrar estadísticas aquí
    borrarEstadisticas(interaction);
  }

  


});

async function borrarEstadisticas(interaction) {
  try {
    // Leer el archivo players.json
    const data = fs.readFileSync("../json/players.json", "utf8");
    const players = JSON.parse(data);

    // Establecer discordUser y auth a cadenas vacías
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
    fs.writeFileSync("../json/players.json", JSON.stringify(players, null, 2));

    // Leer el archivo nuevamente para verificar si se guardaron los cambios
    const updatedData = fs.readFileSync("../json/players.json", "utf8");
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
    const { commandName, customId,options, user } = interaction;
    

    if (interaction.isButton()) {
      if (customId.startsWith("unlink:")) {
          const [, playerName] = customId.split(":");
  
          const foundPlayer = room.playersdb.find(player => player && player.name === playerName);
  
          if (foundPlayer && foundPlayer.discordUser === user.username) {
              foundPlayer.discordUser = "";
              foundPlayer.auth = "";
  
              fs.writeFileSync("./json/players.json", JSON.stringify(room.playersdb, null, 2));
  
              await interaction.reply({
                  content: `✅ **Desvinculación exitosa**\n\nTu cuenta de Discord ha sido **desvinculada** correctamente del jugador **${playerName}**.\n\n🔒 *Si deseas volver a vincular tu cuenta, puedes hacerlo en cualquier momento.*`,
                  ephemeral: true
              });
          } else {
              await interaction.reply({
                  content: `⚠️ **Error**\n\nNo estás vinculado a la cuenta de jugador **${playerName}**. Por favor, revisa tu información o contacta a un administrador si el problema persiste.`,
                  ephemeral: true
              });
          }
      }
  }
  
  
  

    if (interaction.isButton()) {
        if (customId.startsWith("verify:")) {
            const [, playerName, playerDiscord] = customId.split(":");

            let player = room.getPlayerObjectByName(playerName);

            if (player) {
                const embed = {
                    color: 0x0E3937,
                    title: "Verificación completada en 🩸🦈Todos Juegan Con Tiburón🦈🩸",
                    description: `¡Felicidades, **${playerDiscord}**! Tu cuenta **${playerName}** ha sido verificada.`,
                    footer: {
                        text: "¡Prepárate para jugar!"
                    }
                };

                await user.send({ embeds: [embed], components: [] })
                    .catch(error => {
                        console.error("Error al enviar mensaje de verificación:", error);
                        interaction.reply({
                            content: "Hubo un error al enviarte el mensaje de verificación.",
                            ephemeral: true
                        });
                    });

                interaction.message.delete()
                    .catch(error => {
                        console.error("Error al eliminar mensaje de verificación:", error);
                        interaction.reply({
                            content: "Hubo un error al eliminar el mensaje de verificación.",
                            ephemeral: true
                        });
                    });

                room.setUserDiscord(playerDiscord, playerName);

                // Después de eliminar el mensaje, enviar el botón de desvinculación
                setTimeout(() => {
                    const unlink = new ButtonBuilder()
                        .setLabel("Unlink")
                        .setStyle(ButtonStyle.Danger)
                        .setCustomId(`unlink:${playerName}`);

                    const row = new ActionRowBuilder().addComponents(unlink);

                    const unlinkEmbed = {
                        color: 0xff0000,
                        title: "Desvinculación en 🩸🦈Todos Juegan Con Tiburón🦈🩸",
                        description: `Si deseas desvincularte, presiona el botón que dice "Unlink".`,
                        footer: {
                            text: "¡El funcionamiento del boton es temporal!"
                        }
                    };

                    user.send({ embeds: [unlinkEmbed], components: [row] })
                        .catch(error => {
                            console.error("Error al enviar mensaje de desvinculación:", error);
                            interaction.followUp({
                                content: "Hubo un error al enviarte el mensaje de desvinculación.",
                                ephemeral: true
                            });
                        });
                }, 1000); // Espera 1 segundo antes de enviar el botón de desvinculación (ajusta según necesites)
            } else {
                interaction.reply({
                    content: "No se pudo encontrar el jugador asociado con esta solicitud de verificación.",
                    ephemeral: true
                });
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
          
          embed = {
              color: 0x00FF00, // Verde si el servidor está en línea
              title: "🟢 Estado Actual del Servidor 🟢",
              description: `🦈 **Todos Juegan Con Tiburón** 🦈\n\n` +
                  `📊 **Información del Servidor**\n` +
                  `**Región**: :flag_ar: Argentina\n` +
                  `**Jugadores Conectados**: 👥 ${playersOnline}/${maxPlayers}\n` +
                  `**Estado**: 🟢 En Línea\n\n` +
                  `¡Únete al servidor y juega ahora! 🩸🦈`,
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
      // Verificar si interaction.member está definido
      if (!interaction.member) {
        return interaction.reply({ content: "No se pudo obtener información del miembro.", ephemeral: true });
      }
    
      // Verificar si el usuario tiene roles asignados
      if (!interaction.member.roles || interaction.member.roles.cache.size === 0) {
        return interaction.reply({ content: "¡No tienes roles asignados para ejecutar este comando!", ephemeral: true });
      }
    
      // Obtener los IDs de roles permitidos
      const programadorRoleId = "1198718698245062777";
      const jefedestaffRolId = "1133233668199026799";
      const adminRolId = "1133233628894216302";
    
      // Verificar si el usuario tiene alguno de los roles permitidos
      if (!interaction.member.roles.cache.has(programadorRoleId) &&
          !interaction.member.roles.cache.has(jefedestaffRolId) &&
          !interaction.member.roles.cache.has(adminRolId)) {
        return interaction.reply({ content: "¡No tienes permisos para ejecutar este comando!", ephemeral: true });
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

