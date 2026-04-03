class CoursesController < ApplicationController
  before_action :authorize_educator!, only: [:create]
  skip_before_action :authenticate_user, only: [:index, :show]

  def index
    courses = Course.includes(:educator, :course_ratings)
                    .where(is_published: true)

    course_data = courses.map do |course|
      course.as_json(include: [:educator, :course_ratings])
            .merge(thumbnail_url: course.thumbnail_url)
    end

    render json: {
      success: true,
      courses: course_data
    }
  end


  def create
    course = Course.new(course_params)
    course.educator_id = current_user.id

    # attach thumbnail
    if params[:thumbnail].present?
      course.thumbnail.attach(params[:thumbnail])
    end

    if course.save
      render json: {
        success: true,
        course: course.as_json.merge(
          thumbnail_url: course.thumbnail_url
        )
      }
    else
      render json: {
        success: false,
        errors: course.errors.full_messages
      }, status: :unprocessable_entity
    end
  end


  def show
    course = Course.includes(
      :educator,
      { chapters: { lectures: {} } },
      :course_ratings,
      :user_courses
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
      thumbnail_url: course.thumbnail_url,
      enrolled_students_count: course.user_courses.count
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


  private

  def course_params
    params.permit(
      :course_title,
      :course_description,
      :course_price,
      :discount,
      :is_published
    )
  end
end