class EducatorsController < ApplicationController
  before_action :authenticate_user
  before_action :ensure_educator

  def dashboard_data
    courses = Course.where(educator_id: @current_user.id)
    
    # Get all enrolled students across the educator's courses
    enrolled_student_data = User.joins(:user_courses)
                               .where(user_courses: { course_id: courses.select(:id) })
                               .distinct
                               .select(:id, :name, :email)
                               .map { |student| { id: student.id, name: student.name, email: student.email } }
    
    dashboard_data = {
      totalEarnings: calculate_total_earnings(courses),
      enrolledStudents: enrolled_students_count(courses),
      totalCourses: courses.count,
      courses: courses.map { |c| course_with_thumbnail(c) },
      enrolledStudents: enrolled_student_data  # New field with student details
    }
  
    render json: { 
      success: true, 
      dashboardData: dashboard_data 
    }
  end

  def get_enrolled_students_data
    courses = Course.where(educator_id: @current_user.id)
  
    enrolled_students = UserCourse.includes(:course, :user)
                                  .where(course_id: courses.select(:id))
                                  .order(enrolled_at: :desc)
                                  .map do |enrollment|
      {
        student: enrollment.user.id,
        courseTitle: enrollment.course.course_title,
        purchaseDate: enrollment.enrolled_at
      }
    end
  
    render json: {
      success: true,
      enrolledStudents: enrolled_students
    }
  end
  

  def add_course
    course_data = JSON.parse(params[:course_data])
    validate_course_data(course_data)
    
    ActiveRecord::Base.transaction do
      course = create_course_with_content(course_data)
      render_course_creation_success(course)
    end
  rescue ActiveRecord::RecordInvalid => e
    render_course_creation_error(e)
  end

  private

  # app/controllers/educators_controller.rb
  def calculate_total_earnings(courses)
    Purchase.joins(:course)
            .where(courses: { id: courses.select(:id) })
            .where(status: :completed)  # Changed from .completed to .where(status: :completed)
            .sum { |p| p.course.discounted_price }
  end

  def enrolled_students_count(courses)
    User.joins(:user_courses)
        .where(user_courses: { course_id: courses.select(:id) })
        .distinct
        .count
  end

  def course_with_thumbnail(course)
    course.as_json.merge('thumbnail_url' => course.thumbnail_url)
  end

  def create_course_with_content(course_data)
    course = Course.create!(
      course_title: course_data['course_title'],
      course_description: course_data['course_description'],
      course_price: course_data['course_price'],
      discount: course_data['discount'],
      educator_id: @current_user.id,
      is_published: true,
      thumbnail: params[:course_thumbnail]
    )

    course_data['course_content'].each do |chapter_data|
      create_chapter_with_lectures(course, chapter_data)
    end

    course
  end

  def create_chapter_with_lectures(course, chapter_data)
    chapter = course.chapters.create!(
      chapter_order: chapter_data['chapterOrder'],
      chapter_title: chapter_data['chapterTitle']
    )

    chapter_data['chapterContent'].each do |lecture_data|
      chapter.lectures.create!(
        lecture_title: lecture_data['lectureTitle'],
        lecture_duration: lecture_data['lectureDuration'].to_i,
        lecture_url: lecture_data['lectureUrl'],
        is_preview_free: lecture_data['isPreviewFree'],
        lecture_order: lecture_data['lectureOrder']
      )
    end
  end

  def render_course_creation_success(course)
    render json: {
      success: true,
      message: "Course added successfully",
      course_id: course.id,
      course: course.as_json(include: { 
        chapters: { 
          include: :lectures 
        } 
      }).merge(thumbnail_url: course.thumbnail_url)
    }
  end

  

  def validate_course_data(course_data)
    required_fields = %w[course_title course_description course_content]
    missing_field = required_fields.find { |field| course_data[field].blank? }
    return unless missing_field

    raise ArgumentError, "#{missing_field.humanize} is required"
  end

 

  # educators_controller.rb
  private

  def ensure_educator
    unless @current_user && @current_user.role == "educator"
      render json: { 
        success: false, 
        message: "Forbidden. Educator access only" 
      }, status: :forbidden
    end
  end
end