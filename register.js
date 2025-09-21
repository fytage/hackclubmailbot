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

const LETTERS_COMMAND = {
  name: 'letters',
  type: 1,
  description: 'Check your Hack Club letters.',
  options: [
    {
      type: 3,
      name: 'query',
      description: 'Search for letters by title.',
      required: false,
    },
  ],
  integration_types: [1],
  contexts: [0, 1, 2],
};

const PACKAGES_COMMAND = {
  name: 'packages',
  type: 1,
  description: 'Check your Hack Club packages.',
  options: [
    {
      type: 3,
      name: 'query',
      description: 'Search for packages by title.',
      required: false,
    },
  ],
  integration_types: [1],
  contexts: [0, 1, 2],
};

const STATS_COMMAND = {
    name: 'stats',
    description: 'View statistics about your Hack Club mail.',
    type: 1,
    integration_types: [1],
    contexts: [0, 1, 2],
};

const NOTIFICATIONS_COMMAND = {
    name: 'notifications',
    description: 'Toggle automatic notifications for mail updates.',
    type: 1,
    integration_types: [1],
    contexts: [0, 1, 2],
};

const DELETEME_COMMAND = {
    name: 'deleteme',
    description: 'Removes your API key and all associated data from the bot.',
    type: 1,
    integration_types: [1],
    contexts: [0, 1, 2],
};

const HELP_COMMAND = {
    name: 'help',
    description: 'Displays information about all available commands.',
    type: 1,
    integration_types: [1],
    contexts: [0, 1, 2],
};

const ALL_COMMANDS = [
  SETUP_COMMAND,
  LETTERS_COMMAND,
  PACKAGES_COMMAND,
  STATS_COMMAND,
  NOTIFICATIONS_COMMAND,
  DELETEME_COMMAND,
  HELP_COMMAND,
];
// Call the command registration function
InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);