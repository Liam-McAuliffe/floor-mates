// src/features/auth/components/GoogleSignInButton.jsx
'use client';

import { signIn } from 'next-auth/react';
import { FaGoogle } from 'react-icons/fa'; // Using react-icons

export default function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn('google', { callbackUrl: '/' })}
      className="
        inline-flex items-center justify-center gap-3  
        px-5 py-2.5                              
        border border-transparent      
        text-base font-medium           
        rounded-lg shadow-sm                       
        text-white                   
        bg-brand-green                           
        hover:bg-md-green                            
        focus:outline-none focus:ring-2
        focus:ring-offset-2 focus:ring-brand-green
        focus:ring-offset-dk-green                   
        transition-colors duration-150 ease-in-out  
        disabled:opacity-60 disabled:cursor-not-allowed 
      "
    >
      <FaGoogle className="w-5 h-5" />
      <span>Sign in with Google</span>
    </button>
  );
}
