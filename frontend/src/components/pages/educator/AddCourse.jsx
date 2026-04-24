import React, { useEffect, useState, useRef, useContext } from "react";
import { v4 as uuidv4 } from 'uuid';
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { assets } from "../../../assets/assets";
import { AppContext } from "../../../context/AppContext";
import { toast } from "react-toastify";
import axios from "axios";

const AddCourse = () => {
  const { backendURL, token } = useContext(AppContext);
  const quillRef = useRef(null);
  const editorRef = useRef(null);

  const [courseTitle, setCourseTitle] = useState("");
  const [coursePrice, setCoursePrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [image, setImage] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState([]);
  const [uploadingResourceIndex, setUploadingResourceIndex] = useState(null);
  const [lectureDetails, setLectureDetails] = useState({
    lectureTitle: "",
    lectureDuration: "",
    lectureUrl: "",
    isPreviewFree: false,
  });

  const createResource = () => ({
    resourceType: "link",
    title: "",
    url: "",
    description: "",
    blobSignedId: "",
    fileName: "",
    contentType: "",
    fileSize: 0,
  });

  const uploadResourceFile = async (resourceIndex, file) => {
    if (!file) return;

    try {
      setUploadingResourceIndex(resourceIndex);

      const uploadFormData = new FormData();
      uploadFormData.append("resource_file", file);

      const { data } = await axios.post(`${backendURL}/educators/upload_resource_file`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (!data.success) {
        toast.error(data.message || "Failed to upload resource file");
        return;
      }

      setResources((previous) =>
        previous.map((resource, index) => {
          if (index !== resourceIndex) return resource;

          return {
            ...resource,
            url: data.file.url,
            blobSignedId: data.file.blobSignedId || "",
            fileName: data.file.fileName || "",
            contentType: data.file.contentType || "",
            fileSize: Number(data.file.fileSize) || 0,
            resourceType: data.file.resourceType || resource.resourceType,
            title: resource.title.trim() ? resource.title : (data.file.fileName || ""),
          };
        })
      );

      toast.success("Resource file uploaded");
    } catch (uploadError) {
      toast.error(uploadError.response?.data?.message || "Failed to upload resource file");
    } finally {
      setUploadingResourceIndex(null);
    }
  };

  const handleSubmit = async(e) => {
   try{
    e.preventDefault();
    if(!image){
      toast.error("Please upload an image");
      return;
    }

    if(!courseTitle.trim()) {
      toast.error("Course title is required");
      return;
    }

    if(chapters.length === 0) {
      toast.error("Please add at least one chapter");
      return;
    }

    // Validate each chapter has at least one lecture
    const invalidChapter = chapters.find(chapter => chapter.chapterContent.length === 0);
    if (invalidChapter) {
      toast.error(`Chapter "${invalidChapter.chapterTitle}" needs at least one lecture`);
      return;
    }

    setIsLoading(true);

    const courseData = {
      course_title: courseTitle,
      course_description: quillRef.current.root.innerHTML,
      course_price: Number(coursePrice),
      discount: Number(discount),
      resources: resources.filter((resource) =>
        resource.title.trim() || resource.url.trim() || resource.description.trim() || resource.fileName.trim() || resource.blobSignedId.trim()
      ),
      course_content: chapters,
    }
    
    const formData = new FormData();
    formData.append("course_data", JSON.stringify(courseData));
    formData.append("course_thumbnail", image);
                    
    // Updated to match your Rails route
    const response = await axios.post(`${backendURL}/educators/add_course`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = response.data;

    if(data.success){
      toast.success("Course added successfully");
      setCourseTitle("");
      setCoursePrice(0);
      setDiscount(0);
      setImage(null);
      quillRef.current.root.innerHTML = "";
      setChapters([]);
      setResources([]);
      setShowPopup(false);                     
    }
    else{
      toast.error(data.message || "Course not added");
    }
   }
   catch(error){
     console.error("Error adding course:", error);
     toast.error(error.response?.data?.message || "Something went wrong");
   }
   finally {
     setIsLoading(false);
   }
  };

  const addResource = () => {
    setResources((previous) => [...previous, createResource()]);
  };

  const updateResourceField = (resourceIndex, key, value) => {
    setResources((previous) =>
      previous.map((resource, index) =>
        index === resourceIndex ? { ...resource, [key]: value } : resource
      )
    );
  };

  const removeResource = (resourceIndex) => {
    setResources((previous) => previous.filter((_, index) => index !== resourceIndex));
  };

  const handleChapter = (action, chapterId) => {
    if (action === 'add') {
      const title = prompt('Enter Chapter Name:');
      if (title) {
        const newChapter = {
          chapterId: uuidv4(),
          chapterTitle: title,
          chapterContent: [],
          collapsed: false,
          chapterOrder: chapters.length > 0 ? chapters[chapters.length - 1].chapterOrder + 1 : 1,
        };
        setChapters([...chapters, newChapter]);
      }
    } else if (action === 'remove') {
      setChapters(chapters.filter((chapter) => chapter.chapterId !== chapterId));
    } else if (action === 'toggle') {
      setChapters(
        chapters.map((chapter) =>
          chapter.chapterId === chapterId 
            ? { ...chapter, collapsed: !chapter.collapsed } 
            : chapter
        )
      );
    }
  };

  const handleLecture = (action, chapterId, lectureIndex) => {
    if (action === 'add') {
      setCurrentChapterId(chapterId);
      setShowPopup(true);
    } else if (action === 'remove') {
      setChapters(
        chapters.map((chapter) => {
          if (chapter.chapterId === chapterId) {
            const newContent = [...chapter.chapterContent];
            newContent.splice(lectureIndex, 1);
            return { ...chapter, chapterContent: newContent };
          }
          return chapter;
        })
      );
    }
  };

  const addLecture = () => {
    // Validate lecture inputs
    if (!lectureDetails.lectureTitle.trim()) {
      toast.error("Lecture title is required");
      return;
    }
    
    if (!lectureDetails.lectureDuration) {
      toast.error("Lecture duration is required");
      return;
    }
    
    if (!lectureDetails.lectureUrl.trim()) {
      toast.error("Lecture URL is required");
      return;
    }

    setChapters(
      chapters.map((chapter) => {
        if (chapter.chapterId === currentChapterId) {
          const newLecture = {
            ...lectureDetails,
            lectureDuration: Number(lectureDetails.lectureDuration),
            lectureOrder: chapter.chapterContent.length > 0 
              ? chapter.chapterContent[chapter.chapterContent.length - 1].lectureOrder + 1 
              : 1,
            lectureId: uuidv4()
          };
          return {
            ...chapter,
            chapterContent: [...chapter.chapterContent, newLecture]
          };
        }
        return chapter;
      })
    );

    setShowPopup(false);
    setLectureDetails({
      lectureTitle: "",
      lectureDuration: "",
      lectureUrl: "",
      isPreviewFree: false,
    });
  };

  useEffect(() => {
    if (!quillRef.current && editorRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder: "Describe your course...",
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['link', 'image'],
            ['clean']
          ]
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex justify-center items-start p-6 bg-white">
      <div className="w-full max-w-3xl bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Add New Course
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Course Title */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-700 font-medium">Course Title</label>
            <input
              onChange={(e) => setCourseTitle(e.target.value)}
              value={courseTitle}
              type="text"
              placeholder="Enter course title"
              className="outline-none py-2 px-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Course Description */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-700 font-medium">Course Description</label>
            <div
              ref={editorRef}
              className="border border-gray-300 rounded min-h-[150px] p-2"
            ></div>
          </div>

          <div className="flex items-center justify-between flex-wrap">
            <div className="flex flex-col gap-1">
              <p>Course Price</p>
              <input
                onChange={(e) => setCoursePrice(e.target.value)}
                value={coursePrice}
                type="number"
                placeholder="0"
                min="0"
                className="outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-300"
                required
              />
            </div>

            <div className="flex md:flex-row flex-col items-center gap-3">
              <p>Course Thumbnail</p>
              <label htmlFor="thumbnailImage" className="flex items-center gap-3">
                <img
                  src={assets.file_upload_icon}
                  alt=""
                  className="p-3 bg-blue-500 rounded"
                />
                <input
                  id="thumbnailImage"
                  onChange={(e) => setImage(e.target.files[0])}
                  type="file"
                  accept="image/*"
                  className="hidden"
                />
                {image && (
                  <img
                    className="max-h-10"
                    src={URL.createObjectURL(image)}
                    alt=""
                  />
                )}
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <p>Discount %</p>
            <input
              onChange={(e) => setDiscount(e.target.value)}
              value={discount}
              type="number"
              placeholder="0"
              min={0}
              max={100}
              className="outline-none md:py-2.5 w-28 px-3 rounded border border-gray-300"
              required
            />
          </div>

          {/* Supplemental Resources */}
          <div className="border rounded-lg p-4 bg-slate-50 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Course Resources</h3>
                <p className="text-sm text-gray-500">
                  Share textbooks, reference links, downloadable files, or extra videos with your learners.
                </p>
              </div>
              <button
                type="button"
                onClick={addResource}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Resource
              </button>
            </div>

            {resources.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                No resources added yet. Add a few links or references to make the course richer.
              </div>
            ) : (
              <div className="space-y-3">
                {resources.map((resource, resourceIndex) => (
                  <div key={`resource-${resourceIndex}`} className="rounded-lg border bg-white p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                          <select
                            value={resource.resourceType}
                            onChange={(e) => updateResourceField(resourceIndex, "resourceType", e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="link">Link</option>
                            <option value="textbook">Textbook</option>
                            <option value="video">Video</option>
                            <option value="file">File</option>
                            <option value="image">Image</option>
                          </select>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                          <input
                            value={resource.title}
                            onChange={(e) => updateResourceField(resourceIndex, "title", e.target.value)}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                            placeholder="e.g. Chapter 1 notes"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeResource(resourceIndex)}
                        className="rounded bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Resource URL</label>
                        <input
                          value={resource.url}
                          onChange={(e) => updateResourceField(resourceIndex, "url", e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          placeholder="https://..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <input
                          value={resource.description}
                          onChange={(e) => updateResourceField(resourceIndex, "description", e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Optional notes about this resource"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Upload File</label>
                        <input
                          type="file"
                          onChange={(e) => uploadResourceFile(resourceIndex, e.target.files?.[0])}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="text-xs text-gray-600 flex flex-col justify-center">
                        {uploadingResourceIndex === resourceIndex ? (
                          <span className="text-blue-600">Uploading file...</span>
                        ) : resource.fileName ? (
                          <span>Uploaded: {resource.fileName}</span>
                        ) : (
                          <span>Upload is optional. If uploaded, URL is auto-filled.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chapters and Lectures */}
          <div>
            {chapters.map((chapter, chapterIndex) => (
              <div key={chapter.chapterId} className="bg-white border rounded-lg mb-4">
                <div className="flex justify-between items-center p-4 border-b">
                  <div className="flex items-center">
                    <img
                      src={assets.dropdown_icon}
                      width={14}
                      alt=""
                      onClick={() => handleChapter("toggle", chapter.chapterId)}
                      className={`mr-2 cursor-pointer transition-all ${
                        chapter.collapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <span className="font-semibold">
                      {chapterIndex + 1}. {chapter.chapterTitle}
                    </span>
                  </div>

                  <span>{chapter.chapterContent.length} Lectures</span>

                  <img
                    src={assets.cross_icon}
                    alt=""
                    onClick={() => handleChapter("remove", chapter.chapterId)}
                    className="cursor-pointer"
                  />
                </div>

                {!chapter.collapsed && (
                  <div className="p-4">
                    {chapter.chapterContent.map((lecture, lectureIndex) => (
                      <div
                        key={lecture.lectureId}
                        className="flex justify-between items-center mb-2 border-b pb-2"
                      >
                        <span>
                          {lectureIndex + 1}. {lecture.lectureTitle} - {lecture.lectureDuration} mins
                          - <a href={lecture.lectureUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                            Link
                          </a>
                          - {lecture.isPreviewFree ? "Free Preview" : "Paid"}
                        </span>
                        <img
                          src={assets.cross_icon}
                          alt=""
                          onClick={() => handleLecture("remove", chapter.chapterId, lectureIndex)}
                          className="cursor-pointer"
                        />
                      </div>
                    ))}
                    <div
                      className="inline-flex bg-gray-200 p-2 rounded cursor-pointer mt-2 hover:bg-gray-300"
                      onClick={() => handleLecture("add", chapter.chapterId)}
                    >
                      + Add Lecture
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div
              className="flex justify-center items-center bg-blue-400 p-2 rounded-lg cursor-pointer hover:bg-blue-500 text-white"
              onClick={() => handleChapter("add")}
            >
              + Add Chapter
            </div>
          </div>

          {showPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="bg-white text-gray-700 p-4 rounded relative w-full border border-gray-200 max-w-md">
                <h2 className="text-lg font-semibold mb-4 text-center">Add Lecture</h2>

                <div className="mb-4">
                  <p>Lecture Title</p>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureTitle}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureTitle: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-4">
                  <p>Duration (minutes)</p>
                  <input
                    type="number"
                    min="1"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureDuration}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureDuration: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="mb-4">
                  <p>Lecture URL</p>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded py-1 px-2"
                    value={lectureDetails.lectureUrl}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        lectureUrl: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex gap-2 mb-4">
                  <p>Is Preview Free?</p>
                  <input
                    type="checkbox"
                    className="mt-1 scale-125"
                    checked={lectureDetails.isPreviewFree}
                    onChange={(e) =>
                      setLectureDetails({
                        ...lectureDetails,
                        isPreviewFree: e.target.checked,
                      })
                    }
                  />
                </div>

                <button
                  onClick={addLecture}
                  type="button"
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add
                </button>

                <img
                  onClick={() => setShowPopup(false)}
                  src={assets.cross_icon}
                  className="absolute top-4 right-4 w-4 cursor-pointer"
                  alt=""
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`${isLoading ? 'bg-gray-500' : 'bg-black hover:bg-gray-800'} text-white w-max py-2.5 px-8 rounded my-4 flex items-center`}
          >
            {isLoading ? 'Adding Course...' : 'Add Course'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddCourse;