class UsersController < ApplicationController
  skip_before_action :authenticate_user, only: [:verify_payment]

  before_action :configure_stripe, only: [
    :create_payment_intent,
    :complete_course_purchase,
    :purchase_course,
    :verify_payment
  ]

  def get_user_data
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
