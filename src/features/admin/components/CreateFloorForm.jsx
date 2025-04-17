'use client';

import { useState } from 'react';

export default function CreateFloorForm() {
  const [floorName, setFloorName] = useState('');
  const [buildingName, setBuildingName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [generatedCode, setGeneratedCode] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!floorName.trim() || !buildingName.trim()) {
      setErrorMessage('Floor Name and Building Name cannot be empty.');
      setSuccessMessage(null);
      setGeneratedCode(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setGeneratedCode(null);

    try {
      const response = await fetch('/api/admin/floors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: floorName.trim(),
          buildingName: buildingName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to create floor (${response.status})`
        );
      }

      setSuccessMessage(`Floor "${data.name}" created successfully!`);
      setGeneratedCode(data.invitationCode);
      setFloorName('');
      setBuildingName('');
    } catch (error) {
      console.error('Error creating floor:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setSuccessMessage(null);
      setGeneratedCode(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-medium rounded-lg shadow border border-light/50 max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-white mb-4">
        Create New Floor
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="floorName"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Floor Name
          </label>
          <input
            type="text"
            id="floorName"
            value={floorName}
            onChange={(e) => setFloorName(e.target.value)}
            placeholder="e.g., Floor 3"
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="buildingName"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Building Name
          </label>
          <input
            type="text"
            id="buildingName"
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            placeholder="e.g., Panther Hall"
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <div>
          <button
            type="submit"
            className="w-full px-5 py-2.5 mt-2 rounded-lg bg-brand text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand disabled:opacity-50 disabled:cursor-wait"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Floor'}
          </button>
        </div>

        {errorMessage && (
          <p className="mt-4 text-sm text-red-400 text-center">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-md text-center">
            <p className="text-sm text-green-300">{successMessage}</p>
            {generatedCode && (
              <p className="mt-2 text-lg font-mono tracking-widest text-white bg-dark inline-block px-3 py-1 rounded">
                Invitation Code:{' '}
                <span className="font-bold">{generatedCode}</span>
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
