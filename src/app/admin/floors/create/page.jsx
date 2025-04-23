'use client';

import CreateFloorForm from '@/features/admin/components/CreateFloorForm';

export default function CreateFloorPage() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-4">Create New Floor</h2>
      <CreateFloorForm />
    </section>
  );
}
