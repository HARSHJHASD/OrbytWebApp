import { ArrowRight, Lock, Mail } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { MainLogo } from '../util/Images';

declare global {
  interface Window {
    google: any;
  }
}

const AuthPage: React.FC = () => {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------- EMAIL / PASSWORD LOGIN ---------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let response;
      if (isLogin) {
        response = await api.auth.login(email, password);
      } else {
        response = await api.auth.signup(email, password);
      }
      login(response.user);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- GOOGLE LOGIN ---------------- */

  const decodeJwt = (token: string) => {
    try {
      const base64Url:any = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const handleCredentialResponse = async (response: any) => {
    if (!response.credential) return;

    const payload = decodeJwt(response.credential);
    if (!payload) return;

    try {
      const apiResponse = await api.auth.googleLogin(
        payload.email,
        payload.name,
        ""
      );
      login(apiResponse.user);
    } catch {
      setError("Google login failed.");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadGoogleScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.google?.accounts) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;

        script.onload = () => resolve();
        script.onerror = () => reject();

        document.body.appendChild(script);
      });
    };

    const initializeGoogle = async () => {
      try {
        await loadGoogleScript();
        if (!isMounted) return;

        if (!window.google) return;

        window.google.accounts.id.initialize({
          client_id:
            "793742543220-aggmdtptgpbns7vrem2ftpelnv73g4e4.apps.googleusercontent.com",
          callback: handleCredentialResponse,
        });

        const btnContainer = document.getElementById("googleBtn");

        if (btnContainer) {
          btnContainer.innerHTML = ""; // prevent duplicate renders

          window.google.accounts.id.renderButton(btnContainer, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with",
            shape: "pill",
            logo_alignment: "left",
          });
        }
      } catch (error) {
        console.error("Google script failed to load", error);
      }
    };

    initializeGoogle();

    return () => {
      isMounted = false;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-slate-900 to-slate-950 -z-10" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary-500/20 rounded-full blur-3xl opacity-50 -z-10 animate-pulse" />
      <div className="absolute top-[20%] left-[-10%] w-48 h-48 bg-purple-500/20 rounded-full blur-3xl opacity-50 -z-10" />

      <div className="flex-1 flex flex-col px-6 pt-12 pb-6 max-w-md mx-auto w-full justify-center">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex py-8 items-center">
            <img
              src={MainLogo}
              alt="Orbyt Logo"
               draggable={false}
              className="h-14 w-auto object-contain"
            />
          </div>

          <p className="text-slate-400 text-lg max-w-[280px]">
            {isLogin
              ? 'Welcome back! Your community is waiting.'
              : 'Create a profile and start connecting instantly.'}
          </p>
        </div>

        <div className="w-full bg-slate-900/50 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="hello@example.com"
                label="Email Address"
                icon={<Mail className="w-5 h-5" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                type="password"
                placeholder="••••••••"
                label="Password"
                icon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 text-sm border border-red-500/20 text-center">
                {error}
              </div>
            )}

            <div className="pt-4 space-y-4">
              <Button type="submit" fullWidth isLoading={loading}>
                {isLogin ? 'Sign In' : 'Create Account'}
                {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="mx-4 text-slate-500 text-sm">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div
                id="googleBtn"
                className="w-full flex justify-center min-h-[48px]"
              />
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setEmail('');
                setPassword('');
              }}
              className="text-sm font-semibold text-slate-500 hover:text-primary-400"
            >
              {isLogin ? (
                <>New to Orbyt? <span className="text-primary-400">Sign Up</span></>
              ) : (
                <>Have an account? <span className="text-primary-400">Log In</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;