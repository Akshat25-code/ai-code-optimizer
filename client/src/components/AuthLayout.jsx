import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-[calc(100vh-64px)] theme-hero flex items-center justify-center relative overflow-hidden px-4">
      {/* Ambient gradient accents shared across auth pages */}
      <div className="absolute -top-40 -left-24 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-35" style={{background:'radial-gradient(45% 45% at 50% 50%, rgba(168,85,247,0.25), rgba(59,130,246,0.12) 70%, transparent)'}} />
      <div className="absolute -bottom-48 -right-24 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-30" style={{background:'radial-gradient(45% 45% at 50% 50%, rgba(59,130,246,0.22), rgba(168,85,247,0.10) 70%, transparent)'}} />
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
