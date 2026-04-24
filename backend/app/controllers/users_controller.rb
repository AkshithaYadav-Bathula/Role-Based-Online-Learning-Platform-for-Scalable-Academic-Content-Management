class UsersController < ApplicationController
  skip_before_action :authenticate_user, only: [:verify_payment]

  before_action :configure_stripe, only: [
    :create_payment_intent,
    :complete_course_purchase,
    :purchase_course,
    :verify_payment
  ]

  def get_user_data
    ensure_streak_missed_notification!

    render json: { success: true, user: current_user }
  end

  def get_enrolled_courses
    enrolled_courses = current_user.enrolled_courses.includes(
      :chapters,
      :course_ratings
    ).map do |course|
      course.as_json(include: {
        chapters: {
          include: :lectures
        },
        course_ratings: {}
      }).merge(thumbnail_url: course.thumbnail_url)
    end

    render json: {
      success: true,
      user_enrolled_courses: enrolled_courses
    }
  end

  def get_announcements
    course_ids = current_user.enrolled_courses.select(:id)
    announcements = Announcement.includes(:course, :educator)
                                .where(course_id: course_ids)
                                .order(created_at: :desc)

    render json: {
      success: true,
      announcements: announcements.map do |announcement|
        {
          id: announcement.id,
          title: announcement.title,
          message: announcement.message,
          created_at: announcement.created_at,
          course_id: announcement.course_id,
          course_title: announcement.course&.course_title,
          educator_name: announcement.educator&.name
        }
      end
    }
  end

  def course_doubts
    course = Course.find_by(id: params[:course_id])

    if course.nil?
      return render json: {
        success: false,
        message: "Course not found"
      }, status: :not_found
    end

    is_enrolled = current_user.enrolled_courses.exists?(id: course.id)
    is_course_educator = course.educator_id == current_user.id

    unless is_enrolled || is_course_educator
      return render json: {
        success: false,
        message: "Only enrolled students or the course educator can view doubts"
      }, status: :forbidden
    end

    doubts = course.course_doubts.includes(:user, :educator, :course_doubt_votes).order(created_at: :asc)

    render json: {
      success: true,
      doubts: doubts.map { |doubt| serialize_course_doubt(doubt, current_user) }
    }
  end

  def create_course_doubt
    course = Course.find_by(id: params[:course_id])
    question = params[:question].to_s.strip

    if course.nil?
      return render json: {
        success: false,
        message: "Course not found"
      }, status: :not_found
    end

    unless current_user.enrolled_courses.exists?(id: course.id)
      return render json: {
        success: false,
        message: "You must be enrolled in this course to ask a doubt"
      }, status: :forbidden
    end

    if question.blank?
      return render json: {
        success: false,
        message: "Question cannot be empty"
      }, status: :unprocessable_entity
    end

    doubt = course.course_doubts.create!(
      user: current_user,
      question: question
    )

    if course.educator_id.present? && course.educator_id != current_user.id
      Notification.create!(
        user_id: course.educator_id,
        actor_id: current_user.id,
        course_id: course.id,
        course_doubt_id: doubt.id,
        kind: "new_doubt",
        title: "New doubt in #{course.course_title}",
        message: "#{current_user.name} asked a new doubt in your course."
      )
    end

    render json: {
      success: true,
      message: "Doubt posted successfully",
      doubt: serialize_course_doubt(doubt, current_user)
    }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      success: false,
      message: e.record.errors.full_messages.join(', ')
    }, status: :unprocessable_entity
  end

  def toggle_course_doubt_upvote
    doubt = CourseDoubt.includes(:course, :course_doubt_votes).find_by(id: params[:id])

    if doubt.nil?
      return render json: {
        success: false,
        message: "Doubt not found"
      }, status: :not_found
    end

    course = doubt.course
    is_enrolled = current_user.enrolled_courses.exists?(id: course.id)
    is_course_educator = course.educator_id == current_user.id

    unless is_enrolled || is_course_educator
      return render json: {
        success: false,
        message: "You are not allowed to upvote this doubt"
      }, status: :forbidden
    end

    existing_vote = current_user.course_doubt_votes.find_by(course_doubt_id: doubt.id)

    if existing_vote
      existing_vote.destroy!
      upvoted = false
    else
      current_user.course_doubt_votes.create!(course_doubt: doubt)
      upvoted = true
    end

    render json: {
      success: true,
      upvoted: upvoted,
      upvotes_count: doubt.course_doubt_votes.reload.count
    }
  rescue ActiveRecord::RecordInvalid => e
    render json: {
      success: false,
      message: e.record.errors.full_messages.join(', ')
    }, status: :unprocessable_entity
  end

  def notifications
    ensure_streak_missed_notification!

    notifications = current_user.notifications.includes(:actor, :course)
                                .order(created_at: :desc)
                                .limit(25)

    render json: {
      success: true,
      unread_count: current_user.notifications.unread.count,
      notifications: notifications.map { |notification| serialize_notification(notification) }
    }
  end

  def mark_notification_read
    notification = current_user.notifications.find_by(id: params[:id])

    if notification.nil?
      return render json: {
        success: false,
        message: "Notification not found"
      }, status: :not_found
    end

    notification.update!(read_at: Time.current) if notification.read_at.nil?

    render json: {
      success: true,
      unread_count: current_user.notifications.unread.count,
      notification: serialize_notification(notification)
    }
  end

  def mark_all_notifications_read
    current_user.notifications.unread.update_all(read_at: Time.current)

    render json: {
      success: true,
      unread_count: 0
    }
  end

  # Create a payment intent for the course purchase
  def create_payment_intent
    return render json: { success: false, message: "User not authenticated" }, status: :unauthorized if current_user.nil?
    return stripe_not_configured if Stripe.api_key.blank?

    course = Course.find(params[:course_id])
    amount = (course.course_price - (course.discount * course.course_price / 100)).round(2)
    amount_in_cents = (amount * 100).to_i

    payment_intent = Stripe::PaymentIntent.create(
      amount: amount_in_cents,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never"
      },
      metadata: {
        user_id: current_user.id,
        course_id: course.id
      }
    )

    Purchase.create!(
      user: current_user,
      course: course,
      amount: amount,
      status: "pending",
      payment_intent_id: payment_intent.id
    )

    render json: {
      success: true,
      clientSecret: payment_intent.client_secret,
      course: course.as_json(only: [:id, :course_title]),
      amount: amount
    }
  rescue Stripe::StripeError => e
    render json: {
      success: false,
      message: "Payment error: #{e.message}"
    }, status: :unprocessable_entity
  rescue StandardError => e
    render json: {
      success: false,
      message: "An error occurred: #{e.message}"
    }, status: :internal_server_error
  end

  # Complete the course purchase after payment intent is confirmed on the client
  def complete_course_purchase
    payment_intent_id = params[:payment_intent_id]
    course_id = params[:course_id]

    if payment_intent_id.blank? || course_id.blank?
      return render json: {
        success: false,
        message: "Missing required parameters"
      }, status: :bad_request
    end

    return stripe_not_configured if Stripe.api_key.blank?

    course = Course.find_by(id: course_id)
    if course.nil?
      return render json: {
        success: false,
        message: "Course not found"
      }, status: :not_found
    end

    payment_intent = Stripe::PaymentIntent.retrieve(payment_intent_id)

    if payment_intent.metadata["user_id"].to_s != current_user.id.to_s ||
       payment_intent.metadata["course_id"].to_s != course.id.to_s
      return render json: {
        success: false,
        message: "Payment does not match this user/course"
      }, status: :unprocessable_entity
    end

    if payment_intent.status != "succeeded"
      return render json: {
        success: false,
        message: "Payment not completed"
      }, status: :payment_required
    end

    purchase = Purchase.find_by(
      payment_intent_id: payment_intent_id,
      user: current_user,
      course: course
    )

    if purchase.nil?
      return render json: {
        success: false,
        message: "Purchase record not found"
      }, status: :not_found
    end

    purchase.update!(status: "completed")

    unless UserCourse.exists?(user: current_user, course: course)
      UserCourse.create!(user: current_user, course: course)
    end

    render json: {
      success: true,
      message: "Course enrolled successfully"
    }
  rescue Stripe::StripeError => e
    render json: {
      success: false,
      message: "Payment error: #{e.message}"
    }, status: :unprocessable_entity
  rescue StandardError => e
    render json: {
      success: false,
      message: "An error occurred: #{e.message}"
    }, status: :internal_server_error
  end

  def purchase_course
    course = Course.find(params[:course_id])
    amount = (course.course_price - (course.discount * course.course_price / 100)).round(2)

    purchase = Purchase.create!(
      user: current_user,
      course: course,
      amount: amount,
      status: "pending"
    )

    return stripe_not_configured if Stripe.api_key.blank?

    session = Stripe::Checkout::Session.create(
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: course.course_title
          },
          unit_amount: (purchase.amount * 100).to_i
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: "#{ENV['FRONTEND_URL'] || request.base_url}/success?session_id={CHECKOUT_SESSION_ID}&course_id=#{course.id}",
      cancel_url: "#{ENV['FRONTEND_URL'] || request.base_url}/cancel",
      client_reference_id: purchase.id
    )

    render json: { success: true, checkout_url: session.url }
  rescue Stripe::StripeError => e
    render json: { success: false, message: e.message }, status: :unprocessable_entity
  rescue StandardError => e
    render json: { success: false, message: e.message }, status: :internal_server_error
  end

  def verify_payment
    session_id = params[:session_id]
    course_id = params[:course_id]
    user_token = request.headers["Authorization"]&.split(" ")&.last

    if session_id.blank? || course_id.blank?
      return render json: { success: false, message: "Session ID and Course ID are required" }, status: :bad_request
    end

    if user_token.blank?
      return render json: { success: false, message: "Token missing" }, status: :unauthorized
    end

    return stripe_not_configured if Stripe.api_key.blank?

    decoded_token = JWT.decode(user_token, jwt_secret, true, algorithm: "HS256")
    user_id = decoded_token[0]["user_id"]
    user = User.find(user_id)

    session = Stripe::Checkout::Session.retrieve(session_id)

    if session.payment_status != "paid"
      return render json: { success: false, message: "Payment not completed" }, status: :payment_required
    end

    purchase = Purchase.find_by(id: session.client_reference_id)
    if purchase.blank?
      return render json: { success: false, message: "Invalid purchase reference" }, status: :bad_request
    end

    course = Course.find(course_id)

    unless UserCourse.exists?(user: user, course: course)
      UserCourse.create!(user: user, course: course)
    end

    purchase.update!(status: "completed")

    render json: {
      success: true,
      message: "Payment verified, course enrolled, and payment status updated successfully"
    }
  rescue JWT::DecodeError
    render json: { success: false, message: "Invalid token" }, status: :unauthorized
  rescue Stripe::StripeError => e
    render json: { success: false, message: e.message }, status: :internal_server_error
  rescue StandardError => e
    render json: { success: false, message: e.message }, status: :internal_server_error
  end

  def update_course_progress
    lecture_id = params[:lecture_id]
    course_id = params[:course_id]

    if lecture_id.blank? || course_id.blank?
      return render json: { error: "Missing required fields" }, status: :bad_request
    end

    progress = CourseProgress.find_or_initialize_by(
      user_id: current_user.id,
      course_id: course_id
    )

    progress.lecture_completed ||= []

    unless progress.lecture_completed.include?(lecture_id)
      progress.lecture_completed << lecture_id
      progress.save
    end

    register_learning_activity!

    render json: {
      success: true,
      message: "Lecture marked as completed successfully"
    }
  end

  def get_course_progress
    course_id = params[:course_id]

    if course_id.blank?
      return render json: { error: "Course ID is required" }, status: :bad_request
    end

    progress_data = CourseProgress.find_or_initialize_by(
      user_id: current_user.id,
      course_id: course_id
    )

    progress_data.lecture_completed ||= []
    register_learning_activity!

    render json: {
      success: true,
      progressData: progress_data
    }
  end

  def add_rating
    course_id = params[:course_id]
    rating = params[:rating].to_i

    if course_id.blank? || rating == 0
      return render json: { error: "Missing required fields" }, status: :bad_request
    end

    if rating < 1 || rating > 5
      return render json: { error: "Invalid rating value (must be 1-5)" }, status: :bad_request
    end

    course = Course.find_by(id: course_id)
    if course.nil?
      return render json: { error: "Course not found" }, status: :not_found
    end

    enrollment = UserCourse.find_by(user_id: current_user.id, course_id: course_id)
    if enrollment.nil?
      return render json: { error: "You are not enrolled in this course" }, status: :forbidden
    end

    course_rating = CourseRating.find_or_initialize_by(
      user_id: current_user.id,
      course_id: course_id
    )
    course_rating.rating = rating
    course_rating.save

    render json: {
      success: true,
      message: "Rating added successfully"
    }
  end

  def update_role
    if current_user.update(role: "educator")
      render json: {
        success: true,
        message: "Role updated successfully"
      }
    else
      render json: {
        success: false,
        message: "Failed to update role"
      }, status: :unprocessable_entity
    end
  end

  private

  def register_learning_activity!
    today = Time.zone.today
    last_learning_on = current_user.last_learning_on

    if last_learning_on == today
      return
    end

    new_streak =
      if last_learning_on == today - 1
        current_user.learning_streak.to_i + 1
      else
        1
      end

    current_user.update!(
      learning_streak: new_streak,
      last_learning_on: today,
      streak_missed_notified_on: nil
    )
  end

  def ensure_streak_missed_notification!
    today = Time.zone.today
    last_learning_on = current_user.last_learning_on

    return if last_learning_on.nil?
    return if last_learning_on >= today - 1
    return if current_user.streak_missed_notified_on == today

    Notification.create!(
      user_id: current_user.id,
      kind: "streak_missed",
      title: "You missed your learning streak yesterday",
      message: "Come back today to restart your streak and keep learning momentum."
    )

    current_user.update_column(:streak_missed_notified_on, today)
  end

  def configure_stripe
    Stripe.api_key = ENV["STRIPE_SECRET_KEY"]
  end

  def stripe_not_configured
    render json: {
      success: false,
      message: "Stripe is not configured"
    }, status: :internal_server_error
  end
end
