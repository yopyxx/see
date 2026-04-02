// @ts-nocheck
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  REST,
  Routes
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================== 슬래시 명령어 등록 ==================
const commands = [
  new SlashCommandBuilder()
    .setName("추가")
    .setDescription("역할에게 모든 비공개 채널 보기 권한 부여")
    .addStringOption(option =>
      option.setName("역할id")
        .setDescription("여러개 가능 (쉼표로 구분)")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("슬래시 명령어 등록 완료");
})();

// ================== 명령어 실행 ==================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "추가") {
    const roleInput = interaction.options.getString("역할id");

    // 여러 역할 ID 처리
    const roleIds = roleInput.split(",").map(id => id.trim());

    await interaction.reply({ content: "권한 적용 중...", ephemeral: true });

    const guild = interaction.guild;

    let successCount = 0;

    for (const roleId of roleIds) {
      const role = guild.roles.cache.get(roleId);
      if (!role) continue;

      // 모든 채널 순회
      for (const channel of guild.channels.cache.values()) {
        try {
          await channel.permissionOverwrites.edit(role, {
            ViewChannel: true
          });
          successCount++;
        } catch (err) {
          console.log(`권한 설정 실패: ${channel.name}`);
        }
      }
    }

    await interaction.editReply({
      content: `✅ 완료! 총 ${successCount}개 채널에 권한 적용됨`
    });
  }
});

client.login(TOKEN);
