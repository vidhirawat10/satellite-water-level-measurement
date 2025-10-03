import { io } from 'socket.io-client';

// The URL of your backend server
const URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Create the socket instance
// We keep autoConnect: false to have more control
export const socket = io(URL, {
    autoConnect: false
});