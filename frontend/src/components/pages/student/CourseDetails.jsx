import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../../../context/AppContext";
import { assets } from "../../../assets/assets";
import Loading from "../../student/Loading";
import humanizeDuration from "humanize-duration";
import Footer from "../../student/Footer";
import Youtube from "react-youtube";
import { toast } from "react-toastify";
import axios from "axios";

const CourseDetails = () => {
  const { id } = useParams();
  const [openSections, setOpenSections] = useState({});
  const [courseData, setCourseData] = useState(null);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const navigate = useNavigate();

  const {
    allCourses,
    calculateRating,
    calculateChapterTime,
    calculateCourseTime,
    calculateNoOfLectures,
    currency,
    backendURL,
    token,
    user,
  } = useContext(AppContext);

  const fetchCourseData = async () => {
    try {
      const { data } = await axios.get(`${backendURL}/courses/${id}`, {
        headers: token ? {
          Authorization: `Bearer ${token}`,
        } : {}
      });

      if (data.success) {
        setCourseData(data.course);
      } else {
        toast.error(`Failed to fetch course data: ${data.message}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching course data");
    }
  };

  const initiatePayment = () => {
    if (!user) {
      toast.warn("Please login to enroll in a course.");
      navigate("/auth");
      return;
    }
      
    if (isAlreadyEnrolled) {
      toast.warn("You are already enrolled in this course.");
      return;
    }
    
    // Navigate to the payment page instead of showing the form inline
    navigate(`/payment/${id}`);
  };

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  useEffect(() => {
    if (user && courseData) {
      // Check if user is already enrolled in this course
      const enrolledCourseIds = user.enrolled_courses?.map(course => course.id) || [];
      setIsAlreadyEnrolled(enrolledCourseIds.includes(courseData.id));
    }
  }, [user, courseData]);

  if (!courseData) {
    return <Loading />;
  }

  const courseDescription = courseData.course_description || "";
  const educatorName = courseData.educator?.name || "Unknown Educator";
  const courseContent = courseData.chapters || [];
  const courseRatings = courseData.course_ratings || [];


  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <>
      <div className="flex md:flex-row flex-col-reverse gap-10 items-start justify-between md:px-36 px-8 md:pt-30 pt-20 text-left">
        {/* Background gradient */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-cyan-100/70 -z-10"></div>

        {/* Left column */}
        <div className="flex-1 md:w-1/2">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            {courseData.course_title}
          </h1>
          {/* <p
            className="text-base text-gray-600"
            dangerouslySetInnerHTML={{
              __html: courseDescription.slice(0, 200),
            }}
          /> */}
          {/* Review and rating */}
          <div className="flex items-center space-x-2 pt-3 pb-1 text-sm">
            {/* <p>{calculateRating(courseData)}</p> */}
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <img
                  className="w-3.5 h-3.5"
                  key={i}
                  src={
                    i < Math.floor(calculateRating(courseData))
                      ? assets.star
                      : assets.star_blank
                  }
                  alt="star"
                />
              ))}
            </div>
            <p className="text-gray-500">
              ({courseRatings.length} {courseRatings.length > 1 ? "ratings" : "rating"})
            </p>
            <p className="text-gray-500">
  {courseData.enrolled_students_count}{" "}
  {courseData.enrolled_students_count === 1 ? "Student" : "Students"}
</p>

          </div>
          <p className="text-gray-600">
            Course by <span className="text-blue-600">{educatorName}</span>
          </p>

          {/* Course Structure */}
          <div className="pt-8 text-gray-800">
            <h2 className="text-xl font-semibold">Course Structure</h2>

            <div className="pt-5">
              {courseContent.map((chapter, index) => (
                <div
                  key={index}
                  className="border border-gray-300 bg-white mb-2 rounded"
                >
                  <div
                    onClick={() => toggleSection(index)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        className={`transform transition-transform ${
                          openSections[index] ? "rotate-180" : ""
                        }`}
                        src={assets.down_arrow_icon}
                        alt="arrow icon"
                      />
                      <p className="font-medium md:text-base text-sm">
                        {chapter.chapter_title}
                      </p>
                    </div>
                    <p className="text-sm md:text-base">
                      {chapter.lectures?.length || 0} lectures -{" "}
                      {calculateChapterTime(chapter)}
                    </p>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      openSections[index] ? "max-h-96" : "max-h-0"
                    }`}
                  >
                    <ul className="md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                      {chapter.lectures?.map((lecture, i) => (
                        <li key={i} className="flex items-center gap-2 py-1">
                          <img
                            src={assets.play_icon}
                            className="w-4 h-4"
                            alt="play icon"
                          />
                          <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-base">
                            <p>{lecture.lecture_title}</p>

                            <div className="flex gap-2">
                              {lecture.is_preview_free && lecture.lecture_url && (
                                <p
                                  onClick={() =>
                                    setPlayerData({
                                      videoId: lecture.lecture_url.split("/").pop(),
                                    })
                                  }
                                  className="text-blue-600 cursor-pointer"
                                >
                                  Preview
                                </p>
                              )}
                              <p>
                                {humanizeDuration(
                                  lecture.lecture_duration * 60 * 1000,
                                  { units: ["h", "m"] }
                                )}
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
          </div>

          {/* Course Description */}
          <div className="pt-8">
            <h3 className="text-xl font-semibold">Course Description</h3>
            <p
              className="pt-3 text-gray-600 rich-text"
              dangerouslySetInnerHTML={{
                __html: courseDescription,
              }}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="md:w-1/3 w-full">
          {playerData ? (
            <Youtube
              videoId={playerData.videoId}
              options={{
                playerVars: {
                  autoplay: 1,
                },
              }}
              iframeClassName="w-full rounded-lg aspect-video shadow-md"
            />
          ) : (
            <img
              src={courseData.thumbnail_url}
              alt="Course Thumbnail"
              className="w-full h-auto rounded-lg shadow-md"
            />
          )}

          <div className="pt-5">
            <div className="flex items-center gap-2">
              <img
                className="w-4 h-4"
                src={assets.time_left_clock_icon}
                alt="time_left_clock_icon"
              />
              <p className="text-red-500 text-sm">
                <span className="font-medium">5 days</span> left at this price!
              </p>
            </div>
            <div className="flex gap-3 items-center pt-2">
              <p className="text-gray-800 md:text-4xl text-2xl font-semibold">
                {currency}
                {(
                  courseData.course_price -
                  (courseData.discount * courseData.course_price) / 100
                ).toFixed(2)}
              </p>
              <p className="md:text-lg text-gray-500 line-through">
                {currency}
                {courseData.course_price}
              </p>
              <p className="md:text-lg text-gray-500">
                {courseData.discount}% off
              </p>
            </div>

            <div className="flex items-center text-sm md:text-base gap-4 pt-2 md:pt-4 text-gray-500">
              <div className="flex items-center gap-1">
                <img src={assets.star} alt="star icon" className="w-4 h-4" />
                <p>{calculateRating(courseData)}</p>
              </div>

              <div className="h-4 w-px bg-gray-500/40"></div>
              <div className="flex items-center gap-1">
                <img
                  src={assets.time_clock_icon}
                  alt="clock icon"
                  className="w-4 h-4"
                />
                <p>{calculateCourseTime(courseData)}</p>
              </div>

              <div className="h-4 w-px bg-gray-500/40"></div>

              <div className="flex items-center gap-1">
                <img
                  src={assets.lesson_icon}
                  alt="lesson icon"
                  className="w-4 h-4"
                />
                <p>{calculateNoOfLectures(courseData)} lessons</p>
              </div>
            </div>

            <button
              onClick={initiatePayment}
              className={`md:mt-6 mt-4 w-full py-3 rounded font-medium transition-colors ${
                isAlreadyEnrolled 
                  ? "bg-green-600 text-white hover:bg-green-700" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isAlreadyEnrolled ? "Already Enrolled" : "Enroll Now"}
            </button>

            <div className="pt-6">
              <p className="md:text-xl text-lg font-medium text-gray-800">
                What's in the course?
              </p>
              <ul className="ml-4 pt-2 text-sm md:text-base list-disc text-gray-500">
                <li>Lifetime access with free updates.</li>
                <li>Step-by-step, hands-on project guidance.</li>
                <li>Downloadable resources and source code.</li>
                <li>Quizzes to test your knowledge.</li>
                <li>Certificate of completion.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CourseDetails;