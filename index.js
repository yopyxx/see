// @ts-nocheck
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  REST,
  Routes
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // 봇 애플리케이션 ID
const GUILD_ID = process.env.GUILD_ID;   // 서버 ID

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`${client.user.tag} 로그인 완료`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== '보이기') return;

  // 이 명령어를 관리자만 쓰게 하고 싶으면 아래 체크 유지
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '이 명령어는 관리자만 사용할 수 있습니다.',
      ephemeral: true
    });
  }

  const roleId = interaction.options.getString('역할id', true);
  const categoryId = interaction.options.getString('카테고리id', true);

  try {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
      return interaction.reply({
        content: '유효하지 않은 역할 ID입니다.',
        ephemeral: true
      });
    }

    const channel = await interaction.guild.channels.fetch(categoryId);
    if (!channel) {
      return interaction.reply({
        content: '유효하지 않은 카테고리 ID입니다.',
        ephemeral: true
      });
    }

    if (channel.type !== ChannelType.GuildCategory) {
      return interaction.reply({
        content: '입력한 채널은 카테고리가 아닙니다.',
        ephemeral: true
      });
    }

    // 카테고리 자체 권한 수정
    await channel.permissionOverwrites.edit(role.id, {
      ViewChannel: true,
      ReadMessageHistory: true
    });

    return interaction.reply({
      content: `성공적으로 <@&${role.id}> 역할에 <#${channel.id}> 카테고리의 채널 보기 / 메시지 기록 보기 권한을 허용했습니다.`,
      ephemeral: true
    });
  } catch (error) {
    console.error(error);
    return interaction.reply({
      content: '권한 설정 중 오류가 발생했습니다. 봇 역할 위치와 권한을 확인해주세요.',
      ephemeral: true
    });
  }
});

// 슬래시 명령어 등록
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('보이기')
      .setDescription('특정 역할이 특정 카테고리를 볼 수 있도록 설정합니다.')
      .addStringOption(option =>
        option
          .setName('역할id')
          .setDescription('권한을 줄 역할 ID')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('카테고리id')
          .setDescription('권한을 줄 카테고리 ID')
          .setRequired(true)
      )
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log('슬래시 명령어 등록 완료');
}

registerCommands()
  .then(() => client.login(TOKEN))
  .catch(console.error);