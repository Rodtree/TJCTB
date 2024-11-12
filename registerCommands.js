const { REST, Routes } = require("discord.js");
const {colorChoices} = require("./utils");
require("dotenv").config();

const commands = [
  {
    name: "link",
    description: "Obten el link del servidor",
  },
  {
    name: "stats",
    description: "Mira tus estadísticas de juego o las de otro jugador",
    options: [
      {
        name: "player",
        description: "El nombre de usuario del jugador cuyas estadísticas deseas ver",
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: "transferstats",
    description: "Transfiere las estadísticas de un jugador a otro",
    options: [
      {
        name: "source_player",
        description: "Nombre del jugador desde el cual transferir las estadísticas",
        type: 3, // STRING
        required: true,
      },
      {
        name: "target_player",
        description: "Nombre del jugador al cual transferir las estadísticas",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "group",
    description: "Cambia el grupo de un jugador",
    permissions: ["ADMINISTRATOR"],
    options: [
      {
        name: "player",
        description: "Nombre del jugador",
        type: 3,
        required: true
      },
      {
        name: "group",
        description: "Grupo del jugador",
        type: 3,
        required: true,
        choices: [
          { name: "Default", value: "Default" },
          { name: "Ayudante", value: "Ayudante" },
          { name: "Mod", value: "Mod" },
          { name: "Programador", value: "Programador" },
          { name: "Admin", value: "Admin" },
          { name: "Jefe de Staff", value: "Jefe de Staff"},
          { name: "Fundador", value: "Fundador"},
          { name: "VIP", value: "Vip"},
          { name: "Tiburon de oro", value: "Tiburon de oro"},
          { name: "Asistente", value: "Asistente"},
        ],
      },
    ],
  },
  {
    name: "top",
    description: "Muestra los máximos goleadores, asistidores y vallas invictas.",
    options: [
      {
        name: "tipo",
        description: "Selecciona qué estadísticas deseas ver",
        type: 3,
        required: true,
        choices: [
          { name: "Goleadores", value: "goleadores" },
          { name: "Asistidores", value: "asistidores" },
          { name: "Vallas Invictas", value: "vallas" },
          { name: "Goles en Contra", value: "golesContra" },
          { name: "Tiempo Jugado", value: "tiempoJugado" }
        ],
      },
    ]
  },
  {
    name: "borrarstats",
    description: "Borra las estadísticas del servidor de Haxball",
  },
  {
    name: 'desvincular',
    description: 'Desvincula tu cuenta de Discord del sistema',
    options: [], // Ya no se necesita la opción 'nombre' porque se usará el usuario que ejecuta el comando
  },
  {
    name: 'config-vip',
    description: 'Personaliza tu perfil con un emoji y un color predefinido',
    options: [
      {
        name: 'emoji',
        type: 3,
        description: 'Elige un emoji para tu perfil',
        required: true
      },
      {
        name: 'color',
        type: 3,
        description: 'Elige un color entre los predefinidos',
        choices: colorChoices,
        required: true
      }
    ]
  },
  {
    name: "cambiar-token",
    description: "Modifica el token de Haxball",
    options: [
      {
        name: "nuevo_token",
        description: "Nuevo token de Haxball",
        type: 3,
        required: true
      }
    ]
  },
  {
    name: "ban",
    description: "Banea a un jugador de Haxball",
    options: [
        {
            name: "nombre",
            type: 3, // STRING
            description: "Nombre del jugador a banear",
            required: true
        },
        {
            name: "razon",
            type: 3, // STRING
            description: "Razón del baneo",
            required: false
        }
    ]
  },
{
  name: "adv",
  description: "Advierte a un jugador de Haxball",
  options: [
      {
          name: "nombre",
          type: 3,
          description: "Nombre del jugador a advertir",
          required: true
      },
      {
          name: "razon",
          type: 3,
          description: "Razón de la advertencia",
          required: true
      }
  ]
},

{
  name: "kick",
  description: "Expulsa a un jugador de Haxball",
  options: [
      {
          name: "nombre",
          type: 3,
          description: "Nombre del jugador a expulsar",
          required: true
      },
      {
          name: "razon",
          type: 3,
          description: "Razón de la expulsión",
          required: true
      }
  ]
},

  {
    name: "unban",
    description: "Desbanea a un jugador de Haxball",
    options: [
        {
            name: "nombre",
            type: 3,
            description: "Nombre del jugador a desbanear",
            required: true
        }
    ]
  },
  {
    name: "reiniciar-servidor",
    description: "Reinicia el servidor Haxball.",
  },
  {
    name: "sancionar",
    description: "Sanciona a un jugador",
    options: [
      {
        name: "nombre",
        description: "Nombre del jugador",
        type: 3,
        required: true
      },
      {
        name: "tipo",
        description: "Tipo de sanción",
        type: 3,
        required: true,
        choices: [
          { name: "Adv Verbal", value: "adv verbal" },
          { name: "Kick", value: "kick" },
          { name: "Ban", value: "ban" }
        ]
      },
      {
        name: "razon",
        description: "Razón de la sanción",
        type: 3,
        required: true
      }
    ]
},


];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerSlashCommands() {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error while reloading application (/) commands:", error);
  }
}

registerSlashCommands();
