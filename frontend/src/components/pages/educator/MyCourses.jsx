import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../../../context/AppContext";
import { toast } from "react-toastify";

const MyCourses = () => {
  const { backendURL, token } = useContext(AppContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEducatorCourses = async () => {
    try {
      const response = await fetch(`${backendURL}/api/educator/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check if the response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Expected JSON, but received: ${text}`);
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch dashboard data");
      }

      // Process the data
      setCourses(data.dashboardData.courses || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error.message);
      setError(error.message);
      toast.error("Failed to fetch dashboard data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEducatorCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Courses</h1>
      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <img
                src={course.course_thumbnail}
                alt={course.course_title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {course.course_title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {course.course_description.replace(/<[^>]+>/g, "")}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-600">
                    ₹{course.course_price}
                  </span>
                  <span className="text-sm text-gray-500">
                    {course.discount}% off
                  </span>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {course.enrolled_students?.length || 0} Enrolled
                  </span>
                  {/* <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300">
                    View Course
                  </button> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-600">
          <p>No courses found.</p>
        </div>
      )}
    </div>
  );
};

export default MyCourses;