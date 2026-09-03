/// <reference types="vite/client" />
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export function usePushNotifications() {
    const { user } = useAuth();
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        const supported = typeof window !== 'undefined'
            && 'Notification' in window
            && 'serviceWorker' in navigator
            && 'PushManager' in window;
        setIsSupported(supported);

        if (supported) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => registration.pushManager.getSubscription())
                .then(subscription => setIsSubscribed(!!subscription))
                .catch(error => console.error('Failed to initialize web push:', error));
        }
    }, []);

    const subscribe = async () => {
        if (!isSupported || !user) return false;

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;

            const registration = await navigator.serviceWorker.ready;
            const existing = await registration.pushManager.getSubscription();
            const subscription = existing || await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
            });

            await api.push.subscribe(user.uid, subscription);
            setIsSubscribed(true);
            return true;

        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            return false;
        }
    };

    return { isSupported, isSubscribed, subscribe };
}

function urlBase64ToUint8Array(value: string): Uint8Array {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(character => character.charCodeAt(0)));
}

