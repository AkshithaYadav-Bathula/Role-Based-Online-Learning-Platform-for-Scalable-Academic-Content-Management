import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../../../context/AppContext";
import Loading from "../../student/Loading";
import { useLocation } from "react-router-dom";

const StudentsEnrolled = () => {
  const { backendURL, token } = useContext(AppContext);
  const location = useLocation();
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchParams = new URLSearchParams(location.search);
  const courseIdFilter = searchParams.get("courseId") || "";
  const courseTitleFilter = searchParams.get("courseTitle") || "";

  const visibleStudents = courseIdFilter
    ? enrolledStudents.filter((student) => String(student.courseId) === String(courseIdFilter))
    : enrolledStudents;

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      try {
        const response = await fetch(`${backendURL}/educators/enrolled_students`, {
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
        setEnrolledStudents(data.enrolledStudents || []);
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
    <div className="w-full md:p-8 p-4 pt-8">
      <div className="w-full max-w-5xl space-y-4">
      {courseIdFilter && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Showing enrollments for: <span className="font-semibold">{courseTitleFilter || "Selected Course"}</span>
        </div>
      )}

      <div className="w-full overflow-hidden rounded-md bg-white border border-gray-500/20 shadow-sm">
        <table className="table-fixed md:table-auto w-full overflow-hidden pb-4">
          <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
            <tr>
              <th className="px-4 py-3 font-semibold text-center hidden sm:table-cell">
                #
              </th>
              <th className="px-4 py-3 font-semibold">Student Name</th>
              <th className="px-4 py-3 font-semibold hidden sm:table-cell">Email</th>
              <th className="px-4 py-3 font-semibold">Course Title</th>
              <th className="px-4 py-3 font-semibold">Completion</th>
              <th className="px-4 py-3 font-semibold hidden sm:table-cell">
                Purchase Date
              </th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-500">
            {visibleStudents && visibleStudents.length > 0 ? (
              visibleStudents.map((student, index) => (
                <tr key={index} className="border-b border-gray-500/20">
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {index + 1}
                  </td>
                  <td className="md:px-4 px-2 py-3 flex items-center space-x-3">
                    <span className="truncate">{student.studentName || student.studentId}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell truncate">{student.studentEmail || "-"}</td>
                  <td className="px-4 py-3 truncate">
                    {student.courseTitle}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700 min-w-[42px]">
                        {student.completionPercentage ?? 0}%
                      </span>
                      <div className="h-2 w-20 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${student.completionPercentage ?? 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {new Date(student.purchaseDate).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-600">
                  {courseIdFilter ? "No students enrolled in this course yet." : "No students enrolled yet."}
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

export default StudentsEnrolled;