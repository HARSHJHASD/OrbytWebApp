import React from 'react';

const Avatar = React.memo(function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return src ? (
    <img src={src} alt={name} loading="lazy" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
});

export default Avatar;
