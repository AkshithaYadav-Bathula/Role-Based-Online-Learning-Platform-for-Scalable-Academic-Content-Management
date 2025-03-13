import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "../../../context/AppContext";
import Loading from "../../student/Loading";
import { assets } from "../../../assets/assets";

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { backendURL, token, currency } = useContext(AppContext);

  useEffect(() => {
    const fetchDashboardData = async () => {
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
        setDashboardData(data.dashboardData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [backendURL, token]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-start justify-between gap-8 p-8">
      <div className="space-y-5">
        {/* Stats Cards */}
        <div className="flex flex-wrap gap-5 items-center">
          {/* Total Enrollments */}
          <div className="flex items-center gap-3 shadow-card border border-blue-500 p-4 w-56 rounded-md">
            <img src={assets.patients_icon} alt="Total Enrollments Icon" />
            <div>
              <p className="text-2xl font-medium text-gray-600">
                {dashboardData?.enrolledStudents?.length || 0}
              </p>
              <p className="text-base text-gray-500">Total Enrolments</p>
            </div>
          </div>

          {/* Total Courses */}
          <div className="flex items-center gap-3 shadow-card border border-blue-500 p-4 w-56 rounded-md">
            <img src={assets.appointments_icon} alt="Total Courses Icon" />
            <div>
              <p className="text-2xl font-medium text-gray-600">
                {dashboardData?.totalCourses || 0}
              </p>
              <p className="text-base text-gray-500">Total Courses</p>
            </div>
          </div>

          {/* Total Earnings */}
          <div className="flex items-center gap-3 shadow-card border border-blue-500 p-4 w-56 rounded-md">
            <img src={assets.earning_icon} alt="Total Earnings Icon" />
            <div>
              <p className="text-2xl font-medium text-gray-600">
                {currency}
                {dashboardData?.totalEarnings || 0}
              </p>
              <p className="text-base text-gray-500">Total Earnings</p>
            </div>
          </div>
        </div>

        {/* Latest Enrollments */}
        <h2 className="pb-4 text-lg font-medium">Latest Enrollments</h2>
        <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
          <table className="table-auto w-full overflow-hidden">
            <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-center hidden sm:table-cell">
                  #
                </th>
                <th className="px-4 py-3 font-semibold">Student Name</th>
                <th className="px-4 py-3 font-semibold">Course Title</th>
              </tr>
            </thead>

            <tbody className="text-sm text-gray-500">
              {dashboardData?.enrolledStudents && dashboardData.enrolledStudents.length > 0 ? (
                dashboardData.enrolledStudents.map((student, index) => (
                  <tr key={index} className="border-b border-gray-500/20">
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 flex items-center space-x-3">
                     
                      <span className="truncate">
                        {student.name || "Unknown Student"}
                      </span>
                    </td>
                    <td className="px-4 py-3 truncate">
                      {student.enrolled_courses && student.enrolled_courses.length > 0
                        ? student.enrolled_courses.map((course, i) => (
                            <div key={i} className="truncate">
                              {course.course_title || "Unknown Course"}
                            </div>
                          ))
                        : "No courses enrolled"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-6 text-gray-600">
                    No enrollments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;