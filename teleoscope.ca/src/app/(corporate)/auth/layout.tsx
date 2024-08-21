export default function AuthenticationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className=" flex-row relative hidden h-screen items-center justify-center md:flex lg:max-w-none  lg:px-0">
      <div className="relative hidden h-full flex-1 flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-gradient-to-br from-appPrimary-900 to-appPrimary-500" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          Teleoscope Research Inc
        </div>
      </div>
      <div className="flex-1 h-full flex flex-col items-center justify-center p-10 lg:p-0">
        {children}
      </div>
    </div>
  );
}
