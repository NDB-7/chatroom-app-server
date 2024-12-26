import activeRoomsMap from "../config/activeRoomsMap.js";
export default function createRoom(code, name) {
    activeRoomsMap.set(code, {
        data: {
            name,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
        },
        sessionToUsersMap: new Map(),
        activeSessionsMap: new Map(),
        allUsersSet: new Set(),
        messagesCache: [],
    });
}
//# sourceMappingURL=createRoom.js.map