'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString([], {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch (e) {
    return 'Invalid Date';
  }
}

function RequestItem({ request, onUpdateRequest }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const handleUpdate = async (newStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdateError(null);

    try {
      const response = await fetch(
        `/api/admin/bulletin/access-requests/${request.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const updatedRequestData = await response.json();

      if (!response.ok) {
        throw new Error(
          updatedRequestData.error ||
            `Failed to update request (${response.status})`
        );
      }

      onUpdateRequest(request.id, updatedRequestData);
    } catch (err) {
      console.error('Error updating request status:', err);
      setUpdateError(err.message || 'Failed to update.');
      setTimeout(() => setUpdateError(null), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-400';
      case 'APPROVED':
        return 'text-green-400';
      case 'DENIED':
        return 'text-red-400';
      default:
        return 'text-white/50';
    }
  };

  return (
    <li className="p-4 bg-dark rounded-lg shadow border border-light/30 space-y-2">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-sm font-semibold text-white">
            {request.user?.name || 'Unknown User'}
          </p>
          <p className="text-xs text-white/60">{request.user?.email}</p>
          {request.clubName && (
            <p className="text-xs text-brand mt-1">
              Club: <span className="font-medium">{request.clubName}</span>
            </p>
          )}
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusColor(
            request.status
          )} bg-black/20`}
        >
          {request.status}
        </span>
      </div>
      <div className="text-xs text-white/50 space-y-1 border-t border-light/20 pt-2">
        <p>School: {request.school?.name || 'N/A'}</p>
        <p>Requested: {formatDate(request.requestedAt)}</p>
        {request.status !== 'PENDING' && (
          <p>
            Reviewed:{' '}
            {request.reviewedAt ? formatDate(request.reviewedAt) : 'N/A'} by{' '}
            {request.reviewedByAdmin?.name || 'N/A'}
          </p>
        )}
      </div>

      {request.status === 'PENDING' && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => handleUpdate('APPROVED')}
            disabled={isUpdating}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {isUpdating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle size={14} />
            )}
            Approve
          </button>
          <button
            onClick={() => handleUpdate('DENIED')}
            disabled={isUpdating}
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {isUpdating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <XCircle size={14} />
            )}
            Deny
          </button>
        </div>
      )}
      {updateError && (
        <p className="text-xs text-red-400 pt-1">{updateError}</p>
      )}
    </li>
  );
}

export default function ManageBulletinRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('PENDING');

  const fetchRequests = useCallback(async (status) => {
    setIsLoading(true);
    setError(null);
    console.log(
      `[ManageBulletinRequests] Fetching requests with status: ${status}`
    );
    try {
      const apiUrl = `/api/admin/bulletin/access-requests${
        status ? `?status=${status}` : ''
      }`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch requests');
      }
      setRequests(data);
    } catch (err) {
      console.error('Error fetching bulletin access requests:', err);
      setError(err.message);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(filterStatus);
  }, [filterStatus, fetchRequests]);

  const handleRequestUpdate = useCallback(
    (requestId, updatedRequestData) => {
      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === requestId ? { ...req, ...updatedRequestData } : req
        )
      );
      if (filterStatus === 'PENDING') {
        fetchRequests('PENDING');
      }
    },
    [filterStatus, fetchRequests]
  );

  return (
    <div className="p-4 md:p-6 bg-medium rounded-lg shadow border border-light/50">
      <h2 className="text-xl font-semibold text-white mb-4">
        Manage Bulletin Access Requests
      </h2>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterStatus('PENDING')}
          className={`px-3 py-1 rounded text-sm ${
            filterStatus === 'PENDING'
              ? 'bg-brand text-white'
              : 'bg-dark text-white/70 hover:bg-light'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilterStatus('APPROVED')}
          className={`px-3 py-1 rounded text-sm ${
            filterStatus === 'APPROVED'
              ? 'bg-brand text-white'
              : 'bg-dark text-white/70 hover:bg-light'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setFilterStatus('DENIED')}
          className={`px-3 py-1 rounded text-sm ${
            filterStatus === 'DENIED'
              ? 'bg-brand text-white'
              : 'bg-dark text-white/70 hover:bg-light'
          }`}
        >
          Denied
        </button>
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3 py-1 rounded text-sm ${
            filterStatus === ''
              ? 'bg-brand text-white'
              : 'bg-dark text-white/70 hover:bg-light'
          }`}
        >
          All
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-6">
          <Loader2 size={24} className="animate-spin text-white/50" />
          <span className="ml-2 text-white/70">Loading requests...</span>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-center py-4">
          Error loading requests: {error}
        </p>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <p className="text-white/60 text-center py-4">
          No requests found{filterStatus ? ` with status ${filterStatus}` : ''}.
        </p>
      )}

      {!isLoading && !error && requests.length > 0 && (
        <ul className="space-y-4">
          {requests.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              onUpdateRequest={handleRequestUpdate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
