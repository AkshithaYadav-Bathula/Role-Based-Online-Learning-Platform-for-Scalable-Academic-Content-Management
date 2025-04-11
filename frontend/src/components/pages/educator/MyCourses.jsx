import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../../../context/AppContext";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const MyCourses = () => {
  const { backendURL, token } = useContext(AppContext);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // In MyCourses.jsx
const fetchEducatorCourses = async () => {
  try {
    // Updated to match the Rails route
    const response = await fetch(`${backendURL}/educators/dashboard_data`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/json',
      },
      credentials: 'include',  // Include credentials if using cookies
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

    // Process the data and ensure thumbnail_url is properly set
    const coursesWithThumbnails = data.dashboardData.courses.map(course => {
      // Ensure thumbnail_url is set properly
      if (!course.thumbnail_url) {
        console.warn(`Course ${course.id} has no thumbnail_url`);
      } else {
        console.log(`Course ${course.id} thumbnail_url: ${course.thumbnail_url}`);
      }
      return course;
    });
    
    setCourses(coursesWithThumbnails || []);
    console.log("Fetched courses:", coursesWithThumbnails);
  } catch (error) {
    console.error("Error fetching courses:", error.message);
    setError(error.message);
    toast.error("Failed to fetch courses. Please try again later.");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchEducatorCourses();
  }, [backendURL, token]);

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
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.course_title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No thumbnail</span>
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {course.course_title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {course.course_description &&
                  typeof course.course_description === "string"
                    ? course.course_description.replace(/<[^>]+>/g, "")
                    : "No description available"}
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
                    {/* Count of students enrolled in this course, if available */}
                    {course.user_courses?.length || 0} Enrolled
                  </span>
                  <Link
                    to={`/educator/courses/${course.id}`}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg mb-4">
            You haven't created any courses yet.
          </p>
          <Link
            to="/educator/add-course"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300"
          >
            Create Your First Course
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyCourses;
