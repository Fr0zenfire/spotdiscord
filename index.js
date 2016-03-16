var DiscordClient = require('discord.io');

// configuration shit
require("./lib/config/bot.js");

var reu = new DiscordClient(clientSettings);

reu.on('ready', function() {
  console.log("Successfully connected.");
})

reu.on('disconnected', function() {
  reu.connect();
});
