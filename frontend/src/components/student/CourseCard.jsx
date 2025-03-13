import React, { useContext } from "react";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";
import { Link } from "react-router-dom";

const CourseCard = ({ course }) => {
  const { currency, calculateRating } = useContext(AppContext);

  // Debugging: Log the course object
  console.log("Course object:", course);

  if (!course) {
    return <div>No course data available.</div>;
  }

  return (
    <Link
      to={"/course/" + course.id}
      onClick={() => scrollTo(0, 0)}
      className="border border-gray-500/30 pb-6 overflow-hidden rounded-lg"
    >
      <img
        className="w-full"
        src={course.course_thumbnail || assets.play_icon}
        alt={course.course_title || "Course Thumbnail"}
      />
      <div className="p-3 text-left">
        <h3 className="text-base font-semibold">
          {course.course_title || "No Title"}
        </h3>
        <p className="text-gray-500">{course.educator.name}</p>

        {/* Star Rating Section */}
        <div className="flex items-center space-x-2">
          <p>{calculateRating(course)}</p>
          <div className="flex gap-x-1 items-center">
            {[...Array(5)].map((_, i) => (
              <img
                className="w-4 h-4"
                key={i}
                src={
                  i < Math.floor(calculateRating(course))
                    ? assets.star
                    : assets.star_blank
                }
                alt="star"
              />
            ))}
          </div>
          <p className="text-gray-500">
            ({course.course_ratings ? course.course_ratings.length : 0})
          </p>
        </div>

        <p className="text-base font-semibold text-gray-800">
          {currency}
          {(
            course.course_price -
            (course.discount * course.course_price) / 100
          ).toFixed(2)}
        </p>
      </div>
    </Link>
  );
};

export default CourseCard;