import { createContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const backendURL = import.meta.env.VITE_BACKEND_URL;
    const currency = import.meta.env.VITE_CURRENCY;
    const navigate = useNavigate();
    const [allCourses, setAllCourses] = useState([]);
    const [isEducator, setIsEducator] = useState(false);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [lastRefreshed, setLastRefreshed] = useState(null); // Initialize as null
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isLoadingEnrolledCourses, setIsLoadingEnrolledCourses] = useState(false);
    
    // Get user data from localStorage
    const token = localStorage.getItem("token");
    // Initialize user state properly - make sure to safely parse JSON
    const [user, setUser] = useState(() => {
        const userFromStorage = localStorage.getItem("user");
        try {
            return userFromStorage ? JSON.parse(userFromStorage) : null;
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            return null;
        }
    });
    
    // Use refs to track ongoing API requests to prevent duplicate calls
    const refreshUserDataRequestRef = useRef(false);
    const fetchEnrolledCoursesRequestRef = useRef(false);
    const fetchAllCoursesRequestRef = useRef(false);

    // Create an axios instance with custom config
    const api = axios.create({
        baseURL: backendURL,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    // Update headers when token changes
    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete api.defaults.headers.common['Authorization'];
        }
    }, [token, api]);

    // Function to refresh user data
    const refreshUserData = useCallback(async () => {
        if (!token || refreshUserDataRequestRef.current === true) return null;
        
        try {
            refreshUserDataRequestRef.current = true;
            
            // Use direct URL path without api instance
            const { data } = await axios.get(`${backendURL}/users/get_user_data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (data.success) {
                setUser(data.user);
                localStorage.setItem("user", JSON.stringify(data.user));
                
                // Set educator status
                if (data.user?.role === "educator") {
                    setIsEducator(true);
                }
                return data.user;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user data:", error);
            if (error.response?.status === 401) {
                // Clear user data on authentication error
                localStorage.removeItem('user');
                setUser(null);
            }
            return null;
        } finally {
            refreshUserDataRequestRef.current = false;
        }
    }, [backendURL, token]);

    const fetchAllCourses = useCallback(async () => {
        if (fetchAllCoursesRequestRef.current) return;
        
        try {
            fetchAllCoursesRequestRef.current = true;
            
            // Use direct URL path
            const { data } = await axios.get(`${backendURL}/courses`);

            if (data.success) {
                setAllCourses(data.courses);
                setDataLoaded(true);
            } else {
                toast.error(data.message || "Failed to fetch courses.");
            }
        } catch (error) {
            console.error("Error fetching all courses:", error);
           
        } finally {
            fetchAllCoursesRequestRef.current = false;
        }
    }, [backendURL]);

    const fetchUserEnrolledCourses = useCallback(async () => {
        // Don't fetch if no token, no user, already loading, or request in progress
        if (!token || !user || isLoadingEnrolledCourses || fetchEnrolledCoursesRequestRef.current) {
            return enrolledCourses; // Return current state if we can't fetch
        }
      
        try {
            setIsLoadingEnrolledCourses(true);
            fetchEnrolledCoursesRequestRef.current = true;
            
            // Use direct URL path to match routes.rb
            const { data } = await axios.get(`${backendURL}/users/enrolled_courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
      
            if (data.success) {
                console.log("Fetched enrolled courses:", data.user_enrolled_courses);
                const courses = data.user_enrolled_courses.reverse();
                setEnrolledCourses(courses);
                return courses;
            } else {
                toast.error(data.message || "Failed to fetch enrolled courses.");
                return enrolledCourses; // Return current state on error
            }
        } catch (error) {
            console.error("Error fetching enrolled courses:", error);
            return enrolledCourses; // Return current state on error
        } finally {
            setIsLoadingEnrolledCourses(false);
            fetchEnrolledCoursesRequestRef.current = false;
        }
    }, [backendURL, token, user, isLoadingEnrolledCourses, enrolledCourses]);

    // Load data on component mount - ONE TIME ONLY
    useEffect(() => {
        let isMounted = true;
        
        const initializeData = async () => {
            if (!isMounted) return;
            
            // Always fetch courses regardless of authentication
            if (!dataLoaded) {
                await fetchAllCourses();
            }
            
            // Only fetch user-specific data if authenticated
            if (token && user && !isLoadingEnrolledCourses && enrolledCourses.length === 0) {
                await fetchUserEnrolledCourses();
            }
        };
        
        initializeData();
        
        return () => {
            isMounted = false;
        };
    }, [token, dataLoaded, fetchAllCourses, fetchUserEnrolledCourses, user, isLoadingEnrolledCourses, enrolledCourses.length]);

    // Handle manual refresh requests
    useEffect(() => {
        if (lastRefreshed && token) {
            refreshUserData();
            fetchUserEnrolledCourses();
        }
    }, [lastRefreshed, token, fetchUserEnrolledCourses, refreshUserData]);
    
    // Set up interceptors for API response error handling
    useEffect(() => {
        const responseInterceptor = api.interceptors.response.use(
            response => response,
            error => {
                // Handle token expiration
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    navigate('/login');
                    toast.error('Your session has expired. Please log in again.');
                }
                return Promise.reject(error);
            }
        );
        
        return () => {
            // Clean up interceptor on unmount
            api.interceptors.response.eject(responseInterceptor);
        };
    }, [api, navigate]);

    const calculateRating = (course) => {
        if (!course.course_ratings || course.course_ratings.length === 0) {
            return 0;
        }
        let totalRating = 0;
        course.course_ratings.forEach((rating) => (totalRating += rating.rating));
        return (totalRating / course.course_ratings.length).toFixed(1);
    };

    const calculateChapterTime = (chapter) => {
        let time = 0;

        if (Array.isArray(chapter.lectures)) {
            chapter.lectures.forEach((lecture) => {
                if (lecture?.lecture_duration) {
                    time += lecture.lecture_duration;
                }
            });
        }

        return humanizeDuration(time * 60 * 1000, { units: ["h", "m"] });
    };

    const calculateCourseTime = (course) => {
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
    };

    const calculateNoOfLectures = (course) => {
        let count = 0;

        if (Array.isArray(course.chapters)) {
            course.chapters.forEach((chapter) => {
                if (Array.isArray(chapter.lectures)) {
                    count += chapter.lectures.length;
                }
            });
        }

        return count;
    };

    // Function to trigger a manual refresh of all data
    const refreshAllData = () => {
        setLastRefreshed(Date.now());
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
        setUser,
        refreshUserData,
        lastRefreshed,
        setLastRefreshed,
        isLoadingEnrolledCourses,
        api,
        refreshAllData
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
};