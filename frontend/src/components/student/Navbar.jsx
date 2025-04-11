import React, { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isEducator, token, backendURL, setIsEducator } = useContext(AppContext);
  const isCourseListPage = location.pathname.includes("/course-list");
  const isLoggedIn = localStorage.getItem("token") !== null;
  console.log( `${backendURL}/users/update_role`)

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleAuthClick = () => {
    navigate("/auth");
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
          src={assets.logo}
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
          <button onClick={handleAuthClick} className="flex items-center">
            <img src={assets.user_icon} alt="auth" className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;