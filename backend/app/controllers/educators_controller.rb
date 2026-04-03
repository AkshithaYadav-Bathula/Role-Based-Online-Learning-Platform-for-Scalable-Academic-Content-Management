class EducatorsController < ApplicationController
  before_action :authenticate_user
  before_action :ensure_educator
  before_action :set_educator_course, only: [
    :course_details,
    :update_course,
    :delete_course,
    :create_announcement,
    :course_announcements,
    :course_doubts,
    :reply_course_doubt
  ]

  def dashboard_data
    courses = Course.where(educator_id: @current_user.id).includes(user_courses: :user)

    enrolled_student_data = User.joins(:user_courses)
                                .where(user_courses: { course_id: courses.select(:id) })
                                .distinct
                                .select(:id, :name, :email)
                                .map { |student| { id: student.id, name: student.name, email: student.email } }

    dashboard_data = {
      totalEarnings: calculate_total_earnings(courses),
      enrolledStudentsCount: enrolled_students_count(courses),
      totalCourses: courses.count,
      courses: courses.map { |course| course_with_thumbnail(course) },
      enrolledStudents: enrolled_student_data
    }

    render json: {
      success: true,
      dashboardData: dashboard_data
    }
  end

  def get_enrolled_students_data
    courses = Course.where(educator_id: @current_user.id)

    enrolled_students = UserCourse.includes(:user, course: { chapters: :lectures })
                                  .where(course_id: courses.select(:id))
                                  .order(enrolled_at: :desc)
                                  .map do |enrollment|
      progress = CourseProgress.find_by(
        user_id: enrollment.user_id,
        course_id: enrollment.course_id
      )

      total_lectures = enrollment.course.chapters.sum { |chapter| chapter.lectures.length }
      completed_lectures = progress&.lecture_completed&.length || 0
      completion_percentage = if total_lectures.positive?
                                ((completed_lectures.to_f / total_lectures) * 100).round
                              else
                                0
                              end

      {
        courseId: enrollment.course.id,
        studentId: enrollment.user.id,
        studentName: enrollment.user.name,
        studentEmail: enrollment.user.email,
        courseTitle: enrollment.course.course_title,
        purchaseDate: enrollment.enrolled_at,
        completedLectures: completed_lectures,
        totalLectures: total_lectures,
        completionPercentage: completion_percentage
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
  rescue ArgumentError => e
    render json: {
      success: false,
      message: e.message
    }, status: :unprocessable_entity
  end

  def course_details
    render json: {
      success: true,
      course: @course.as_json(include: {
        chapters: {
          include: :lectures
        }
      }).merge(thumbnail_url: @course.thumbnail_url)
    }
  end

  def update_course
    ActiveRecord::Base.transaction do
      @course.update!(update_base_params)

      if params[:course_content].present?
        apply_course_content_updates(@course, params[:course_content])
      end
    end

    render json: {
      success: true,
      message: "Course updated successfully",
      course: @course.reload.as_json(include: {
        chapters: {
          include: :lectures
        }
      }).merge(thumbnail_url: @course.thumbnail_url)
    }
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      success: false,
      message: e.record.errors.full_messages.join(', ')
    }, status: :unprocessable_entity
  rescue JSON::ParserError
    render json: {
      success: false,
      message: "Invalid course content format"
    }, status: :unprocessable_entity
  rescue ArgumentError => e
    render json: {
      success: false,
      message: e.message
    }, status: :unprocessable_entity
  rescue StandardError => e
    render json: {
      success: false,
      message: e.message
    }, status: :unprocessable_entity
  end

  def delete_course
    if @course.destroy
      render json: {
        success: true,
        message: "Course deleted successfully"
      }
    else
      render json: {
        success: false,
        message: @course.errors.full_messages.join(', ')
      }, status: :unprocessable_entity
    end
  end

  def course_announcements
    announcements = @course.announcements.includes(:educator).order(created_at: :desc)

    render json: {
      success: true,
      announcements: announcements.map { |announcement| serialize_announcement(announcement) }
    }
  end

  def course_doubts
    doubts = @course.course_doubts.includes(:user, :educator).order(created_at: :asc)

    render json: {
      success: true,
      doubts: doubts.map { |doubt| serialize_course_doubt(doubt) }
    }
  end

  def reply_course_doubt
    doubt = @course.course_doubts.find_by(id: params[:doubt_id])

    if doubt.nil?
      return render json: {
        success: false,
        message: "Doubt not found"
      }, status: :not_found
    end

    reply = params[:reply].to_s.strip
    if reply.blank?
      return render json: {
        success: false,
        message: "Reply cannot be empty"
      }, status: :unprocessable_entity
    end

    doubt.update!(
      reply: reply,
      educator: @current_user,
      replied_at: Time.current
    )

    render json: {
      success: true,
      message: "Reply saved successfully",
      doubt: serialize_course_doubt(doubt.reload)
    }
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      success: false,
      message: e.record.errors.full_messages.join(', ')
    }, status: :unprocessable_entity
  end

  def create_announcement
    title = params[:title].to_s.strip
    message = params[:message].to_s.strip

    if title.blank? || message.blank?
      return render json: {
        success: false,
        message: "Title and message are required"
      }, status: :unprocessable_entity
    end

    announcement = @course.announcements.create!(
      educator: @current_user,
      title: title,
      message: message
    )

    render json: {
      success: true,
      message: "Announcement created successfully",
      announcement: serialize_announcement(announcement)
    }
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      success: false,
      message: e.record.errors.full_messages.join(', ')
    }, status: :unprocessable_entity
  end

  private

  def calculate_total_earnings(courses)
    Purchase.joins(:course)
            .where(courses: { id: courses.select(:id) })
            .where(status: :completed)
            .sum { |purchase| purchase.course.discounted_price }
  end

  def enrolled_students_count(courses)
    User.joins(:user_courses)
        .where(user_courses: { course_id: courses.select(:id) })
        .distinct
        .count
  end

  def course_with_thumbnail(course)
    enrolled_students = course.user_courses.map do |enrollment|
      {
        id: enrollment.user.id,
        name: enrollment.user.name,
        email: enrollment.user.email
      }
    end

    course.as_json.merge(
      'thumbnail_url' => course.thumbnail_url,
      'enrolled_students_count' => enrolled_students.length,
      'enrolled_students' => enrolled_students
    )
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

  def render_course_creation_error(error)
    render json: {
      success: false,
      message: error.message
    }, status: :unprocessable_entity
  end

  def validate_course_data(course_data)
    required_fields = %w[course_title course_description course_content]
    missing_field = required_fields.find { |field| course_data[field].blank? }
    return unless missing_field

    raise ArgumentError, "#{missing_field.humanize} is required"
  end

  def ensure_educator
    unless @current_user && @current_user.role == "educator"
      render json: {
        success: false,
        message: "Forbidden. Educator access only"
      }, status: :forbidden
    end
  end

  def set_educator_course
    @course = Course.find_by(id: params[:id], educator_id: @current_user.id)
    return if @course

    render json: {
      success: false,
      message: "Course not found"
    }, status: :not_found
  end

  def update_course_params
    params.permit(
      :course_title,
      :course_description,
      :course_price,
      :discount,
      :is_published,
      course_content: [
        :chapterOrder,
        :chapterTitle,
        { chapterContent: [
          :lectureOrder,
          :lectureTitle,
          :lectureDuration,
          :lectureUrl,
          :isPreviewFree
        ] }
      ]
    )
  end

  def update_base_params
    update_course_params.except(:course_content)
  end

  def apply_course_content_updates(course, content_payload)
    course_content = normalize_course_content(content_payload)

    if !course_content.is_a?(Array) || course_content.empty?
      raise ArgumentError, "Course content must include at least one chapter"
    end

    course.chapters.destroy_all

    course_content.each_with_index do |chapter_data, chapter_index|
      chapter = course.chapters.create!(
        chapter_order: chapter_data["chapterOrder"] || (chapter_index + 1),
        chapter_title: chapter_data["chapterTitle"]
      )

      lectures = chapter_data["chapterContent"] || []

      lectures.each_with_index do |lecture_data, lecture_index|
        chapter.lectures.create!(
          lecture_title: lecture_data["lectureTitle"],
          lecture_duration: lecture_data["lectureDuration"].to_i,
          lecture_url: lecture_data["lectureUrl"],
          is_preview_free: !!lecture_data["isPreviewFree"],
          lecture_order: lecture_data["lectureOrder"] || (lecture_index + 1)
        )
      end
    end
  end

  def normalize_course_content(content_payload)
    if content_payload.is_a?(String)
      JSON.parse(content_payload)
    else
      content_payload
    end
  end

  def serialize_announcement(announcement)
    {
      id: announcement.id,
      title: announcement.title,
      message: announcement.message,
      created_at: announcement.created_at,
      course_id: announcement.course_id,
      educator_name: announcement.educator&.name
    }
  end
end
