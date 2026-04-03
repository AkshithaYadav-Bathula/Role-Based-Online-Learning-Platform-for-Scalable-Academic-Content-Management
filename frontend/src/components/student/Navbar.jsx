import React, { useContext, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { Bell, Moon, Sun } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    isEducator,
    token,
    backendURL,
    setIsEducator,
    setUser,
    setEnrolledCourses,
    setLastRefreshed,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    theme,
    toggleTheme,
  } = useContext(AppContext);
  const [showNotifications, setShowNotifications] = useState(false);
  const isCourseListPage = location.pathname.includes("/course-list");
  const isLoggedIn = localStorage.getItem("token") !== null;
  console.log( `${backendURL}/users/update_role`)

  const latestNotifications = useMemo(() => (notifications || []).slice(0, 8), [notifications]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setEnrolledCourses([]);
    setIsEducator(false);
    setLastRefreshed(Date.now());
    navigate("/");
  };

  const handleAuthClick = () => {
    navigate("/auth");
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    if (!notification.is_read) {
      await markNotificationRead(notification.id);
    }

    setShowNotifications(false);

    const courseId = notification.course_id;
    const isUuid = typeof courseId === "string" && /^[0-9a-fA-F-]{36}$/.test(courseId);

    if (isUuid) {
      navigate(`/course/${courseId}`);
    } else {
      toast.error("Course link is unavailable for this notification.");
    }
  };

  const becomeEducator = async () => {
    try {
      if (isEducator) {
        navigate("/educator");
        return;
      }

      const { data } = await axios.post(
        `${backendURL}/users/update_role`,{},
        
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        setIsEducator(true);
        navigate("/educator");
      } else {
        toast.error(data.message || "Failed to become educator.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "An error occurred.");
    }
  };

  return (
    <div
      className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 ${
        isCourseListPage ? "bg-white" : "bg-cyan-100/70"
      }`}
    >
      <div>
        <img
          onClick={() => navigate("/")}
          src={theme === "dark" ? assets.logo_dark : assets.logo}
          alt="Logo"
          className="w-28 lg:w-32 cursor-pointer"
        />
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-5 text-gray-500">
        <div className="flex gap-2">
          {isLoggedIn && (
            <>
              <button onClick={becomeEducator}>
                {isEducator ? "Educator Dashboard" : "Become Educator"}
              </button>
              |<Link to="/my-enrollments">My Enrollments</Link>
            </>
          )}
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="h-10 w-10 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5 mx-auto" /> : <Moon className="w-5 h-5 mx-auto" />}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative h-10 w-10 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                title="Notifications"
              >
                <Bell className="w-5 h-5 mx-auto" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                    <p className="text-sm font-semibold text-gray-800">Notifications</p>
                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {latestNotifications.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-gray-500">No notifications yet.</p>
                    ) : (
                      latestNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full px-3 py-2 text-left border-b border-gray-100 hover:bg-gray-50 ${
                            notification.is_read ? "bg-white" : "bg-blue-50"
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                          <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {notification.created_at
                              ? new Date(notification.created_at).toLocaleString()
                              : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="text-gray-600">
              {JSON.parse(localStorage.getItem("user"))?.name}
            </span>
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleAuthClick}
            className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            Login / Signup
          </button>
        )}
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center gap-2 sm:gap-5 text-gray-500">
        <div className="flex items-center gap-1 sm:gap-2 max-sm:text-xs">
          {isLoggedIn && (
            <>
              <button onClick={becomeEducator}>
                {isEducator ? "Educator Dashboard" : "Become Educator"}
              </button>
              <Link to="/my-enrollments">My Enrollments</Link>
            </>
          )}
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full border border-gray-300 bg-white text-gray-700"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 mx-auto" /> : <Moon className="w-4 h-4 mx-auto" />}
            </button>
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative h-8 w-8 rounded-full border border-gray-300 bg-white text-xs text-gray-700"
            >
              <Bell className="w-4 h-4 mx-auto" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                  {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                </span>
              )}
            </button>
            <span className="text-sm text-gray-600">
              {JSON.parse(localStorage.getItem("user"))?.name}
            </span>
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm hover:bg-blue-700 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full border border-gray-300 bg-white text-gray-700"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 mx-auto" /> : <Moon className="w-4 h-4 mx-auto" />}
            </button>
            <button onClick={handleAuthClick} className="flex items-center">
              <img src={assets.user_icon} alt="auth" className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {showNotifications && (
        <div className="md:hidden absolute top-16 right-3 w-80 rounded-lg border border-gray-200 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {latestNotifications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500">No notifications yet.</p>
            ) : (
              latestNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-3 py-2 text-left border-b border-gray-100 hover:bg-gray-50 ${
                    notification.is_read ? "bg-white" : "bg-blue-50"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;