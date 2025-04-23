import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div className="p-6 space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          href="/admin/floors/create"
          className="block p-6 bg-white/10 hover:bg-white/20 rounded-2xl shadow-lg text-center"
        >
          <h2 className="text-2xl font-semibold mb-2">Create New Floor</h2>
          <p className="text-white/70">
            Add and configure a new residence floor.
          </p>
        </Link>
        <Link
          href="/admin/bulletin/requests"
          className="block p-6 bg-white/10 hover:bg-white/20 rounded-2xl shadow-lg text-center"
        >
          <h2 className="text-2xl font-semibold mb-2">
            Manage Bulletin Requests
          </h2>
          <p className="text-white/70">
            Approve or reject club bulletin board submissions.
          </p>
        </Link>
      </div>
    </div>
  );
}
