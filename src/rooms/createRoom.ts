import activeRoomsMap from "../config/activeRoomsMap.js";

export default function createRoom(code: string, name: string) {
  activeRoomsMap.set(code, {
    data: {
      name,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    },
    sessionToUsersMap: new Map<string, string>(),
    activeSessionsMap: new Map<string, string>(),
    allUsersSet: new Set<string>(),
    messagesCache: [],
  });
}
