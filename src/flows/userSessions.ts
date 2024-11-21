// Agrega esto al inicio de tu archivo o en un módulo separado
interface UserSession {
  state: string;
  timeoutHandle?: NodeJS.Timeout;
}

const userSessions: { [key: string]: UserSession } = {};
