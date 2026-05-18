/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function usePushNotifications() {
    const { user } = useAuth();
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        setIsSupported(false);
    }, []);

    const subscribe = async () => {
        if (!isSupported || !user) return false;

        try {
                        return false;

        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return false;
        }
    };

    return { isSupported, isSubscribed, subscribe };
}
