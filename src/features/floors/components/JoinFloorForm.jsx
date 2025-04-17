'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { userJoinedFloor } from '@/store/slices/userSlice';

export default function JoinFloorForm() {
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && codeFromUrl.length === 6) {
      console.log('[JoinFloorForm] Pre-filling code from URL:', codeFromUrl);
      setJoinCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleInputChange = (event) => {
    setJoinCode(event.target.value.slice(0, 6));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (joinCode.length !== 6) {
      setErrorMessage('Please enter a 6-character code.');
      setSuccessMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/floors/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: joinCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to join floor (${response.status})`
        );
      }

      setSuccessMessage(data.message || 'Successfully joined floor!');
      setJoinCode('');

      dispatch(userJoinedFloor({ floorId: data.floorId }));

      setTimeout(() => {
        router.push(`/floor/${data.floorId}`);
      }, 1500);
    } catch (error) {
      console.error('Error joining floor:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setSuccessMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-medium rounded-lg shadow border border-light/50 max-w-sm mx-auto">
      <h2 className="text-xl font-semibold text-white mb-4">Join a Floor</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="joinCode"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Enter 6-Character Code
          </label>
          <input
            type="text"
            id="joinCode"
            value={joinCode}
            onChange={handleInputChange}
            placeholder="ABCDEF"
            maxLength={6}
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-mono tracking-widest text-center"
            disabled={isLoading}
            autoCapitalize="characters"
            autoComplete="off"
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full px-5 py-2.5 mt-2 rounded-lg bg-brand text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand disabled:opacity-50 disabled:cursor-wait"
            disabled={isLoading || joinCode.length !== 6}
          >
            {isLoading ? 'Joining...' : 'Join Floor'}
          </button>
        </div>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-400 text-center">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="mt-4 text-sm text-green-300 text-center">
            {successMessage}
          </p>
        )}
      </form>
    </div>
  );
}
