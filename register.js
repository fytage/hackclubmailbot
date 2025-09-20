import 'dotenv/config';
import { REST, Routes } from 'discord.js';

// Function to register commands
async function InstallGlobalCommands(appId, commands) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(appId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

const SETUP_COMMAND = {
  name: 'setup',
  type: 1,
  description: 'Enter your Hack Club Mail API key.',
  options: [
    {
      type: 3,
      name: 'api-key',
      description: 'Your API key from mail.hackclub.com/my/api_keys',
      required: true,
    },
  ],
  integration_types: [1],
  contexts: [0, 1, 2],
};

const MAIL_COMMAND = {
  name: 'mail',
  type: 1,
  description: 'Check your Hack Club mail.',
  options: [],
  integration_types: [1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [
  SETUP_COMMAND,
  MAIL_COMMAND,
];

// Call the command registration function
InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);