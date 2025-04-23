'use client';

import ManageBulletinRequests from '@/features/admin/components/ManageBulletinRequests';

export default function BulletinRequestsPage() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">
        Manage Bulletin Requests
      </h2>
      <ManageBulletinRequests />
    </section>
  );
}
