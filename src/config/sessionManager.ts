// sessionManager.ts
interface UserSession {
    state: string;
    timeoutHandle?: NodeJS.Timeout;
  }
  
  const userSessions: { [key: string]: UserSession } = {};
  
  export function getSession(senderId: string): UserSession | undefined {
    return userSessions[senderId];
  }
  
  export function createSession(senderId: string, state: string): void {
    userSessions[senderId] = { state };
  }
  
  export function updateSession(senderId: string, state: string): void {
    if (userSessions[senderId]) {
      userSessions[senderId].state = state;
    }
  }
  
  export function setTimeoutHandle(senderId: string, handle: NodeJS.Timeout): void {
    if (userSessions[senderId]) {
      userSessions[senderId].timeoutHandle = handle;
    }
  }
  
  export function clearTimeoutHandle(senderId: string): void {
    if (userSessions[senderId]?.timeoutHandle) {
      clearTimeout(userSessions[senderId].timeoutHandle!);
      userSessions[senderId].timeoutHandle = undefined;
    }
  }
  
  export function deleteSession(senderId: string): void {
    delete userSessions[senderId];
  }  