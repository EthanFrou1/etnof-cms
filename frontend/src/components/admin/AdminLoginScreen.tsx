import AdminLoginForm from "../AdminLoginForm";

type AdminLoginScreenProps = {
  title: string;
  loginPath: string;
  onLoggedIn: (password: string) => void;
};

export default function AdminLoginScreen({ title, loginPath, onLoggedIn }: AdminLoginScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <span className="text-2xl font-extrabold text-white">
          Admin<span className="text-green-accent">Pro</span>
        </span>
        <p className="text-center text-sm text-white/60">{title}</p>
        <AdminLoginForm loginPath={loginPath} onLoggedIn={onLoggedIn} />
      </div>
    </div>
  );
}
