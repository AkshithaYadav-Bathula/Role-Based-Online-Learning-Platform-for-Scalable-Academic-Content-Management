import React, { useContext, useEffect, useState, useCallback } from "react";
import { AppContext } from "../../../context/AppContext";
import { Line } from "rc-progress";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../student/Loading";

const MyEnrollments = () => {
  const {
    enrolledCourses,
    calculateCourseTime,
    navigate,
    user,
    fetchUserEnrolledCourses,
    calculateNoOfLectures,
    backendURL,
    lastRefreshed,
    isLoadingEnrolledCourses
  } = useContext(AppContext);

  const [progressArray, setProgressArray] = useState([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const token = localStorage.getItem("token");

  const getCourseProgress = useCallback(async () => {
    if (!enrolledCourses || enrolledCourses.length === 0) {
      setProgressArray([]);
      return;
    }
  
    try {
      setIsLoadingProgress(true);
      const tempProgressArray = await Promise.all(
        enrolledCourses.map(async (course) => {
          try {
            const { data } = await axios.get(
              `${backendURL}/api/user/get-course-progress?course_id=${course.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
  
            const totalLectures = calculateNoOfLectures(course);
            const lectureCompleted = data.progressData?.lecture_completed?.length || 0;
            const completionPercentage =
              totalLectures > 0 ? (lectureCompleted / totalLectures) * 100 : 0;
  
            return { totalLectures, lectureCompleted, completionPercentage };
          } catch (error) {
            console.error(`Error fetching progress for course ${course.id}:`, error);
            return { totalLectures: 0, lectureCompleted: 0, completionPercentage: 0 };
          }
        })
      );
  
      setProgressArray(tempProgressArray);
    } catch (error) {
      console.error("Error in getCourseProgress:", error);
      if (error.response) {
        toast.error(
          error.response.data.message ||
            "An error occurred while fetching course progress."
        );
      } else if (error.request) {
        toast.error("No response received from server. Please check your connection.");
      } else {
        toast.error("An error occurred while fetching course progress: " + error.message);
      }
    } finally {
      setIsLoadingProgress(false);
    }
  }, [enrolledCourses, calculateNoOfLectures, backendURL, token]); // Only recreate if dependencies change

  // Fetch progress data when enrolledCourses changes
  useEffect(() => {
    if (enrolledCourses && enrolledCourses.length > 0) {
      getCourseProgress();
    }
  }, [enrolledCourses, getCourseProgress]); // Only run when enrolledCourses changes

  const isLoading = isLoadingEnrolledCourses || isLoadingProgress;

  return (
    <div className="md:px-36 px-6 pt-10">
      <h1 className="text-3xl font-semibold text-gray-900">My Enrollments</h1>
      <div className="overflow-x-auto mt-8">
        {isLoading ? 
        <Loading/>
         : enrolledCourses.length === 0 ? (
          <div className="flex justify-center py-10">
            <p className="text-gray-600">You have not enrolled in any courses yet.</p>
          </div>
        ) : (
          <table className="w-full border border-gray-300 rounded-lg overflow-hidden shadow-md">
            <thead className="bg-gray-200 text-gray-900 text-sm">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Course</th>
                <th className="px-6 py-4 text-left font-semibold">Duration</th>
                <th className="px-6 py-4 text-left font-semibold">Completed</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enrolledCourses.map((course, index) => (
                <tr key={course.id || index} className="hover:bg-gray-100">
                  {/* Course Thumbnail and Title */}
                  <td className="px-6 py-4 flex items-center gap-4">
                    <img
                      src={course.course_thumbnail}
                      alt="Course Thumbnail"
                      className="w-16 sm:w-20 md:w-24 border"
                    />
                    <div className="flex flex-col gap-2">
                      <p className="font-medium text-gray-800">
                        {course.course_title}
                      </p>
                      {/* Progress Bar */}
                      <div className="flex items-center gap-2">
                        <Line
                          percent={progressArray[index]?.completionPercentage || 0}
                          strokeWidth={2}
                          strokeColor="#2563eb"
                          trailColor="#e5e7eb"
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600">
                          {Math.round(progressArray[index]?.completionPercentage || 0)}%
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Course Duration */}
                  <td className="px-6 py-4 text-gray-700">
                    {calculateCourseTime(course)}
                  </td>

                  {/* Completed Lectures */}
                  <td className="px-6 py-4 text-gray-700">
                    {progressArray[index] &&
                      `${progressArray[index].lectureCompleted}/${progressArray[index].totalLectures}`}
                    <span className="text-sm"> Lectures</span>
                  </td>

                  {/* Course Status */}
                  <td className="px-6 py-4">
                    <button
                      className={`px-4 py-2 rounded-sm text-sm font-semibold items-center text-white ${
                        progressArray[index] &&
                        progressArray[index].completionPercentage === 100
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      onClick={() => navigate("/player/" + course.id)}
                    >
                      {progressArray[index] &&
                      progressArray[index].completionPercentage === 100
                        ? "Completed"
                        : "Ongoing"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MyEnrollments;