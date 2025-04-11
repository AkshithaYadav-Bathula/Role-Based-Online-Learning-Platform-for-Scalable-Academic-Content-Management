import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppContext } from "../../../context/AppContext";
import CourseCard from "../../student/CourseCard";
import Footer from "../../student/Footer";
import SearchBar from "../../student/SearchBar";

const CoursesList = () => {
  const { allCourses } = useContext(AppContext);
  const { input } = useParams();
  const [filteredCourses, setFilteredCourses] = useState([]);

  useEffect(() => {
    if (allCourses && allCourses.length > 0) {
      if (input) {
        const filtered = allCourses.filter((course) =>
          course.courseTitle.toLowerCase().includes(input.toLowerCase())
        );
        setFilteredCourses(filtered);
      } else {
        setFilteredCourses(allCourses);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <div className="container mx-auto px-20 py-10 flex-grow">
        <div className="flex flex-col space-y-10">
          {/* Breadcrumb */}
          <div className="flex items-center text-sm text-gray-600">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 transition duration-300"
            >
              Home
            </a>
            <span className="mx-2">/</span>
            <span className="text-gray-500">Course List</span>
          </div>

          {/* Title and Search Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h1 className="text-3xl font-bold text-gray-900">Course List</h1>
            <div className="w-full md:w-96">
              <SearchBar />
            </div>
          </div>

          {/* Search Result Info (if searching) */}
          {input && (
            <div className="flex items-center justify-between bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <p className="text-gray-700 text-lg">Search results for: "{input}"</p>
              <button
                onClick={() => (window.location.href = "/course-list")}
                className="text-blue-600 hover:text-blue-800 transition duration-300"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Course Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredCourses.map((course, index) => (
              <CourseCard key={index} course={course} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default CoursesList;
