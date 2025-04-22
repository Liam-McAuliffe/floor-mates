'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import Image from 'next/image';

export default function CreateBulletinPostForm({ onPostCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState('EVENT');
  const [recurringDays, setRecurringDays] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const inputFileRef = useRef(null);
  const [selectedFlyer, setSelectedFlyer] = useState(null);
  const [flyerPreviewUrl, setFlyerPreviewUrl] = useState(null);
  const [isUploadingFlyer, setIsUploadingFlyer] = useState(false);

  const userProfile = useSelector(selectUserProfile);
  const schoolId = userProfile?.schoolId;

  useEffect(() => {
    if (!selectedFlyer) {
      setFlyerPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFlyer);
    setFlyerPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFlyer]);

  const handleFlyerChange = (event) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFlyer(null);
      return;
    }

    setSelectedFlyer(file);
  };

  const handleRecurringDayChange = (event) => {
    const { value, checked } = event.target;
    setRecurringDays((prev) =>
      checked ? [...prev, value] : prev.filter((day) => day !== value)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsUploadingFlyer(false);

    if (!title.trim() || !content.trim()) {
      setError('Title and Content cannot be empty.');
      return;
    }
    if (!schoolId) {
      setError('Cannot create post: User school ID is missing.');
      return;
    }

    setIsSubmitting(true);

    let uploadedFlyerUrl = null;

    if (selectedFlyer) {
      setIsUploadingFlyer(true);
      setError(null);

      try {
        console.log(`Uploading flyer: ${selectedFlyer.name}`);
        const response = await fetch(
          `/api/bulletin/flyer/upload?filename=${encodeURIComponent(
            selectedFlyer.name
          )}`,
          {
            method: 'POST',
            body: selectedFlyer,
            headers: {},
          }
        );

        const blobResult = await response.json();

        if (!response.ok) {
          throw new Error(
            blobResult.error || `Flyer upload failed (${response.status})`
          );
        }

        if (!blobResult?.url) {
          throw new Error(
            'Flyer upload succeeded but did not return a valid URL.'
          );
        }

        uploadedFlyerUrl = blobResult.url;
        console.log('Flyer uploaded successfully:', uploadedFlyerUrl);
      } catch (uploadError) {
        console.error('Flyer upload failed:', uploadError);
        setError(`Flyer upload failed: ${uploadError.message}`);
        setIsSubmitting(false);
        setIsUploadingFlyer(false);
        return;
      } finally {
        setIsUploadingFlyer(false);
      }
    }
    const postData = {
      title: title.trim(),
      content: content.trim(),
      schoolId: schoolId,
      eventType: eventType,
      location: location.trim() || null,
      eventTime: eventTime.trim() || null,
      eventDate:
        eventType === 'EVENT' && eventDate
          ? new Date(eventDate).toISOString()
          : null,
      recurringDays: eventType === 'RECURRING' ? recurringDays : [],
      flyerImageUrl: uploadedFlyerUrl,
    };
    try {
      const response = await fetch('/api/bulletin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || `Failed to create post (${response.status})`
        );
      }

      setSuccessMessage('Bulletin post created successfully!');
      // Reset form fields
      setTitle('');
      setContent('');
      setEventDate('');
      setLocation('');
      setEventTime('');
      setEventType('EVENT');
      setRecurringDays([]);
      setSelectedFlyer(null);
      setFlyerPreviewUrl(null);
      if (inputFileRef.current) inputFileRef.current.value = '';

      if (onPostCreated && typeof onPostCreated === 'function') {
        onPostCreated(responseData);
      }
    } catch (err) {
      console.error('Error creating bulletin post:', err);
      setError(
        (prevError) =>
          prevError || err.message || 'An unexpected error occurred.'
      );
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 7000);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-medium rounded-lg shadow border border-light/50 mb-6">
      <h2 className="text-lg font-semibold text-white mb-4">
        Create New Bulletin Post
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="eventType"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Post Type*
          </label>
          <select
            id="eventType"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="EVENT">One-Time Event</option>
            <option value="RECURRING">Recurring (Club Meeting, etc.)</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="bulletinTitle"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Title*
          </label>
          <input
            id="bulletinTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            required
            placeholder="Event Name, Announcement, Club Name..."
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="bulletinContent"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Content/Description*
          </label>
          <textarea
            id="bulletinContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            required
            rows={4}
            placeholder="Details about the event, meeting, or announcement..."
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-y min-h-[80px]"
          />
        </div>
        <div>
          <label
            htmlFor="bulletinLocation"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Location (Optional)
          </label>
          <input
            type="text"
            id="bulletinLocation"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., MSC Ballroom, Library Room 201"
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        {eventType === 'EVENT' && (
          <div>
            <label
              htmlFor="bulletinEventDate"
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Event Date (Optional)
            </label>
            <input
              type="date"
              id="bulletinEventDate"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>
        )}
        {eventType === 'RECURRING' && (
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Recurring Days (Optional)
            </label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday',
              ].map((day) => (
                <label
                  key={day}
                  className="flex items-center space-x-2 text-sm text-white/80"
                >
                  <input
                    type="checkbox"
                    value={day}
                    checked={recurringDays.includes(day)}
                    onChange={handleRecurringDayChange}
                    className="rounded border-light text-brand focus:ring-brand disabled:opacity-50"
                    disabled={isSubmitting}
                  />
                  <span>{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="bulletinEventTime"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Time (Optional)
          </label>
          <input
            type="text"
            id="bulletinEventTime"
            value={eventTime}
            onChange={(e) => setEventTime(e.target.value)}
            placeholder="e.g., 7:00 PM or 10 AM - 1 PM"
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="bulletinFlyer"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Flyer Image (Optional)
          </label>
          <div className="flex items-center gap-4">
            <input
              ref={inputFileRef}
              type="file"
              id="bulletinFlyer"
              onChange={handleFlyerChange}
              accept="image/png, image/jpeg, image/webp, image/gif"
              className="hidden"
              disabled={isUploadingFlyer || isSubmitting}
            />
            <button
              type="button"
              onClick={() => inputFileRef.current?.click()}
              className={`px-4 py-2 rounded border border-brand bg-brand text-white transition-colors text-sm ${
                isUploadingFlyer || isSubmitting
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-opacity-85'
              }`}
              disabled={isUploadingFlyer || isSubmitting}
            >
              {isUploadingFlyer
                ? 'Uploading...'
                : selectedFlyer
                ? 'Change Flyer'
                : 'Upload Flyer'}
            </button>
            {flyerPreviewUrl && (
              <Image
                src={flyerPreviewUrl}
                alt="Flyer preview"
                width={80}
                height={80}
                className="rounded border border-light object-contain bg-dark"
              />
            )}
            {selectedFlyer && !flyerPreviewUrl && (
              <span className="text-sm text-white/70 truncate">
                {selectedFlyer.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || isUploadingFlyer || !schoolId}
            className="px-5 py-2 rounded-lg hover:cursor-pointer bg-brand text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand disabled:opacity-50 disabled:cursor-wait"
          >
            {isUploadingFlyer
              ? 'Uploading Flyer...'
              : isSubmitting
              ? 'Creating Post...'
              : 'Create Bulletin Post'}
          </button>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          {successMessage && (
            <p className="mt-2 text-sm text-green-400">{successMessage}</p>
          )}
          {!schoolId && userProfile && (
            <p className="mt-2 text-sm text-amber-400">
              Cannot create post: Unable to determine your school.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
