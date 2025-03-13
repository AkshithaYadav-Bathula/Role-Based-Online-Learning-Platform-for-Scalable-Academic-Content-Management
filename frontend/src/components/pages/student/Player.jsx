import React, { useContext, useEffect, useState, useCallback } from 'react';
import { AppContext } from '../../../context/AppContext';
import { assets } from '../../../assets/assets';
import humanizeDuration from 'humanize-duration';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import Footer from '../../student/Footer';
import Rating from '../../student/Rating';
import Loading from '../../student/Loading';
import axios from 'axios';
import { toast } from 'react-toastify';

const Player = () => {
  const {
    enrolledCourses,
    calculateChapterTime,
    backendURL,
    token,
    user,
    lastRefreshed,
    setLastRefreshed,
  } = useContext(AppContext);

  const navigate = useNavigate();
  const { courseID } = useParams();
  const [openSections, setOpenSections] = useState({});
  const [courseData, setCourseData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [progressData, setProgressData] = useState({ lecture_completed: [] });
  const [initialRating, setInitialRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch course data
  const getCourseData = useCallback(() => {
    if (!enrolledCourses || enrolledCourses.length === 0) return;

    const findCourse = enrolledCourses.find((course) => course.id === courseID);
    if (findCourse) {
      setCourseData(findCourse);

      // Set initial rating if the user has already rated the course
      const userRating = findCourse.course_ratings?.find(
        (rating) => rating.user_id === user?.id
      );
      if (userRating) {
        setInitialRating(userRating.rating);
      }
    }
  }, [enrolledCourses, courseID, user]);

  // Fetch course progress
  const getCourseProgress = useCallback(async () => {
    if (!courseID || !token) return;

    try {
      const { data } = await axios.get(
        `${backendURL}/api/user/get-course-progress?course_id=${courseID}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProgressData(data.progressData || { lecture_completed: [] });
    } catch (error) {
      console.error("Error fetching course progress:", error);
      toast.error(
        error.response?.data?.message ||
          'An error occurred while fetching course progress.'
      );
    }
  }, [backendURL, courseID, token]);

  // Mark lecture as completed
  const markLectureCompleted = async (lecture) => {
    if (!courseData || !lecture) return;

    try {
      const { data } = await axios.post(
        `${backendURL}/api/user/update-course-progress`,
        {
          course_id: courseID,
          lecture_id: lecture.lecture_id,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (data.success) {
        toast.success('Lecture marked as completed successfully!');
        await getCourseProgress(); // Refresh progress data

        // Update lastRefreshed to trigger enrolledCourses update in the parent context
        setLastRefreshed(Date.now());
      } else {
        toast.error(data.message || 'Failed to mark lecture as completed.');
      }
    } catch (error) {
      console.error("Error marking lecture as completed:", error);
      toast.error(
        error.response?.data?.message ||
          'An error occurred while marking lecture completed.'
      );
    }
  };

  // Handle course rating
  const handleRate = async (rating) => {
    if (!courseData) return;

    try {
      const { data } = await axios.post(
        `${backendURL}/api/user/add-rating`,
        {
          course_id: courseID,
          rating: rating,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        toast.success('Course rating submitted successfully!');
        setInitialRating(rating);

        // Update lastRefreshed to trigger enrolledCourses update in the parent context
        setLastRefreshed(Date.now());
      } else {
        toast.error(data.message || 'Failed to submit rating.');
      }
    } catch (error) {
      console.error("Error rating course:", error);
      toast.error(
        error.response?.data?.message || 'An error occurred while rating the course.'
      );
    }
  };

  // Fetch data when component mounts and when enrolledCourses changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      getCourseData();
      await getCourseProgress();
      setIsLoading(false);
    };

    if (enrolledCourses && enrolledCourses.length > 0) {
      loadData();
    }
  }, [enrolledCourses, getCourseData, getCourseProgress]);

  // Toggle section visibility
  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Check if lecture is completed
  const isLectureCompleted = (lectureId) => {
    return progressData?.lecture_completed?.includes(lectureId) || false;
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!courseData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-xl text-gray-600">Course not found or not enrolled.</p>
        <button
          onClick={() => navigate('/my-enrollments')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to My Enrollments
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-10 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36">
        {/* Left Column: Course Structure */}
        <div className="text-gray-800">
          <h2>Course Structure</h2>
          <div className="pt-5">
            {courseData.course_content?.map((chapter, index) => (
              <div key={chapter.chapter_id || index} className="border border-gray-300 bg-white mb-2 rounded">
                <div
                  onClick={() => toggleSection(index)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <img
                      className={`transform transition-transform ${
                        openSections[index] ? 'rotate-180' : ''
                      }`}
                      src={assets.down_arrow_icon}
                      alt="arrow icon"
                    />
                    <p className="font-medium md:text-base text-sm">
                      {chapter.chapter_title}
                    </p>
                  </div>
                  <p className="text-sm md:text-base">
                    {chapter.chapter_content?.length || 0} lectures - {calculateChapterTime(chapter)}
                  </p>
                </div>
                <div className={`overflow-hidden transition-all duration-300 ${openSections[index] ? 'max-h-96' : 'max-h-0'}`}>
                  <ul className="md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                    {chapter.chapter_content?.map((lecture, i) => (
                      <li key={lecture.lecture_id || i} className="flex items-center gap-2 py-1">
                        <img
                          src={
                            isLectureCompleted(lecture.lecture_id)
                              ? assets.blue_tick_icon
                              : assets.play_icon
                          }
                          className="w-4 h-4"
                          alt="play icon"
                        />
                        <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-base">
                          <p>{lecture.lecture_title}</p>
                          <div className="flex gap-2">
                            {lecture.lecture_url && (
                              <p
                                onClick={() => setPlayerData({ ...lecture, chapter: index + 1, lecture: i + 1 })}
                                className="text-blue-600 cursor-pointer"
                              >
                                Watch
                              </p>
                            )}
                            <p>
                              {humanizeDuration(lecture.lecture_duration * 60 * 1000, { units: ['h', 'm'] })}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Course Rating */}
          <div className="flex items-center gap-2 py-3 mt-10">
            <h1 className="text-xl font-bold">Rate this Course:</h1>
            <Rating initialRating={initialRating} onRate={handleRate} />
          </div>
        </div>

        {/* Right Column: Video Player */}
        <div>
          {playerData ? (
            <div>
              <YouTube
                videoId={playerData.lecture_url?.split('/').pop()}
                iframeClassName="w-full aspect-video"
              />
              <button
                onClick={() => markLectureCompleted(playerData)}
                className={`mt-3 px-4 py-2 rounded ${
                  isLectureCompleted(playerData.lecture_id)
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}
              >
                {isLectureCompleted(playerData.lecture_id) ? 'Completed' : 'Mark Complete'}
              </button>
            </div>
          ) : (
            <img
              src={courseData.course_thumbnail}
              alt="Course Thumbnail"
              className="w-full rounded-lg shadow-md"
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Player;