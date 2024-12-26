import { ActiveRoomType } from "../types.js";

export default function generateUniqueCode(
  activeRoomsMap: Map<string, ActiveRoomType>
) {
  let code = "";
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const length = 4;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    code += alphabet[randomIndex];
  }

  if (activeRoomsMap.has(code)) return generateUniqueCode(activeRoomsMap);
  return code;
}
