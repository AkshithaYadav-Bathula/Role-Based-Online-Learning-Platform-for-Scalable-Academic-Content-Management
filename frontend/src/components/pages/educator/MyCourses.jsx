import React, { useEffect, useState, useContext } from "react";
import { AppContext } from "../../../context/AppContext";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import axios from "axios";

const MyCourses = () => {
  const { backendURL, token } = useContext(AppContext);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingCourse, setEditingCourse] = useState(null);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [openActionsCourseId, setOpenActionsCourseId] = useState(null);

  const [formData, setFormData] = useState({
    course_title: "",
    course_description: "",
    course_price: "",
    discount: "",
    is_published: true,
    course_content: [],
  });

  const actionButtonBase =
    "px-3 py-2 rounded-lg text-white text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed";

  const fetchEducatorCourses = async () => {
    try {
      const response = await fetch(`${backendURL}/educators/dashboard_data`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch dashboard data");
      }

      setCourses(data.dashboardData.courses || []);
      setError(null);
    } catch (fetchError) {
      setError(fetchError.message);
      toast.error("Failed to fetch courses. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEducatorCourses();
  }, [backendURL, token]);

  const mapCourseContentForEdit = (chapters = []) => {
    return chapters
      .sort((a, b) => Number(a.chapter_order) - Number(b.chapter_order))
      .map((chapter, chapterIndex) => ({
        chapterOrder: Number(chapter.chapter_order) || chapterIndex + 1,
        chapterTitle: chapter.chapter_title || "",
        chapterContent: (chapter.lectures || [])
          .sort((a, b) => Number(a.lecture_order) - Number(b.lecture_order))
          .map((lecture, lectureIndex) => ({
            lectureOrder: Number(lecture.lecture_order) || lectureIndex + 1,
            lectureTitle: lecture.lecture_title || "",
            lectureDuration: Number(lecture.lecture_duration) || 0,
            lectureUrl: lecture.lecture_url || "",
            isPreviewFree: !!lecture.is_preview_free,
          })),
      }));
  };

  const openEditModal = async (courseId) => {
    try {
      setIsLoadingEditData(true);

      const { data } = await axios.get(`${backendURL}/educators/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!data.success) {
        toast.error(data.message || "Unable to load course details");
        return;
      }

      const course = data.course;
      setEditingCourse(course);
      setFormData({
        course_title: course.course_title || "",
        course_description: course.course_description || "",
        course_price: course.course_price || "",
        discount: course.discount || 0,
        is_published: course.is_published ?? true,
        course_content: mapCourseContentForEdit(course.chapters),
      });
    } catch (editError) {
      toast.error(editError.response?.data?.message || "Failed to load course details");
    } finally {
      setIsLoadingEditData(false);
    }
  };

  const closeEditModal = () => {
    setEditingCourse(null);
    setFormData({
      course_title: "",
      course_description: "",
      course_price: "",
      discount: "",
      is_published: true,
      course_content: [],
    });
  };

  const updateChapterField = (chapterIndex, key, value) => {
    setFormData((prev) => {
      const next = [...prev.course_content];
      next[chapterIndex] = { ...next[chapterIndex], [key]: value };
      return { ...prev, course_content: next };
    });
  };

  const addChapter = () => {
    setFormData((prev) => ({
      ...prev,
      course_content: [
        ...prev.course_content,
        {
          chapterOrder: prev.course_content.length + 1,
          chapterTitle: "New Chapter",
          chapterContent: [],
        },
      ],
    }));
  };

  const removeChapter = (chapterIndex) => {
    setFormData((prev) => {
      const next = prev.course_content.filter((_, i) => i !== chapterIndex);
      return {
        ...prev,
        course_content: next.map((chapter, idx) => ({
          ...chapter,
          chapterOrder: idx + 1,
        })),
      };
    });
  };

  const addLecture = (chapterIndex) => {
    setFormData((prev) => {
      const next = [...prev.course_content];
      const chapter = next[chapterIndex];
      const lectures = chapter.chapterContent || [];

      chapter.chapterContent = [
        ...lectures,
        {
          lectureOrder: lectures.length + 1,
          lectureTitle: "New Lecture",
          lectureDuration: 10,
          lectureUrl: "",
          isPreviewFree: false,
        },
      ];

      next[chapterIndex] = chapter;
      return { ...prev, course_content: next };
    });
  };

  const updateLectureField = (chapterIndex, lectureIndex, key, value) => {
    setFormData((prev) => {
      const next = [...prev.course_content];
      const chapter = { ...next[chapterIndex] };
      const lectures = [...(chapter.chapterContent || [])];

      lectures[lectureIndex] = {
        ...lectures[lectureIndex],
        [key]: value,
      };

      chapter.chapterContent = lectures;
      next[chapterIndex] = chapter;

      return { ...prev, course_content: next };
    });
  };

  const removeLecture = (chapterIndex, lectureIndex) => {
    setFormData((prev) => {
      const next = [...prev.course_content];
      const chapter = { ...next[chapterIndex] };
      const lectures = (chapter.chapterContent || []).filter((_, i) => i !== lectureIndex);

      chapter.chapterContent = lectures.map((lecture, idx) => ({
        ...lecture,
        lectureOrder: idx + 1,
      }));

      next[chapterIndex] = chapter;
      return { ...prev, course_content: next };
    });
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;

    if (!formData.course_title.trim()) {
      toast.error("Course title is required");
      return;
    }

    if (!formData.course_content.length) {
      toast.error("At least one chapter is required");
      return;
    }

    try {
      setIsUpdating(true);

      const payload = {
        course_title: formData.course_title,
        course_description: formData.course_description,
        course_price: Number(formData.course_price),
        discount: Number(formData.discount),
        is_published: !!formData.is_published,
        course_content: formData.course_content,
      };

      const { data } = await axios.put(
        `${backendURL}/educators/courses/${editingCourse.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data.success) {
        toast.success("Course updated successfully");
        closeEditModal();
        fetchEducatorCourses();
      } else {
        toast.error(data.message || "Failed to update course");
      }
    } catch (updateError) {
      toast.error(updateError.response?.data?.message || "Error updating course");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    const confirmed = window.confirm("Are you sure you want to delete this course? This cannot be undone.");
    if (!confirmed) return;

    try {
      setIsDeletingId(courseId);

      const { data } = await axios.delete(`${backendURL}/educators/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        toast.success("Course deleted successfully");
        fetchEducatorCourses();
      } else {
        toast.error(data.message || "Failed to delete course");
      }
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.message || "Error deleting course");
    } finally {
      setIsDeletingId(null);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">My Courses</h1>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const enrolledCount = course.enrolled_students_count || 0;

            return (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {course.thumbnail_url ? (
                <img
                  src={course.thumbnail_url}
                  alt={course.course_title}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No thumbnail</span>
                </div>
              )}

              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {course.course_title}
                </h2>

                <p className="text-gray-600 mb-4 line-clamp-3">
                  {course.course_description && typeof course.course_description === "string"
                    ? course.course_description.replace(/<[^>]+>/g, "")
                    : "No description available"}
                </p>

                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-600">₹{course.course_price}</span>
                  <span className="text-sm text-gray-500">{course.discount}% off</span>
                </div>

                <div className="mt-4 flex justify-between items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">
                    {enrolledCount} Enrolled
                  </span>

                  <button
                    onClick={() =>
                      setOpenActionsCourseId((prev) => (prev === course.id ? null : course.id))
                    }
                    className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200"
                  >
                    {openActionsCourseId === course.id ? "Close Actions" : "Actions"}
                  </button>
                </div>

                {openActionsCourseId === course.id && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openEditModal(course.id)}
                        className={`${actionButtonBase} bg-emerald-600 hover:bg-emerald-700`}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={isDeletingId === course.id}
                        className={`${actionButtonBase} bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300`}
                      >
                        {isDeletingId === course.id ? "Deleting..." : "Delete"}
                      </button>

                      <Link
                        to={`/educator/students-enrolled?courseId=${course.id}&courseTitle=${encodeURIComponent(course.course_title)}`}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200"
                      >
                        Students
                      </Link>

                      <Link
                        to={`/course/${course.id}`}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200"
                      >
                        View Course
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )})}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 text-lg mb-4">You haven't created any courses yet.</p>
          <Link
            to="/educator/add-course"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-300"
          >
            Create Your First Course
          </Link>
        </div>
      )}

      {editingCourse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6">
          <form
            onSubmit={handleUpdateCourse}
            className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl p-6 space-y-4"
          >
            <h2 className="text-2xl font-semibold text-gray-800">Update Course</h2>

            {isLoadingEditData ? (
              <div className="text-gray-600">Loading course content...</div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    value={formData.course_title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, course_title: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.course_description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, course_description: e.target.value }))}
                    rows={4}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.course_price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, course_price: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, discount: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                      required
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!formData.is_published}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_published: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Published</span>
                </label>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Course Content</h3>
                    <button
                      type="button"
                      onClick={addChapter}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add Chapter
                    </button>
                  </div>

                  <div className="space-y-4">
                    {formData.course_content.map((chapter, chapterIndex) => (
                      <div key={`chapter-${chapterIndex}`} className="border rounded-lg p-4 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mb-3">
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">Order</label>
                            <input
                              type="number"
                              min="1"
                              value={chapter.chapterOrder}
                              onChange={(e) =>
                                updateChapterField(chapterIndex, "chapterOrder", Number(e.target.value))
                              }
                              className="w-full border rounded px-2 py-1"
                            />
                          </div>

                          <div className="md:col-span-8">
                            <label className="block text-xs text-gray-600 mb-1">Chapter Title</label>
                            <input
                              value={chapter.chapterTitle}
                              onChange={(e) => updateChapterField(chapterIndex, "chapterTitle", e.target.value)}
                              className="w-full border rounded px-2 py-1"
                              required
                            />
                          </div>

                          <div className="md:col-span-2">
                            <button
                              type="button"
                              onClick={() => removeChapter(chapterIndex)}
                              className="w-full px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {(chapter.chapterContent || []).map((lecture, lectureIndex) => (
                            <div
                              key={`lecture-${chapterIndex}-${lectureIndex}`}
                              className="border rounded p-3 bg-white"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                                <div className="md:col-span-1">
                                  <label className="block text-xs text-gray-600 mb-1">#</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={lecture.lectureOrder}
                                    onChange={(e) =>
                                      updateLectureField(
                                        chapterIndex,
                                        lectureIndex,
                                        "lectureOrder",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full border rounded px-2 py-1"
                                  />
                                </div>

                                <div className="md:col-span-3">
                                  <label className="block text-xs text-gray-600 mb-1">Lecture Title</label>
                                  <input
                                    value={lecture.lectureTitle}
                                    onChange={(e) =>
                                      updateLectureField(chapterIndex, lectureIndex, "lectureTitle", e.target.value)
                                    }
                                    className="w-full border rounded px-2 py-1"
                                    required
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-xs text-gray-600 mb-1">Duration (min)</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={lecture.lectureDuration}
                                    onChange={(e) =>
                                      updateLectureField(
                                        chapterIndex,
                                        lectureIndex,
                                        "lectureDuration",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full border rounded px-2 py-1"
                                    required
                                  />
                                </div>

                                <div className="md:col-span-4">
                                  <label className="block text-xs text-gray-600 mb-1">YouTube URL</label>
                                  <input
                                    value={lecture.lectureUrl}
                                    onChange={(e) =>
                                      updateLectureField(chapterIndex, lectureIndex, "lectureUrl", e.target.value)
                                    }
                                    className="w-full border rounded px-2 py-1"
                                    required
                                  />
                                </div>

                                <div className="md:col-span-1 flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!lecture.isPreviewFree}
                                    onChange={(e) =>
                                      updateLectureField(
                                        chapterIndex,
                                        lectureIndex,
                                        "isPreviewFree",
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <span className="text-xs">Free</span>
                                </div>

                                <div className="md:col-span-1">
                                  <button
                                    type="button"
                                    onClick={() => removeLecture(chapterIndex, lectureIndex)}
                                    className="w-full px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                  >
                                    X
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addLecture(chapterIndex)}
                            className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                          >
                            + Add Lecture
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating || isLoadingEditData}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isUpdating ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default MyCourses;
