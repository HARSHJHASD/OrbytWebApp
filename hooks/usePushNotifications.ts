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
                .then(async registration => {
                    const existing = await registration.pushManager.getSubscription();
                    // If the server's push keys were rotated, a subscription made with the
                    // old key can never receive pushes again. Re-subscribe with the current
                    // key (permission is already granted, so there is no prompt).
                    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                    if (existing && vapidKey && Notification.permission === 'granted' && !sameKey(existing, vapidKey)) {
                        try {
                            await existing.unsubscribe();
                            return await registration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
                            });
                        } catch {
                            return null;
                        }
                    }
                    return existing;
                })
                .then(subscription => {
                    setIsSubscribed(!!subscription);
                    // Re-send an existing subscription after login: the server detaches
                    // a browser from its previous account and drops expired ones, and
                    // nothing ever sent it again, so pushes stopped silently.
                    if (subscription && user?.uid && Notification.permission === 'granted') {
                        api.push.subscribe(user.uid, subscription).catch(() => {});
                    }
                })
                .catch(error => console.error('Failed to initialize web push:', error));
        }
    }, [user?.uid]);

    // A notification click on a tab the worker doesn't control arrives as a message.
    useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
        const onMessage = (event: MessageEvent) => {
            if (event.data?.type === 'navigate' && typeof event.data.url === 'string') {
                const url = new URL(event.data.url, window.location.origin);
                if (url.origin === window.location.origin) window.location.assign(url.href);
            }
        };
        navigator.serviceWorker.addEventListener('message', onMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onMessage);
    }, []);

    const subscribe = async () => {
        if (!isSupported || !user) return false;

        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
            console.error('VITE_VAPID_PUBLIC_KEY is not set in this build — web push is unavailable.');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return false;

            const registration = await navigator.serviceWorker.ready;
            const existing = await registration.pushManager.getSubscription();
            const subscription = existing || await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
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

function sameKey(subscription: PushSubscription, vapidKey: string): boolean {
    const current = subscription.options?.applicationServerKey;
    if (!current) return true; // browser doesn't expose it: assume unchanged
    const a = new Uint8Array(current);
    const b = urlBase64ToUint8Array(vapidKey);
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

function urlBase64ToUint8Array(value: string): Uint8Array {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(character => character.charCodeAt(0)));
}

