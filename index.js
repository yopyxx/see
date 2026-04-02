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
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`${client.user.tag} 로그인 완료`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== '보이기') return;

  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '관리자만 사용 가능합니다.',
      ephemeral: true
    });
  }

  const roleInput = interaction.options.getString('역할id', true);
  const categoryId = interaction.options.getString('카테고리id', true);

  // 👉 여러 역할 분리 (공백 + 쉼표 둘 다 지원)
  const roleIds = roleInput
    .split(/[\s,]+/)
    .map(id => id.trim())
    .filter(id => id.length > 0);

  try {
    const channel = await interaction.guild.channels.fetch(categoryId);

    if (!channel || channel.type !== ChannelType.GuildCategory) {
      return interaction.reply({
        content: '유효한 카테고리 ID를 입력해주세요.',
        ephemeral: true
      });
    }

    let successRoles = [];
    let failedRoles = [];

    for (const roleId of roleIds) {
      try {
        const role = await interaction.guild.roles.fetch(roleId);
        if (!role) {
          failedRoles.push(roleId);
          continue;
        }

        await channel.permissionOverwrites.edit(role.id, {
          ViewChannel: true,
          ReadMessageHistory: true
        });

        successRoles.push(`<@&${role.id}>`);
      } catch (err) {
        failedRoles.push(roleId);
      }
    }

    let msg = `✅ 완료\n\n`;

    if (successRoles.length > 0) {
      msg += `허용된 역할:\n${successRoles.join('\n')}\n\n`;
    }

    if (failedRoles.length > 0) {
      msg += `❌ 실패한 역할ID:\n${failedRoles.join('\n')}`;
    }

    return interaction.reply({
      content: msg,
      ephemeral: true
    });

  } catch (error) {
    console.error(error);
    return interaction.reply({
      content: '오류 발생 (봇 권한 / 역할 위치 확인)',
      ephemeral: true
    });
  }
});

// 슬래시 등록
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('보이기')
      .setDescription('여러 역할에게 카테고리 보기 권한 부여')
      .addStringOption(option =>
        option.setName('역할id')
          .setDescription('여러 역할ID 입력 (띄어쓰기 또는 , 로 구분)')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('카테고리id')
          .setDescription('카테고리 ID')
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
