const { client } = require("./discord/discord");
const Discord = require('discord.js');
const fs = require("fs");
const path = require("path");

function LoadRecordHandler(room) {
  room.startRecord = function () {
    room.startRecording();
  };

  room.stopRecord = function () {
    fs.writeFile('Todos_Juegan_Con_Tiburón_Match.hbr2', room.stopRecording(), 'utf8', (error) => {
      if (!error) {
        let channel = client.channels.cache.get(room.config.discord_channels.games);
        channel.send({files: [path.join("Todos_Juegan_Con_Tiburón_Match.hbr2")]});
      }
    });
  };
}                                      

module.exports = { LoadRecordHandler };


