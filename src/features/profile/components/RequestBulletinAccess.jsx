'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import {
  Loader2,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export default function RequestBulletinAccess() {
  const userProfile = useSelector(selectUserProfile);
  const [clubName, setClubName] = useState('');
  const [currentStatus, setCurrentStatus] = useState(null);
  const [statusClubName, setStatusClubName] = useState(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setError(null);
    try {
      const response = await fetch('/api/bulletin/access-requests/status');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }
      console.log('Fetched status:', data);
      setCurrentStatus(data.status);
      setStatusClubName(data.clubName);
    } catch (err) {
      console.error('Error fetching request status:', err);
      setError(`Error loading status: ${err.message}`);
      setCurrentStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bulletin/access-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          clubName.trim() ? { clubName: clubName.trim() } : {}
        ),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError(responseData.error || 'Request already exists.');
          fetchStatus();
        } else {
          throw new Error(
            responseData.error ||
              `Failed to submit request (${response.status})`
          );
        }
      } else {
        setSuccessMessage(
          'Request submitted successfully! An admin will review it.'
        );
        setCurrentStatus('PENDING');
        setStatusClubName(responseData.clubName);
        setClubName('');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err.message || 'An unexpected error occurred.');
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (isLoadingStatus) {
      return (
        <div className="flex items-center text-white/60">
          <Loader2 size={16} className="animate-spin mr-2" />
          <span>Loading access status...</span>
        </div>
      );
    }

    if (userProfile?.role === 'admin' || userProfile?.role === 'RA') {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-500/50 rounded-md text-sm text-green-300">
          <CheckCircle size={16} />
          <span>
            You already have permission to post on the bulletin board.
          </span>
        </div>
      );
    }

    if (currentStatus === 'APPROVED') {
      return (
        <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-500/50 rounded-md text-sm text-green-300">
          <CheckCircle size={16} />
          <span>
            Your request to post on the bulletin board
            {statusClubName ? ` for ${statusClubName}` : ''} has been approved.
          </span>
        </div>
      );
    }

    if (currentStatus === 'PENDING') {
      return (
        <div className="flex items-center gap-2 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-md text-sm text-yellow-300">
          <Clock size={16} />
          <span>
            Your request to post{statusClubName ? ` for ${statusClubName}` : ''}{' '}
            is pending review.
          </span>
        </div>
      );
    }

    if (currentStatus === 'DENIED') {
      return (
        <div className="flex flex-col items-center gap-2 p-3 bg-red-900/30 border border-red-500/50 rounded-md text-sm text-red-400">
          <XCircle size={16} />
          <span>
            Your previous request to post
            {statusClubName ? ` for ${statusClubName}` : ''} was denied. You may
            request again if needed.
          </span>
          {renderForm()}
        </div>
      );
    }

    return renderForm();
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-white/70">
        Need to post events or announcements for your club or organization?
        Request access here.
      </p>
      <div>
        <label
          htmlFor="clubName"
          className="block text-xs font-medium text-white/60 mb-1"
        >
          Club/Organization Name (Optional)
        </label>
        <input
          type="text"
          id="clubName"
          value={clubName}
          onChange={(e) => setClubName(e.target.value)}
          placeholder="e.g., Coding Club"
          className="w-full px-3 py-1.5 bg-dark border border-light rounded-md text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-brand"
          disabled={isSubmitting}
        />
      </div>
      <div className="flex flex-col items-start gap-2 pt-1">
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand disabled:opacity-50 disabled:cursor-wait"
          disabled={isSubmitting || isLoadingStatus}
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {isSubmitting ? 'Submitting...' : 'Request Bulletin Access'}
        </button>
        {error && !isLoadingStatus && (
          <p className="text-sm text-red-400 flex items-center gap-1">
            <AlertTriangle size={14} /> {error}
          </p>
        )}
        {successMessage && (
          <p className="text-sm text-green-400 flex items-center gap-1">
            <CheckCircle size={14} /> {successMessage}
          </p>
        )}
      </div>
    </form>
  );

  return (
    <div className="p-4 bg-medium rounded-lg shadow border border-light/50">
      <h3 className="text-lg font-semibold text-white mb-3">
        Bulletin Board Posting Access
      </h3>
      {renderContent()}
    </div>
  );
}
