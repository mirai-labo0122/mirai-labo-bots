const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
  console.log(`💫 DiscordBotログイン成功！→ ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('ギャビ')) {
    message.reply('はいはーい！ギャビが呼ばれたよんっ☆');
  }
});

function startDiscordBot() {
  client.login(process.env.DISCORD_BOT_TOKEN);
}

module.exports = startDiscordBot;
