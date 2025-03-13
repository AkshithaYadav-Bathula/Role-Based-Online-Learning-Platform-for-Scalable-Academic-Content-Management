import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../../../context/AppContext";
import Loading from "../../student/Loading";

const StudentsEnrolled = () => {
  const { backendURL, token } = useContext(AppContext);
  const [enrolledStudents, setEnrolledStudents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
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
          throw new Error(data.message || "Failed to fetch enrolled students");
        }

        // Process the data
        setEnrolledStudents(data.dashboardData.enrolledStudents || []);
      } catch (error) {
        console.error("Error fetching enrolled students:", error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledStudents();
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
    <div className="min-h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
        <table className="table-fixed md:table-auto w-full overflow-hidden pb-4">
          <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-center hidden sm:table-cell">
                #
              </th>
              <th className="px-4 py-3 font-semibold">Student Name</th>
              <th className="px-4 py-3 font-semibold">Course Title</th>
              <th className="px-4 py-3 font-semibold hidden sm:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-500">
            {enrolledStudents && enrolledStudents.length > 0 ? (
              enrolledStudents.map((student, index) => (
                <tr key={index} className="border-b border-gray-500/20">
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {index + 1}
                  </td>
                  <td className="md:px-4 px-2 py-3 flex items-center space-x-3">
                    <span className="truncate">{student.name}</span>
                  </td>
                  <td className="px-4 py-3 truncate">
                    {student.enrolled_courses && student.enrolled_courses.length > 0
                      ? student.enrolled_courses.map((course, i) => (
                          <div key={i} className="truncate">
                            {course.course_title}
                          </div>
                        ))
                      : "No courses enrolled"}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-600">
                  No students enrolled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentsEnrolled;