import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppContext } from '../../../context/AppContext';
import { assets } from '../../../assets/assets';
import humanizeDuration from 'humanize-duration';
import { useParams, useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';
import Footer from '../../student/Footer';
import Rating from '../../student/Rating';
import axios from 'axios';
import { toast } from 'react-toastify';
import CourseDoubtsPanel from '../../../components/course/CourseDoubtsPanel';
import { downloadCourseCertificate } from '../../../utils/certificate';

const Player = () => {

  const {
    enrolledCourses,
    calculateChapterTime,
    calculateCourseTime,
    backendURL,
    token,
    user,
    setLastRefreshed,
    fetchUserEnrolledCourses,
  } = useContext(AppContext);

  const navigate = useNavigate();
  const { courseID } = useParams();

  const [openSections, setOpenSections] = useState({});
  const [courseData, setCourseData] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [progressData, setProgressData] = useState({ lecture_completed: [] });
  const [initialRating, setInitialRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progressFetched, setProgressFetched] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [playerNotes, setPlayerNotes] = useState('');
  const doubtsSectionRef = useRef(null);
  const hasAutoSelectedLectureRef = useRef(false);


  // ✅ FIXED: Youtube ID extractor (supports all formats)
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
      // Handle youtu.be format: https://youtu.be/VIDEO_ID or youtu.be/VIDEO_ID?t=10
      const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (youtuBeMatch) {
        console.log("Extracted from youtu.be:", youtuBeMatch[1]);
        return youtuBeMatch[1];
      }

      // Handle youtube.com/watch?v=VIDEO_ID format with or without query params
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


  // API URL builder
  const createApiUrl = useCallback((endpoint) => {

    const baseUrl = backendURL.endsWith('/')
      ? backendURL.slice(0, -1)
      : backendURL;

    const apiPath = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    return `${baseUrl}${apiPath}`;

  }, [backendURL]);


  const applyCourseData = useCallback((course) => {
    if (!course) return;

    setCourseData(course);

    const userRating = course.course_ratings?.find(
      (rating) => rating.user_id === user?.id
    );

    if (userRating) {
      setInitialRating(userRating.rating);
    }
  }, [user]);


  // Fetch course data with fallback when context enrollments are still empty
  const resolveCourseData = useCallback(async () => {
    if (!token || !courseID) {
      setIsLoading(false);
      return;
    }

    try {
      let candidateCourses = Array.isArray(enrolledCourses) ? enrolledCourses : [];

      if (fetchUserEnrolledCourses) {
        const fetchedCourses = await fetchUserEnrolledCourses();
        if (Array.isArray(fetchedCourses)) {
          candidateCourses = fetchedCourses;
        }
      }

      const matchedCourse = candidateCourses.find(
        (course) => String(course.id) === String(courseID)
      );

      if (matchedCourse) {
        applyCourseData(matchedCourse);
      }
    } catch (error) {
      console.error("Error resolving player course data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token, courseID, enrolledCourses, fetchUserEnrolledCourses, applyCourseData]);


  // Fetch progress
  const getCourseProgress = useCallback(async () => {

    if (!courseID || !token || progressFetched) return;

    try {

      const { data } = await axios.get(
        createApiUrl(
          `users/get_course_progress?course_id=${courseID}`
        ),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProgressData(
        data.progressData || { lecture_completed: [] }
      );

      setLastRefreshed(Date.now());

    } catch (error) {

      console.error(
        "Error fetching course progress:",
        error
      );

      handleApiError(
        error,
        'Error fetching course progress'
      );
    } finally {
      setProgressFetched(true);
    }

  }, [
    createApiUrl,
    courseID,
    token,
    progressFetched,
  ]);


  const handleApiError = (error, msg) => {

    if (error.response) {

      toast.error(
        error.response.data.error ||
        error.response.data.message ||
        msg
      );

    } else if (error.request) {

      toast.error(
        "Server not responding"
      );

    } else {

      toast.error(
        `${msg}: ${error.message}`
      );
    }
  };

  const handleOpenResource = (resource) => {
    const resourceUrl = resource?.url?.trim();

    if (!resourceUrl) {
      toast.error("No link is available for this resource yet.");
      return;
    }

    window.open(resourceUrl, "_blank", "noopener,noreferrer");
  };


  // Mark lecture completed
  const markLectureCompleted = async (lecture) => {

    if (!courseData || !lecture) return;

    try {

      const { data } = await axios.post(
        createApiUrl(
          'users/update_course_progress'
        ),
        {
          course_id: courseID,
          lecture_id:
            lecture.lecture_id ||
            lecture.id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (data.success) {

        toast.success(
          'Lecture marked completed!'
        );

        setProgressData((prev) => {

          const updated =
            [...prev.lecture_completed];

          if (
            !updated.includes(
              lecture.lecture_id ||
              lecture.id
            )
          ) {
            updated.push(
              lecture.lecture_id ||
              lecture.id
            );
          }

          return {
            ...prev,
            lecture_completed: updated,
          };
        });

        setLastRefreshed(Date.now());

      } else {

        toast.error(
          data.message ||
          'Failed updating progress'
        );
      }

    } catch (error) {

      console.error(error);

      handleApiError(
        error,
        'Progress update failed'
      );
    }
  };


  // Submit rating
  const handleRate = async (rating) => {

    if (!courseData) return;

    try {

      const { data } = await axios.post(
        createApiUrl('users/add_rating'),
        {
          course_id: courseID,
          rating,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {

        toast.success('Rating saved');

        setInitialRating(rating);

        setLastRefreshed(Date.now());

      } else {

        toast.error(
          data.message ||
          'Rating failed'
        );
      }

    } catch (error) {

      console.error(error);

      handleApiError(
        error,
        'Rating error'
      );
    }
  };


  // Load course
  useEffect(() => {
    resolveCourseData();
  }, [resolveCourseData]);


  // Load progress
  useEffect(() => {

    if (
      courseID &&
      token &&
      !progressFetched
    ) {

      getCourseProgress();
    }

  }, [
    courseID,
    token,
    getCourseProgress,
    progressFetched,
  ]);


  const toggleSection = (index) => {

    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };


  const isLectureCompleted = (lectureId) => {

    return (
      progressData?.lecture_completed?.includes(
        lectureId
      ) || false
    );
  };

  const scrollToDoubts = () => {
    setActiveTab('qna');
    setTimeout(() => {
      if (doubtsSectionRef.current) {
        doubtsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const fetchCourseAnnouncements = useCallback(async () => {
    if (!token || !courseID) return;

    try {
      setIsLoadingAnnouncements(true);

      const { data } = await axios.get(createApiUrl('users/announcements'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        const filteredAnnouncements = (data.announcements || []).filter(
          (announcement) => String(announcement.course_id) === String(courseID)
        );
        setAnnouncements(filteredAnnouncements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  }, [createApiUrl, token, courseID]);

  useEffect(() => {
    fetchCourseAnnouncements();
  }, [fetchCourseAnnouncements]);

  useEffect(() => {
    hasAutoSelectedLectureRef.current = false;
    setPlayerData(null);
    setActiveTab('overview');
  }, [courseID]);

  useEffect(() => {
    if (!courseID) {
      setPlayerNotes('');
      return;
    }

    const storageKey = `player_notes_${courseID}_${user?.id || 'guest'}`;
    setPlayerNotes(localStorage.getItem(storageKey) || '');
  }, [courseID, user]);

  const getOrderedLectures = useCallback((course) => {
    if (!course?.chapters?.length) return [];

    return [...course.chapters]
      .sort((chapterA, chapterB) => (chapterA.chapter_order || 0) - (chapterB.chapter_order || 0))
      .flatMap((chapter) =>
        [...(chapter.lectures || [])].sort(
          (lectureA, lectureB) => (lectureA.lecture_order || 0) - (lectureB.lecture_order || 0)
        )
      );
  }, []);

  const getResumeStorageKey = useCallback(() => {
    if (!user?.id || !courseID) return null;
    return `edemy:last-lecture:${user.id}:${courseID}`;
  }, [user, courseID]);

  const saveLastLecture = useCallback((lecture) => {
    const key = getResumeStorageKey();
    if (!key || !lecture) return;

    const lectureId = lecture.lecture_id || lecture.id;
    if (!lectureId) return;

    localStorage.setItem(key, String(lectureId));
  }, [getResumeStorageKey]);

  useEffect(() => {
    if (!playerData) return;
    saveLastLecture(playerData);
  }, [playerData, saveLastLecture]);

  useEffect(() => {
    if (!courseData || !progressFetched || hasAutoSelectedLectureRef.current) return;

    const orderedLectures = getOrderedLectures(courseData);
    if (orderedLectures.length === 0) return;

    const completedSet = new Set(
      (progressData?.lecture_completed || []).map((lectureId) => String(lectureId))
    );

    let nextLecture = null;
    const resumeKey = getResumeStorageKey();

    if (resumeKey) {
      const savedLectureId = localStorage.getItem(resumeKey);
      if (savedLectureId) {
        nextLecture = orderedLectures.find(
          (lecture) => String(lecture.lecture_id || lecture.id) === String(savedLectureId)
        );
      }
    }

    if (!nextLecture) {
      nextLecture = orderedLectures.find(
        (lecture) => !completedSet.has(String(lecture.lecture_id || lecture.id))
      );
    }

    if (!nextLecture) {
      nextLecture = orderedLectures[0];
    }

    setPlayerData(nextLecture);
    hasAutoSelectedLectureRef.current = true;
  }, [
    courseData,
    progressFetched,
    progressData,
    getOrderedLectures,
    getResumeStorageKey,
  ]);

  const totalLectures = (courseData?.chapters || []).reduce(
    (count, chapter) => count + (chapter.lectures?.length || 0),
    0
  );
  const courseResources = Array.isArray(courseData?.resources) ? courseData.resources : [];

  const completedLectureIds = new Set(
    (progressData?.lecture_completed || []).map((lectureId) => String(lectureId))
  );

  const completedLectures = (courseData?.chapters || []).reduce(
    (count, chapter) => {
      const chapterCompleted = (chapter.lectures || []).filter((lecture) => {
        const lectureId = String(lecture.lecture_id || lecture.id);
        return completedLectureIds.has(lectureId);
      }).length;
      return count + chapterCompleted;
    },
    0
  );

  const completionPercentage =
    totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

  const isCertificateEligible = totalLectures > 0 && completionPercentage >= 100;

  const handleDownloadCertificate = async () => {
    if (!isCertificateEligible || !courseData || !user) {
      toast.error('Certificate will unlock after 100% completion.');
      return;
    }

    await downloadCourseCertificate({
      courseTitle: courseData.course_title,
      studentName: user.name,
      educatorName: courseData.educator_name || courseData.educator?.name || 'Course Educator',
      completionPercentage,
      logoUrl: assets.logo_dark,
      brandName: 'EDEMY',
    });
  };

  const learningTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'qna', label: 'Q&A' },
    { id: 'notes', label: 'Notes' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'learning-tools', label: 'Learning tools' },
  ];

  const handlePlayerNotesChange = (event) => {
    const value = event.target.value;
    setPlayerNotes(value);
    const storageKey = `player_notes_${courseID}_${user?.id || 'guest'}`;
    localStorage.setItem(storageKey, value);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 sm:w-20 aspect-square border-4 border-gray-300 border-t-4 border-t-blue-400 rounded-full animate-spin"></div>
      </div>
    );
  }


  if (!courseData) {

    return (

      <div className="flex flex-col items-center justify-center h-screen">

        <p className="text-xl text-gray-600">
          Course not found or not enrolled
        </p>

        <button
          onClick={() =>
            navigate('/my-enrollments')
          }
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md"
        >
          Back
        </button>

      </div>
    );
  }


  return (
    <>
      <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-8 md:px-20">
        
        {/* Main Container */}
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          
          {/* RIGHT PLAYER - 2 columns */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              {playerData ? (
                <div>
                  {(() => {
                    const videoId = getYoutubeId(playerData.lecture_url);
                    
                    if (!videoId) {
                      console.error("Invalid YouTube URL:", playerData.lecture_url);
                      return (
                        <div className="w-full aspect-video bg-gray-200 rounded flex items-center justify-center">
                          <div className="text-center text-gray-600">
                            <p className="font-semibold">Invalid video URL</p>
                            <p className="text-sm mt-2">{playerData.lecture_url}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <YouTube
                        videoId={videoId}
                        iframeClassName="w-full aspect-video rounded"
                        onError={(error) => {
                          console.error("YouTube error:", error);
                          toast.error("Error loading video");
                        }}
                      />
                    );
                  })()}

                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {playerData.lecture_title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Duration: {humanizeDuration(playerData.lecture_duration * 60 * 1000, { units: ["h", "m"] })}
                    </p>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          markLectureCompleted(
                            playerData
                          )
                        }
                        className={`px-6 py-2 rounded font-medium transition ${
                          isLectureCompleted(playerData.lecture_id || playerData.id)
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isLectureCompleted(playerData.lecture_id || playerData.id) ? '✓ Completed' : 'Mark Complete'}
                      </button>
                      <button
                        onClick={() => setPlayerData(null)}
                        className="px-6 py-2 rounded font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                      >
                        Close
                      </button>
                      <button
                        onClick={scrollToDoubts}
                        className="px-6 py-2 rounded font-medium bg-slate-800 text-white hover:bg-slate-900 transition"
                      >
                        Ask Doubt
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <img
                    src={
                      courseData.thumbnail_url ||
                      "https://via.placeholder.com/800x450"
                    }
                    alt="thumbnail"
                    className="w-full rounded-lg"
                  />
                  <p className="mt-4 text-gray-600">Select a lecture to start watching</p>
                </div>
              )}
            </div>

            <div className="mt-6 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-2 pb-2">
                {learningTabs.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === 'qna' && (
            <div ref={doubtsSectionRef} className="mt-8">
              <CourseDoubtsPanel
                courseId={courseData.id}
                courseTitle={courseData.course_title}
                backendURL={backendURL}
                token={token}
                mode="student"
                canAsk={true}
              />
            </div>
            )}

            {activeTab === 'announcements' && (
            <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Announcements</h3>

              {isLoadingAnnouncements ? (
                <p className="text-sm text-gray-500">Loading announcements...</p>
              ) : announcements.length === 0 ? (
                <p className="text-sm text-gray-500">No announcements for this course yet.</p>
              ) : (
                <div className="space-y-3">
                  {announcements.slice(0, 5).map((announcement) => (
                    <div key={announcement.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{announcement.title}</p>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{announcement.message}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        {announcement.created_at ? new Date(announcement.created_at).toLocaleString() : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {activeTab === 'learning-tools' && courseResources.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Course Resources</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Reference links, books, and extra media shared by the instructor.
                </p>

                <div className="space-y-3">
                  {courseResources.map((resource, index) => (
                    <div key={`${resource.title || 'resource'}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{resource.title || resource.fileName || resource.file_name || `Resource ${index + 1}`}</p>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                            {(resource.resourceType || resource.resource_type || 'link').toString().replace('_', ' ')}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenResource(resource)}
                          className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                        >
                          Open
                        </button>
                      </div>

                      {!resource.url && (
                        <p className="mt-2 text-xs text-amber-700">
                          No link is available for this resource yet.
                        </p>
                      )}

                      {resource.description && (
                        <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                          {resource.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'learning-tools' && courseResources.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
                <p className="text-sm text-gray-500">No learning resources have been added yet.</p>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">My Notes</h3>
                <p className="text-sm text-gray-500 mb-4">Notes are auto-saved for this course.</p>
                <textarea
                  rows={10}
                  value={playerNotes}
                  onChange={handlePlayerNotesChange}
                  placeholder="Write your notes here..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500"
                />
              </div>
            )}

            {activeTab === 'overview' && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-xl">
              <div className="flex flex-col gap-6 px-6 py-6 text-white md:flex-row md:items-center md:justify-between md:px-8">
                <div className="max-w-xl">
                  <div className="mb-3 flex items-center gap-3">
                    <img src={assets.logo_dark} alt="Edemy" className="h-6 w-auto rounded bg-white px-2 py-1" />
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">PRO CERTIFICATE</span>
                  </div>
                  <h3 className="text-2xl font-bold">Course Completion Certificate</h3>
                  <p className="mt-2 text-sm text-blue-100">
                    Unlock your horizontal Edemy-branded certificate when your course progress reaches 100%.
                  </p>
                  <p className="mt-3 text-sm text-blue-100">
                    Progress: {completedLectures}/{totalLectures} lectures ({completionPercentage}%)
                  </p>
                </div>

                <div className="min-w-[220px] rounded-xl bg-white/10 p-4 backdrop-blur">
                  <button
                    type="button"
                    onClick={handleDownloadCertificate}
                    disabled={!isCertificateEligible}
                    className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isCertificateEligible
                        ? 'bg-emerald-400 text-slate-900 hover:bg-emerald-300'
                        : 'cursor-not-allowed bg-slate-400 text-slate-100'
                    }`}
                  >
                    Download Certificate
                  </button>
                  {!isCertificateEligible && (
                    <p className="mt-2 text-xs text-blue-100">
                      Complete all lectures to unlock.
                    </p>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Rating Section */}
            {activeTab === 'overview' && (
            <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Rate this Course</h3>
              <Rating
                initialRating={initialRating}
                onRate={handleRate}
              />
            </div>
            )}
          </div>

          {/* LEFT COURSE STRUCTURE - 1 column */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-10">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Course Structure
              </h2>

              <div className="space-y-2">
                {courseData.chapters?.map((chapter, index) => (
                  <div
                    key={chapter.id || index}
                    className="border border-gray-300 rounded-lg overflow-hidden"
                  >
                    {/* Chapter Header */}
                    <div
                      onClick={() => toggleSection(index)}
                      className="flex justify-between items-center px-4 py-3 cursor-pointer hover:bg-gray-100 transition bg-gray-50"
                    >
                      <div className="flex gap-2 items-center flex-1">
                        <img
                          src={assets.down_arrow_icon}
                          alt=""
                          className={`w-5 h-5 transition transform ${
                            openSections[index] ? 'rotate-180' : ''
                          }`}
                        />
                        <p className="font-medium text-gray-800 text-sm">
                          {chapter.chapter_title}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 whitespace-nowrap">
                        {chapter.lectures?.length || 0}
                      </p>
                    </div>

                    {/* Lectures List */}
                    {openSections[index] && (
                      <ul className="bg-white border-t border-gray-300">
                        {chapter.lectures?.map((lecture, i) => (
                          <li
                            key={lecture.id || i}
                            className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition"
                          >
                            <div className="px-4 py-3">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <p className="text-sm text-gray-700 font-medium flex-1">
                                  {lecture.lecture_title}
                                </p>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                                  {humanizeDuration(lecture.lecture_duration * 60 * 1000, { units: ["m"] })}
                                </span>
                              </div>

                              <div className="flex gap-2 items-center text-xs">
                                {isLectureCompleted(lecture.lecture_id || lecture.id) && (
                                  <span className="text-green-600 font-semibold">✓ Done</span>
                                )}
                                {lecture.lecture_url && (
                                  <button
                                    onClick={() =>
                                      setPlayerData(lecture)
                                    }
                                    className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                  >
                                    {isLectureCompleted(lecture.lecture_id || lecture.id) ? 'Rewatch' : 'Watch'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-600">
                  Total Duration: <span className="font-semibold text-gray-800">{calculateCourseTime(courseData)}</span>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </>
  );
};

export default Player;