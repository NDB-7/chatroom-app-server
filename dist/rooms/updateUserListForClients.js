import activeRoomsMap from "../config/activeRoomsMap.js";
import { io } from "../index.js";
export default function updateUserListForClients(room) {
    const onlineUserList = [];
    const offlineUserList = [];
    const { sessionToUsersMap, allUsersSet, activeSessionsMap } = activeRoomsMap.get(room);
    sessionToUsersMap.forEach((name, sessionId) => {
        if (new Set(activeSessionsMap.values()).has(sessionId))
            onlineUserList.push(name);
    });
    allUsersSet.forEach(name => {
        if (!onlineUserList.includes(name))
            offlineUserList.push(name);
    });
    io.to(room).emit("updateUserList", onlineUserList, offlineUserList);
}
//# sourceMappingURL=updateUserListForClients.js.map