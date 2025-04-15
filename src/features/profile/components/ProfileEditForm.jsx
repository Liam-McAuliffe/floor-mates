'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useDispatch } from 'react-redux';
import { userProfileUpdated } from '@/store/slices/userSlice';

export default function ProfileEditForm({ initialData }) {
  const dispatch = useDispatch();
  const inputFileRef = useRef(null);

  const [name, setName] = useState(initialData?.name ?? '');
  const [major, setMajor] = useState(initialData?.major ?? '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [finalImageUrl, setFinalImageUrl] = useState(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleImageChange = (event) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSaveChanges = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setIsUploading(!!selectedFile);
    setErrorMessage(null);
    setSuccessMessage(null);

    let uploadedImageUrl = null;

    if (selectedFile) {
      try {
        const response = await fetch(
          `/api/avatar/upload?filename=${encodeURIComponent(
            selectedFile.name
          )}`,
          {
            method: 'POST',
            body: selectedFile,
          }
        );

        if (!response.ok) {
          let errorMsg = `Image upload API failed: ${response.statusText}`;
          try {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } catch {}
          throw new Error(errorMsg);
        }

        const blobResult = await response.json();

        if (!blobResult?.url) {
          throw new Error(
            'Backend uploaded file but did not return a valid URL.'
          );
        }

        uploadedImageUrl = blobResult.url;
        setSuccessMessage('Image uploaded!');
      } catch (error) {
        setErrorMessage(`Image upload failed: ${error.message}`);
        setIsUploading(false);
        setIsSaving(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const dataToUpdate = {
      name,
      major,
      ...(uploadedImageUrl !== null && { image: uploadedImageUrl }),
    };

    try {
      const patchResponse = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpdate),
      });

      if (!patchResponse.ok) {
        let errorMsg = `Error saving profile: ${patchResponse.status}`;
        try {
          const errData = await patchResponse.json();
          errorMsg = errData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const updatedProfile = await patchResponse.json();
      setSuccessMessage(
        uploadedImageUrl
          ? 'Image uploaded & profile saved!'
          : 'Profile updated successfully!'
      );
      dispatch(userProfileUpdated(updatedProfile));
      if (uploadedImageUrl) {
        setSelectedFile(null);
      }

      setFinalImageUrl(uploadedImageUrl);
    } catch (error) {
      setErrorMessage((prev) =>
        prev
          ? `${prev} & ${error.message}`
          : error.message || 'An unexpected error occurred.'
      );
    } finally {
      setIsSaving(false);
    }
  };
  const displayImageUrl = finalImageUrl || previewUrl || initialData?.image;

  return (
    <form
      onSubmit={handleSaveChanges}
      className="p-6 bg-dk-green rounded-lg shadow border border-md-green/50 space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {displayImageUrl ? (
          <Image
            key={displayImageUrl}
            src={displayImageUrl}
            alt="Current profile picture"
            width={100}
            height={100}
            className="rounded-full border-2 border-brand-green object-cover bg-charcoal"
          />
        ) : (
          <div className="w-[100px] h-[100px] rounded-full bg-charcoal flex items-center justify-center text-white/50 text-sm border-2 border-md-green">
            No Image
          </div>
        )}
        <input
          ref={inputFileRef}
          type="file"
          id="profilePicture"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleImageChange}
          className="hidden"
        />

        <label
          htmlFor="profilePicture"
          className={`cursor-pointer px-4 py-2 rounded border border-brand-green text-brand-green hover:bg-brand-green hover:text-white transition-colors text-sm ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? 'Uploading...' : 'Change Picture'}
        </label>
        {isUploading && (
          <div className="text-sm text-white/70 animate-pulse">
            Uploading...
          </div>
        )}
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
          disabled={isSaving || isUploading}
          className="px-5 py-2.5 rounded-lg bg-brand-green text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dk-green focus:ring-brand-green disabled:opacity-50 disabled:cursor-wait"
        >
          {isUploading
            ? 'Uploading...'
            : isSaving
            ? 'Saving...'
            : 'Save Changes'}
        </button>

        {successMessage && (
          <p className="text-sm text-green-400">{successMessage}</p>
        )}
        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
      </div>
    </form>
  );
}
