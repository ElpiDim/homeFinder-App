// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const result = await login(email, password);

      const token = result?.token || result?.data?.token;
      const user  = result?.user  || result?.data?.user || result;

      if (token) localStorage.setItem('token', token);
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      }

      setMessage(`Welcome, ${user?.name || user?.email || ''}`);

      const completed = user?.onboardingCompleted ?? user?.hasCompletedOnboarding ?? false;
      const needsOnboarding = user?.role === 'client' && !completed;
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login error';
      setMessage(msg);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <div className="flex flex-1 w-full">
        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="relative hidden lg:flex flex-1 items-center justify-center bg-primary/10 dark:bg-primary/20 p-8">
            <div className="absolute top-8 left-8 flex items-center gap-2">
              <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"></path>
              </svg>
              <span className="text-xl font-bold text-primary">DreamHome</span>
            </div>
            <div className="max-w-md text-center">
              <h2 className="text-6xl font-extrabold tracking-tight text-[#141118] dark:text-white">Find Your Perfect Match</h2>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center p-6 sm:p-8 lg:p-12 bg-background-light dark:bg-background-dark">
            <div className="flex w-full max-w-md flex-col items-center justify-center space-y-6">
              <div className="lg:hidden flex items-center gap-2 self-start mb-4">
                <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"></path>
                </svg>
                <span className="text-xl font-bold text-primary">DreamHome</span>
              </div>
              <div className="w-full">
                <h1 className="text-[#141118] dark:text-white tracking-light text-[32px] font-bold leading-tight text-left pb-3 pt-6">Log in to Your Account</h1>
                <p className="text-[#756189] dark:text-gray-400 text-base font-normal leading-normal pb-6">Welcome back! Please enter your details.</p>
                {message && <div className="text-red-500 pb-4">{message}</div>}
              </div>
              <form className="w-full space-y-4" onSubmit={handleLogin}>
                <label className="flex flex-col flex-1 w-full">
                  <p className="text-[#141118] dark:text-gray-300 text-base font-medium leading-normal pb-2">Email or Username</p>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#141118] dark:text-white dark:bg-background-dark/50 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#e0dbe6] dark:border-gray-600 bg-white h-14 placeholder:text-[#756189] p-[15px] text-base font-normal leading-normal"
                    placeholder="Enter your email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col flex-1 w-full">
                  <div className="flex justify-between items-baseline pb-2">
                    <p className="text-[#141118] dark:text-gray-300 text-base font-medium leading-normal">Password</p>
                    <a className="text-primary text-sm font-medium leading-normal underline hover:text-primary/80" href="#">Forgot Password?</a>
                  </div>
                  <div className="flex w-full flex-1 items-stretch rounded-lg border border-[#e0dbe6] dark:border-gray-600 focus-within:ring-2 focus-within:ring-primary/50">
                    <input
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-[#141118] dark:text-white dark:bg-background-dark/50 focus:outline-0 focus:ring-0 border-0 bg-white h-14 placeholder:text-[#756189] p-[15px] pr-2 text-base font-normal leading-normal"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label="Show password"
                      className="text-[#756189] dark:text-gray-400 flex bg-white dark:bg-background-dark/50 items-center justify-center pr-[15px] rounded-r-lg"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </label>
                <div className="w-full pt-4">
                  <button type="submit" className="flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 transition-colors">
                    <span className="truncate">Log In</span>
                  </button>
                </div>
              </form>
              <p className="text-[#756189] dark:text-gray-400 text-sm font-normal leading-normal text-center">
                Don't have an account? <Link className="font-semibold text-primary underline hover:text-primary/80" to="/register">Sign Up</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
