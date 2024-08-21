import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col bg-zinc-200 h-screen w-screen items-center justify-center  flex-1 p-10 px-20 text-center">
      <h2 className="font-bold">Page Not Found</h2>

      <Link href="/app/settings">Go to settings</Link>
    </div>
  );
}
