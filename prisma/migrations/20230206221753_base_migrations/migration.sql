-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('TEXT_COMMAND', 'APPLICATION_COMMAND');

-- CreateTable
CREATE TABLE "command_cooldowns" (
    "userId" TEXT NOT NULL,
    "commandName" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "commandType" "CommandType" NOT NULL,

    CONSTRAINT "command_cooldowns_pkey" PRIMARY KEY ("commandName","commandType","userId")
);

-- CreateTable
CREATE TABLE "user_languages" (
    "userId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,

    CONSTRAINT "user_languages_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("guildId")
);
