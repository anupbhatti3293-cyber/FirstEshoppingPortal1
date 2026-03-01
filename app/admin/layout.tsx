import { Sidebar } from '@/components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-[#1A1A2E]">
              Admin Panel
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                admin@luxehaven.com
              </span>
            </div>
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
