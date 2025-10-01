import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { GraduationCap, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

// 🔹 Reusable InputField Component
const InputField: React.FC<{
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  required?: boolean;
}> = ({ type = "text", placeholder, value, onChange, icon, required }) => (
  <div className="relative">
    {icon && (
      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5">
        {icon}
      </span>
    )}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
    />
  </div>
);

// 🔹 Password Field with Visibility Toggle
const PasswordField: React.FC<{
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}> = ({ placeholder, value, onChange, required }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  );
};

const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await register(email, password, name, role);
        // navigate("/dashboard"); // Uncomment if you want auto-redirect
      } else {
        await login(email, password);
        // navigate("/dashboard"); // Uncomment if you want auto-redirect
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-6 text-center">
          <GraduationCap className="w-12 h-12 text-white mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-white">QuizPlatform</h1>
          <p className="text-blue-100">Smart Learning Management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isRegistering ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-gray-600">
              {isRegistering
                ? "Join our learning community"
                : "Sign in to continue learning"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Register-only Fields */}
          {isRegistering && (
            <>
              <InputField
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User />}
                required
              />

              <div className="relative">
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "student" | "faculty")
                  }
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>
            </>
          )}

          {/* Common Fields */}
          <InputField
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail />}
            required
          />

          <PasswordField
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isRegistering && (
            <PasswordField
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-teal-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Please wait..."
              : isRegistering
              ? "Create Account"
              : "Sign In"}
          </button>

          {/* Toggle Auth Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {isRegistering
                ? "Already have an account? Sign In"
                : "Need an account? Register"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
