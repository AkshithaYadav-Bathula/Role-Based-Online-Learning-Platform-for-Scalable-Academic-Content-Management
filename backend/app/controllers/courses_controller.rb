class CoursesController < ApplicationController
  skip_before_action :authenticate_user, only: [:index, :show]

  def index
    courses = Course.includes(:educator, :course_ratings)
                   .where(is_published: true)

    course_data = courses.map do |course|
      course.as_json(include: [:educator, :course_ratings])
            .merge('thumbnail_url' => course.thumbnail_url)
    end

    render json: { 
      success: true, 
      courses: course_data 
    }
  end

  def show
    course = Course.includes(
      :educator,
      { chapters: { lectures: {} } },
      :course_ratings,
      :user_courses  # Include user_courses to avoid N+1 queries
    ).find(params[:id])
  
    course_data = course.as_json(
      include: {
        educator: {},
        chapters: { 
          include: { 
            lectures: {} 
          } 
        },
        course_ratings: {}
      }
    ).merge(
      'thumbnail_url' => course.thumbnail_url,
      'enrolled_students_count' => course.user_courses.count  # Add enrollment count
    )
  
    course_data["chapters"].each do |chapter|
      chapter["lectures"].each do |lecture|
        lecture["lecture_url"] = "" unless lecture["is_preview_free"]
      end
    end
  
    render json: { 
      success: true, 
      course: course_data 
    }
  end
end