import React, { useState, useEffect, useCallback, useContext } from "react";
import { Line } from "rc-progress";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../student/Loading";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import { AppContext } from "../../../context/AppContext";

const MyEnrollments = () => {
  const navigate = useNavigate();
  const { 
    token, 
    backendURL, 
    calculateNoOfLectures, 
    calculateCourseTime,
    enrolledCourses: contextEnrolledCourses,
    fetchUserEnrolledCourses,
    api
  } = useContext(AppContext);
  
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [progressArray, setProgressArray] = useState([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [isLoadingEnrolledCourses, setIsLoadingEnrolledCourses] = useState(false);

  // Centralized error handling
  const handleApiError = useCallback((error, defaultMessage) => {
    console.error(defaultMessage, error);
    if (error.response) {
      toast.error(error.response.data.error || error.response.data.message || defaultMessage);
    } else if (error.request) {
      toast.error("No response received from server. Please check your connection.");
    } else {
      toast.error(`${defaultMessage}: ${error.message}`);
    }
  }, []);

  // Fetch enrolled courses
  const loadEnrolledCourses = useCallback(async () => {
    if (!token || isLoadingEnrolledCourses) return;
    
    try {
      setIsLoadingEnrolledCourses(true);
      
      // Use the fetchUserEnrolledCourses from context if available
      if (contextEnrolledCourses && contextEnrolledCourses.length > 0) {
        setEnrolledCourses(contextEnrolledCourses);
      } else {
        // Use direct URL instead of api instance with path
        const response = await axios.get(`${backendURL}/users/enrolled_courses`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
          console.log("Fetched enrolled courses:", response.data.user_enrolled_courses);
          setEnrolledCourses(response.data.user_enrolled_courses.reverse());
        } else {
          toast.error(response.data.message || "Failed to fetch enrolled courses");
        }
      }
    } catch (error) {
      handleApiError(error, "Failed to fetch enrolled courses");
    } finally {
      setIsLoadingEnrolledCourses(false);
    }
  }, [token, backendURL, contextEnrolledCourses, isLoadingEnrolledCourses, handleApiError]);

  // Fetch course progress
  const getCourseProgress = useCallback(async () => {
    if (!enrolledCourses || enrolledCourses.length === 0 || !token || isLoadingProgress) {
      return;
    }
  
    try {
      setIsLoadingProgress(true);
      
      // Batch request for all course progress to reduce API calls
      const promises = enrolledCourses.map(course => 
        // Use direct URL with course_id as query parameter according to routes.rb
        axios.get(`${backendURL}/users/get_course_progress?course_id=${course.id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
          .catch(error => {
            console.error(`Error fetching progress for course ${course.id}:`, error);
            // Return a default object on error
            return { data: { progressData: { lecture_completed: [] } } };
          })
      );
      
      const responses = await Promise.all(promises);
      
      const tempProgressArray = enrolledCourses.map((course, index) => {
        const response = responses[index];
        const data = response.data;
        
        const totalLectures = calculateNoOfLectures ? 
          calculateNoOfLectures(course) : 
          calculateLocalNoOfLectures(course);
          
        const lectureCompleted = data.progressData?.lecture_completed?.length || 0;
        const completionPercentage =
          totalLectures > 0 ? (lectureCompleted / totalLectures) * 100 : 0;
        
        return { totalLectures, lectureCompleted, completionPercentage };
      });
  
      setProgressArray(tempProgressArray);
    } catch (error) {
      handleApiError(error, "An error occurred while fetching course progress");
    } finally {
      setIsLoadingProgress(false);
    }
  }, [enrolledCourses, calculateNoOfLectures, token, backendURL, isLoadingProgress, handleApiError]);

  // Local fallback for calculateNoOfLectures if context function not available
  const calculateLocalNoOfLectures = useCallback((course) => {
    let count = 0;
    if (Array.isArray(course.chapters)) {
      course.chapters.forEach((chapter) => {
        if (Array.isArray(chapter.lectures)) {
          count += chapter.lectures.length;
        }
      });
    }
    return count;
  }, []);

  // Local fallback for calculateCourseTime if context function not available
  const calculateLocalCourseTime = useCallback((course) => {
    let time = 0;
    if (Array.isArray(course.chapters)) {
      course.chapters.forEach((chapter) => {
        if (Array.isArray(chapter.lectures)) {
          chapter.lectures.forEach((lecture) => {
            if (lecture?.lecture_duration) {
              time += lecture.lecture_duration;
            }
          });
        }
      });
    }
    return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
  }, []);

  // Initial data load when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      if (token && isMounted) {
        loadEnrolledCourses();
      }
    };
    
    initialize();
    
    return () => {
      isMounted = false;
    };
  }, [token, loadEnrolledCourses]);

  // Fetch course progress only after enrolledCourses are loaded
  useEffect(() => {
    let isMounted = true;
    
    const loadProgress = async () => {
      if (enrolledCourses.length > 0 && !isLoadingEnrolledCourses && progressArray.length === 0 && isMounted) {
        getCourseProgress();
      }
    };
    
    loadProgress();
    
    return () => {
      isMounted = false;
    };
  }, [enrolledCourses, getCourseProgress, isLoadingEnrolledCourses, progressArray.length]);

  const refreshCourses = useCallback(() => {
    // Clear current progress data
    setProgressArray([]);
    
    // If we have a context function, use that, otherwise use our local method
    if (fetchUserEnrolledCourses) {
      fetchUserEnrolledCourses().then(courses => {
        if (courses && courses.length > 0) {
          setEnrolledCourses(courses);
        }
      });
    } else {
      loadEnrolledCourses();
    }
  }, [fetchUserEnrolledCourses, loadEnrolledCourses]);

  const isLoading = isLoadingEnrolledCourses || isLoadingProgress;

  return (
    <div className="md:px-36 px-6 pt-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-900">My Enrollments</h1>
        <button 
          onClick={refreshCourses}
          disabled={isLoading}
          className={`px-4 py-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-md transition`}
        >
          {isLoading ? 'Loading...' : 'Refresh Courses'}
        </button>
      </div>
      <div className="overflow-x-auto mt-8">
        {isLoading ? (
          <Loading/>
        ) : enrolledCourses.length === 0 ? (
          <div className="flex flex-col items-center py-10">
            <p className="text-gray-600 mb-4">You have not enrolled in any courses yet.</p>
            <button 
              onClick={() => navigate('/courses')}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
            >
              Browse Courses
            </button>
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
                      src={course.course_thumbnail || "https://via.placeholder.com/100x60?text=No+Image"}
                      alt={course.course_title}
                      className="w-16 sm:w-20 md:w-24 border h-auto object-cover"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/100x60?text=No+Image";
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <p className="font-medium text-gray-800">
                        {course.course_title || "Untitled Course"}
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
                    {calculateCourseTime ? calculateCourseTime(course) : calculateLocalCourseTime(course)}
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
                        : "Continue Learning"}
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