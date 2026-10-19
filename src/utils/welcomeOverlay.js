export const WELCOME_STORAGE_KEY = 'civicfix_welcomed';

// Reading window.sessionStorage itself can throw (blocked storage, some
// private modes), so it is only touched inside the try blocks below.
const sessionStore = () => window.sessionStorage;

export const hasSeenWelcome = (getStorage = sessionStore) => {
    try {
        return getStorage()?.getItem(WELCOME_STORAGE_KEY) === '1';
    } catch {
        return false;
    }
};

export const markWelcomeSeen = (getStorage = sessionStore) => {
    try {
        getStorage()?.setItem(WELCOME_STORAGE_KEY, '1');
    } catch {
        // The overlay just shows again next load; nothing else depends on it.
    }
};
