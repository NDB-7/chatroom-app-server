export type ActiveRoomType = {
  data: {
    name: string;
    createdAt: number;
    expiresAt: number;
  };
  sessionToUsersMap: Map<string, string>;
  activeSessionsMap: Map<string, string>;
  allUsersSet: Set<string>;
  messagesCache: ServerMessageType[];
};

export type ServerMessageType = {
  sender?: string;
  content: string;
  serverNotification: boolean;
  sentAt?: number;
  cache?: boolean;
};
