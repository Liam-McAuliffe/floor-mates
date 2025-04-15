'use client';

import { useState } from 'react';
import Image from 'next/image';

import { useDispatch } from 'react-redux';
import { userProfileUpdated } from '@/store/slices/userSlice';

export default function ProfileEditForm({ initialData }) {
  const dispatch = useDispatch();

  const [name, setName] = useState(initialData?.name ?? '');
  const [major, setMajor] = useState(initialData?.major ?? '');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSaveChanges = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const dataToUpdate = {
      name: name,
      major: major,
    };

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUpdate),
      });

      if (!response.ok) {
        let errorMsg = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (parseError) {}
        throw new Error(errorMsg);
      }

      const updatedProfile = await response.json();
      console.log('Profile updated successfully:', updatedProfile);
      dispatch(userProfileUpdated(updatedProfile));
      setSuccessMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorMessage(
        error.message || 'An unexpected error occurred while saving.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageChange = (event) => {
    console.log('Image change detected', event.target.files);
    alert('Image upload not implemented yet.');
  };

  return (
    <form
      onSubmit={handleSaveChanges}
      className="p-6 bg-dk-green rounded-lg shadow border border-md-green/50 space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {initialData?.image ? (
          <Image
            src={initialData.image}
            alt="Current profile picture"
            width={100}
            height={100}
            className="rounded-full border-2 border-brand-green object-cover"
          />
        ) : (
          <div className="w-[100px] h-[100px] rounded-full bg-charcoal flex items-center justify-center text-white/50 text-sm border-2 border-md-green">
            No Image
          </div>
        )}
        <input
          type="file"
          id="profilePicture"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleImageChange}
          className="hidden"
        />

        <label
          htmlFor="profilePicture"
          className="cursor-pointer px-4 py-2 rounded border border-brand-green  bg-brand-green text-white transition-colors text-sm"
        >
          Change Picture
        </label>
      </div>

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-white/70 mb-1"
        >
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 bg-charcoal border border-md-green rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
      </div>

      <div>
        <label
          htmlFor="major"
          className="block text-sm font-medium text-white/70 mb-1"
        >
          Major
        </label>
        <input
          type="text"
          id="major"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          placeholder="e.g., Computer Science"
          className="w-full px-3 py-2 bg-charcoal border border-md-green rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
        />
      </div>

      <div>
        <p className="text-sm text-white/70">Email:</p>
        <p className="text-lg text-white/80 mt-1">
          {initialData?.email ?? 'Not Available'}
        </p>
        <p className="text-xs text-white/50 mt-1">
          Email cannot be changed via profile.
        </p>
      </div>

      <div className="pt-4 flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-lg bg-brand-green text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dk-green focus:ring-brand-green disabled:opacity-50 disabled:cursor-wait"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>

        {successMessage && (
          <p className="text-sm text-green-400">{successMessage}</p>
        )}
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      </div>
    </form>
  );
}
