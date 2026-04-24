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
import CourseDoubtsPanel from "../../../components/course/CourseDoubtsPanel";

const CourseDetails = () => {
  const { id } = useParams();
  const [openSections, setOpenSections] = useState({});
  const [courseData, setCourseData] = useState(null);
  const [isAlreadyEnrolled, setIsAlreadyEnrolled] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [courseNotes, setCourseNotes] = useState("");
  const navigate = useNavigate();

  const {
    allCourses,
    enrolledCourses,
    calculateRating,
    calculateChapterTime,
    calculateCourseTime,
    calculateNoOfLectures,
    currency,
    backendURL,
    token,
    user,
  } = useContext(AppContext);

  // ✅ YouTube ID extractor (supports all formats)
  const getYoutubeId = (url) => {
    if (!url) {
      console.warn("No URL provided to getYoutubeId");
      return null;
    }

    // If it's already just an ID (11 chars alphanumeric), return it
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      console.log("URL is already a video ID:", url);
      return url;
    }

    try {
      // Handle youtu.be format
      const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (youtuBeMatch) {
        console.log("Extracted from youtu.be:", youtuBeMatch[1]);
        return youtuBeMatch[1];
      }

      // Handle youtube.com/watch?v=VIDEO_ID format
      const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (watchMatch) {
        console.log("Extracted from youtube.com/watch:", watchMatch[1]);
        return watchMatch[1];
      }

      // Handle youtube.com/embed/VIDEO_ID format
      const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) {
        console.log("Extracted from youtube.com/embed:", embedMatch[1]);
        return embedMatch[1];
      }

      // Handle youtube.com/v/VIDEO_ID format
      const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
      if (vMatch) {
        console.log("Extracted from youtube.com/v:", vMatch[1]);
        return vMatch[1];
      }

      // Handle youtube.com/shorts/VIDEO_ID format
      const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) {
        console.log("Extracted from youtube.com/shorts:", shortsMatch[1]);
        return shortsMatch[1];
      }

      console.warn("Could not extract video ID from URL:", url);
      return null;
    } catch (error) {
      console.error("Error extracting YouTube ID:", error);
      return null;
    }
  };

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
      navigate(`/player/${id}`);
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
      // Check enrollment against both user payload and synced context state.
      const userEnrolledIds = (user.enrolled_courses || []).map((course) => Number(course.id));
      const contextEnrolledIds = (enrolledCourses || []).map((course) =>
        Number(course.id || course.course_id)
      );

      const enrolledSet = new Set([...userEnrolledIds, ...contextEnrolledIds]);
      setIsAlreadyEnrolled(enrolledSet.has(Number(courseData.id)));
    }
  }, [user, courseData, enrolledCourses]);

  const courseEducatorId = courseData?.educator_id || courseData?.educator?.id;
  const isCourseEducator = !!user && !!courseEducatorId && String(user.id) === String(courseEducatorId);
  const canViewAnnouncements = isAlreadyEnrolled || isCourseEducator;

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!courseData || !token || !canViewAnnouncements) {
        setAnnouncements([]);
        return;
      }

      try {
        setIsLoadingAnnouncements(true);

        if (isCourseEducator) {
          const { data } = await axios.get(`${backendURL}/educators/courses/${courseData.id}/announcements`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (data.success) {
            setAnnouncements(data.announcements || []);
          }
        } else {
          const { data } = await axios.get(`${backendURL}/users/announcements`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (data.success) {
            const filtered = (data.announcements || []).filter(
              (announcement) => String(announcement.course_id) === String(courseData.id)
            );
            setAnnouncements(filtered);
          }
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setIsLoadingAnnouncements(false);
      }
    };

    fetchAnnouncements();
  }, [backendURL, token, courseData, canViewAnnouncements, isCourseEducator]);

  const handlePostAnnouncement = async (event) => {
    event.preventDefault();

    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      toast.error("Title and message are required");
      return;
    }

    try {
      setIsPostingAnnouncement(true);

      const { data } = await axios.post(
        `${backendURL}/educators/courses/${courseData.id}/announcements`,
        {
          title: announcementTitle.trim(),
          message: announcementMessage.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.success) {
        toast.success("Announcement posted");
        setAnnouncementTitle("");
        setAnnouncementMessage("");
        setAnnouncements((previous) => [data.announcement, ...previous]);
      } else {
        toast.error(data.message || "Failed to post announcement");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post announcement");
    } finally {
      setIsPostingAnnouncement(false);
    }
  };

  const courseDescription = courseData?.course_description || "";
  const educatorName = courseData?.educator?.name || "Unknown Educator";
  const courseContent = courseData?.chapters || [];
  const courseRatings = courseData?.course_ratings || [];
  const courseResources = Array.isArray(courseData?.resources) ? courseData.resources : [];
  const canAccessDoubts = isAlreadyEnrolled || isCourseEducator;
  const canViewResources = isAlreadyEnrolled || isCourseEducator;
  const hasLearningAccess = isAlreadyEnrolled || isCourseEducator;

  const tabs = [
    { id: "overview", label: "Overview", requiresEnrollment: false },
    { id: "qna", label: "Q&A", requiresEnrollment: true },
    { id: "notes", label: "Notes", requiresEnrollment: true },
    { id: "announcements", label: "Announcements", requiresEnrollment: true },
    { id: "learning-tools", label: "Learning Tools", requiresEnrollment: true },
  ];

  useEffect(() => {
    if (hasLearningAccess) return;

    if (activeTab !== "overview") {
      setActiveTab("overview");
    }
  }, [activeTab, hasLearningAccess]);

  useEffect(() => {
    if (!id || !hasLearningAccess) {
      setCourseNotes("");
      return;
    }

    const storageKey = `course_notes_${id}_${user?.id || "guest"}`;
    const storedNotes = localStorage.getItem(storageKey) || "";
    setCourseNotes(storedNotes);
  }, [id, hasLearningAccess, user]);


  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleOpenResource = (resource) => {
    const resourceUrl = resource?.url?.trim();

    if (!resourceUrl) {
      toast.error("No link is available for this resource yet.");
      return;
    }

    window.open(resourceUrl, "_blank", "noopener,noreferrer");
  };

  const handleTabClick = (tab) => {
    if (tab.requiresEnrollment && !hasLearningAccess) {
      toast.info("Enroll to access Q&A, notes, announcements, and learning tools.");
      return;
    }

    setActiveTab(tab.id);
  };

  const handleNotesChange = (event) => {
    const nextValue = event.target.value;
    setCourseNotes(nextValue);

    const storageKey = `course_notes_${id}_${user?.id || "guest"}`;
    localStorage.setItem(storageKey, nextValue);
  };

  if (!courseData) {
    return <Loading />;
  }

  return (
    <>
      <div className="flex md:flex-row flex-col-reverse gap-10 items-start justify-between md:px-36 px-8 md:pt-24 pt-14 text-left">
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

          {hasLearningAccess && (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
                {playerData?.videoId ? (
                  <Youtube
                    videoId={playerData.videoId}
                    options={{
                      playerVars: {
                        autoplay: 1,
                      },
                    }}
                    iframeClassName="w-full aspect-video"
                    onError={(error) => {
                      console.error("YouTube error:", error);
                      toast.error("Error loading preview video");
                      setPlayerData(null);
                    }}
                  />
                ) : (
                  <div className="relative aspect-video">
                    <img
                      src={courseData.thumbnail_url}
                      alt="Course Thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Course content</h3>
                <div className="mt-3 space-y-2">
                  {courseContent.map((chapter, index) => (
                    <button
                      key={`sidebar-chapter-${index}`}
                      type="button"
                      onClick={() => toggleSection(index)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-800">{chapter.chapter_title}</span>
                      <span className="text-xs text-slate-500">{chapter.lectures?.length || 0}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">Total Duration: {calculateCourseTime(courseData)}</p>
              </div>
            </div>
          )}

          <div className="mt-6 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-3 pb-2">
              {tabs.map((tab) => {
                const locked = tab.requiresEnrollment && !hasLearningAccess;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span>{tab.label}</span>
                      {locked && (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <rect x="5" y="11" width="14" height="10" rx="2" />
                          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Course Structure */}
          {activeTab === "overview" && (
          <>
          {!hasLearningAccess && (
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
                                  onClick={() => {
                                    const videoId = getYoutubeId(lecture.lecture_url);
                                    if (videoId) {
                                      setPlayerData({ videoId });
                                    } else {
                                      toast.error("Invalid video URL");
                                    }
                                  }}
                                  className="text-blue-600 cursor-pointer hover:underline"
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
          )}

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
          </>
          )}

          {activeTab === "learning-tools" && canViewResources && courseResources.length > 0 && (
            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Learning extras</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Course Resources</h3>
              <p className="mt-1 text-sm text-slate-600">
                Use these references to explore the topic more deeply.
              </p>

              <div className="mt-4 grid gap-3">
                {courseResources.map((resource, index) => (
                  <div key={`${resource.title || 'resource'}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{resource.title || `Resource ${index + 1}`}</p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          {(resource.resourceType || resource.resource_type || 'link').toString().replace('_', ' ')}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenResource(resource)}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Open Resource
                      </button>
                    </div>

                    {resource.description && (
                      <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                        {resource.description}
                      </p>
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "learning-tools" && hasLearningAccess && courseResources.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              No learning tools added yet. Your instructor can add resources any time.
            </div>
          )}

          {activeTab === "announcements" && canViewAnnouncements && (
            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Course updates</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Announcements</h3>

              {isCourseEducator && (
                <form onSubmit={handlePostAnnouncement} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <input
                    type="text"
                    value={announcementTitle}
                    onChange={(event) => setAnnouncementTitle(event.target.value)}
                    placeholder="Announcement title"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <textarea
                    rows={4}
                    value={announcementMessage}
                    onChange={(event) => setAnnouncementMessage(event.target.value)}
                    placeholder="Write your announcement"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isPostingAnnouncement}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {isPostingAnnouncement ? "Posting..." : "Post Announcement"}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-4 space-y-3">
                {isLoadingAnnouncements ? (
                  <div className="text-sm text-slate-500">Loading announcements...</div>
                ) : announcements.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No announcements yet.
                  </div>
                ) : (
                  announcements.slice(0, 3).map((announcement) => (
                    <div key={announcement.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{announcement.message}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {announcement.created_at ? new Date(announcement.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                  ))
                )}

                {!isLoadingAnnouncements && announcements.length > 3 && (
                  <p className="text-xs text-slate-500">Showing latest 3 announcements</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "qna" && (canAccessDoubts ? (
            <CourseDoubtsPanel
              courseId={courseData.id}
              courseTitle={courseData.course_title}
              backendURL={backendURL}
              token={token}
              mode={isCourseEducator ? "educator" : "student"}
              canAsk={!isCourseEducator && isAlreadyEnrolled}
            />
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
              Enroll in this course to ask doubts and follow the discussion.
            </div>
          ))}

          {activeTab === "notes" && (
            hasLearningAccess ? (
              <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Personal Notes</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">My Notes</h3>
                <p className="mt-1 text-sm text-slate-600">Notes are auto-saved for this course.</p>
                <textarea
                  rows={10}
                  value={courseNotes}
                  onChange={handleNotesChange}
                  placeholder="Write your learning notes here..."
                  className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-600">
                Enroll in this course to use notes.
              </div>
            )
          )}
        </div>

        {/* Right column */}
        {!hasLearningAccess && (
        <div className="md:w-1/3 w-full">
          {playerData ? (
            <div className="rounded-lg shadow-md overflow-hidden">
              {playerData.videoId ? (
                <Youtube
                  videoId={playerData.videoId}
                  options={{
                    playerVars: {
                      autoplay: 1,
                    },
                  }}
                  iframeClassName="w-full rounded-lg aspect-video shadow-md"
                  onError={(error) => {
                    console.error("YouTube error:", error);
                    toast.error("Error loading preview video");
                    setPlayerData(null);
                  }}
                />
              ) : (
                <div className="w-full aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <p className="font-semibold">Invalid video URL</p>
                    <button
                      onClick={() => setPlayerData(null)}
                      className="mt-2 text-blue-600 hover:underline"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                isCourseEducator
                  ? "bg-slate-700 text-white cursor-default"
                  : isAlreadyEnrolled
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isCourseEducator
                ? "You Created This Course"
                : isAlreadyEnrolled
                  ? "Go To Course"
                  : "Enroll Now"}
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
        )}
      </div>
      <Footer />
    </>
  );
};

export default CourseDetails;