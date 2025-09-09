import { createContext, useContext } from 'react';

export const SocketContext = createContext(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (socket === undefined) {
    console.warn('useSocket must be used within a SocketContext provider');
  }
  return socket;
};