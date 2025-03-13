import { createContext, useContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import axios from "axios";
import { toast } from "react-toastify";
import { useCallback } from "react";
export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const backendURL = import.meta.env.VITE_BACKEND_URL;
    const currency = import.meta.env.VITE_CURRENCY;
    const navigate = useNavigate();
    const [allCourses, setAllCourses] = useState([]);
    const [isEducator, setIsEducator] = useState(false);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [lastRefreshed, setLastRefreshed] = useState(Date.now());
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isLoadingEnrolledCourses, setIsLoadingEnrolledCourses] = useState(false);

    const fetchAllCourses = useCallback(async () => {
        try {
            const { data } = await axios.get(`${backendURL}/api/course/all`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (data.success) {
                setAllCourses(data.courses);
                setDataLoaded(true);
            } else {
                toast.error(data.message || "Failed to fetch courses.");
            }
        } catch (error) {
            console.error("Error fetching all courses:", error);
            toast.error(error.response?.data?.message || "An error occurred while fetching courses.");
        }
    }, [backendURL, token]);

    const fetchUserEnrolledCourses = useCallback(async () => {
        if (!token || isLoadingEnrolledCourses) return;
      
        try {
          setIsLoadingEnrolledCourses(true);
          const { data } = await axios.get(`${backendURL}/api/user/enrolled-courses`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
      
          if (data.success) {
            console.log("Fetched enrolled courses:", data.user_enrolled_courses);
            setEnrolledCourses(data.user_enrolled_courses.reverse());
            return data.user_enrolled_courses;
          } else {
            toast.error(data.message || "Failed to fetch enrolled courses.");
            return [];
          }
        } catch (error) {
          console.error("Error fetching enrolled courses:", error);
          toast.error(error.response?.data?.message || "An error occurred while fetching enrolled courses.");
          return [];
        } finally {
          setIsLoadingEnrolledCourses(false);
        }
      }, [backendURL, token, isLoadingEnrolledCourses]); // Only recreate if backendURL, token, or isLoadingEnrolledCourses changes

    // Only fetch all courses and enrolled courses once when component mounts
    useEffect(() => {
        fetchAllCourses();
        if (token) {
          fetchUserEnrolledCourses();
        }
      }, [token, fetchAllCourses, fetchUserEnrolledCourses]); // Only run when token changes

    // Set up a listener for lastRefreshed changes
    useEffect(() => {
        if (lastRefreshed && token) {
            fetchUserEnrolledCourses();
        }
    }, [lastRefreshed, token, fetchUserEnrolledCourses]);

    const calculateRating = (course) => {
        if (!course.course_ratings || course.course_ratings.length === 0) {
            return 0;
        }
        let totalRating = 0;
        course.course_ratings.forEach((rating) => (totalRating += rating.rating));
        return Math.floor(totalRating / course.course_ratings.length);
    };

    const calculateChapterTime = (chapter) => {
        let time = 0;

        if (Array.isArray(chapter.chapter_content)) {
            chapter.chapter_content.forEach((lecture) => {
                if (lecture?.lecture_duration) {
                    time += lecture.lecture_duration;
                }
            });
        }

        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
    };

    const calculateCourseTime = (course) => {
        let time = 0;

        if (Array.isArray(course.course_content)) {
            course.course_content.forEach((chapter) => {
                if (Array.isArray(chapter.chapter_content)) {
                    chapter.chapter_content.forEach((lecture) => {
                        if (lecture?.lecture_duration) {
                            time += lecture.lecture_duration;
                        }
                    });
                }
            });
        }

        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
    };

    const calculateNoOfLectures = (course) => {
        let count = 0;

        if (Array.isArray(course.course_content)) {
            course.course_content.forEach((chapter) => {
                if (Array.isArray(chapter.chapter_content)) {
                    count += chapter.chapter_content.length;
                }
            });
        }

        return count;
    };

    const value = {
        currency,
        allCourses,
        navigate,
        calculateRating,
        isEducator,
        setIsEducator,
        calculateChapterTime,
        calculateCourseTime,
        calculateNoOfLectures,
        enrolledCourses,
        setEnrolledCourses,
        fetchUserEnrolledCourses,
        backendURL,
        token,
        user,
        lastRefreshed,
        setLastRefreshed,
        isLoadingEnrolledCourses
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};