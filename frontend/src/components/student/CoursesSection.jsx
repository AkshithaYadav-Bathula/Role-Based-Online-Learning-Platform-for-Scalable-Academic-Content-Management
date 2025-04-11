import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import CourseCard from './CourseCard';

const CoursesSection = () => {
  const { allCourses } = useContext(AppContext);
  console.log("All courses:", allCourses);

  return (
    <div className="py-16 px-6 md:px-8 lg:px-16 xl:px-40">
     <h2 className="text-2xl md:text-3xl font-medium text-gray-800 text-center">
  Learn from the best
</h2>
<p className="text-sm md:text-base text-gray-500 mt-3 max-w-3xl mx-auto text-center">
  Discover our top-rated courses across various categories. From coding and design to 
  business and wellness, our courses are crafted to deliver results.
</p>


      <div className="pl-15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 my-10 md:my-16">
        {allCourses && allCourses.length > 0 ? (
          allCourses.slice(0, 4).map((course, index) => (
            <CourseCard key={course._id || index} course={course} />
          ))
        ) : (
          <p>No courses available at the moment.</p>
        )}
      </div>

      <div className="flex justify-center mt-6 md:mt-10">
        <Link
          to="/course-list"
          onClick={() => window.scrollTo(0, 0)}
          className="bg-blue-600 p-3 text-white rounded"
        >
          Show All Courses
        </Link>
      </div>
    </div>
  );
};

export default CoursesSection;
