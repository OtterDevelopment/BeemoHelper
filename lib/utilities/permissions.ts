import { BitField } from "@sapphire/bitfield";
import { PermissionFlagsBits } from "@discordjs/core";

const PermissionsBitField = new BitField(PermissionFlagsBits);

export default PermissionsBitField;
