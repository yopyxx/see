// index.js
// npm i discord.js
// Node.js 18+ 권장

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  ChannelType
} = require('discord.js');

const TOKEN = '여기에_봇_토큰';
const CLIENT_ID = '여기에_봇_클라이언트_ID';
const GUILD_ID = '여기에_서버_ID';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// -------------------------
// 슬래시 명령어 등록
// -------------------------
const commands = [
  new SlashCommandBuilder()
    .setName('추가')
    .setDescription('입력한 역할이 모든 비공개 카테고리/채널을 볼 수 있게 설정합니다.')
    .addStringOption(option =>
      option
        .setName('역할id')
        .setDescription('쉼표(,)로 여러 역할 ID 입력 가능')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('슬래시 명령어 등록 시작...');
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('슬래시 명령어 등록 완료');
  } catch (err) {
    console.error('슬래시 명령어 등록 오류:', err);
  }
}

// -------------------------
// 비공개 채널 판별
// @everyone가 ViewChannel = false 이면 비공개로 간주
// -------------------------
function isPrivateChannel(channel, everyoneRoleId) {
  const overwrite = channel.permissionOverwrites.cache.get(everyoneRoleId);
  if (!overwrite) return false;

  return overwrite.deny.has(PermissionFlagsBits.ViewChannel);
}

// -------------------------
// 역할 ID 문자열 파싱
// 예: "123,456,789"
// -------------------------
function parseRoleIds(input) {
  return input
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

// -------------------------
// 메인
// -------------------------
client.once('ready', () => {
  console.log(`${client.user.tag} 로그인 완료`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== '추가') return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const guild = interaction.guild;
    if (!guild) {
      return interaction.editReply('서버 안에서만 사용할 수 있습니다.');
    }

    const input = interaction.options.getString('역할id', true);
    const roleIds = parseRoleIds(input);

    if (roleIds.length === 0) {
      return interaction.editReply('역할 ID를 올바르게 입력해주세요.');
    }

    const everyoneRoleId = guild.roles.everyone.id;

    const validRoles = [];
    const invalidRoleIds = [];

    for (const roleId of roleIds) {
      const role = await guild.roles.fetch(roleId).catch(() => null);
      if (!role) invalidRoleIds.push(roleId);
      else validRoles.push(role);
    }

    if (validRoles.length === 0) {
      return interaction.editReply(
        `유효한 역할을 찾지 못했습니다.\n잘못된 역할 ID: ${invalidRoleIds.join(', ')}`
      );
    }

    const allChannels = guild.channels.cache.filter(ch =>
      [
        ChannelType.GuildCategory,
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildVoice,
        ChannelType.GuildStageVoice,
        ChannelType.GuildForum,
        ChannelType.GuildMedia
      ].includes(ch.type)
    );

    const privateChannels = allChannels.filter(channel =>
      isPrivateChannel(channel, everyoneRoleId)
    );

    if (privateChannels.size === 0) {
      return interaction.editReply('비공개 카테고리/채널을 찾지 못했습니다.');
    }

    let updatedCount = 0;
    const failedChannels = [];

    for (const channel of privateChannels.values()) {
      try {
        for (const role of validRoles) {
          await channel.permissionOverwrites.edit(role.id, {
            ViewChannel: true,
            ReadMessageHistory: true
          });
        }
        updatedCount++;
      } catch (err) {
        console.error(`권한 수정 실패: ${channel.name} (${channel.id})`, err);
        failedChannels.push(`${channel.name} (${channel.id})`);
      }
    }

    let result = `완료되었습니다.\n`;
    result += `대상 역할: ${validRoles.map(r => `${r.name}(${r.id})`).join(', ')}\n`;
    result += `처리된 비공개 카테고리/채널 수: ${updatedCount}개`;

    if (invalidRoleIds.length > 0) {
      result += `\n\n잘못된 역할 ID:\n${invalidRoleIds.join(', ')}`;
    }

    if (failedChannels.length > 0) {
      result += `\n\n처리 실패 채널:\n${failedChannels.join('\n')}`;
    }

    await interaction.editReply(result);
  } catch (err) {
    console.error(err);
    await interaction.editReply('오류가 발생했습니다.');
  }
});

registerCommands();
client.login(TOKEN);
