class AuthController < ApplicationController
  VALID_ROLES = %w[student educator].freeze

  skip_before_action :authenticate_user, only: [:login, :signup]

  def login
    role = normalized_role(params[:role])
    return render_invalid_role if role.nil?

    user = User.find_by(email: params[:email])
    
    if user&.authenticate(params[:password])
      if user.role != role
        return render json: {
          success: false,
          message: "This account is registered as #{user.role}. Please choose the correct role to continue."
        }, status: :unauthorized
      end

      token = encode_token({ user_id: user.id })
      render json: { 
        success: true, 
        user: user.as_json(except: [:password_digest]), 
        token: token 
      }
    else
      render json: { success: false, message: "Invalid credentials" }, status: :unauthorized
    end
  end

  def signup
    role = normalized_role(params[:role])
    return render_invalid_role if role.nil?

    user = User.new(signup_params.merge(role: role))
  
    if user.save
      token = encode_token({ user_id: user.id })
      render json: { 
        success: true, 
        user: user.as_json(except: [:password_digest]), 
        token: token 
      }, status: :created
    else
      render json: { success: false, errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end
  

  private

  def signup_params
    params.permit(:name, :email, :password)
  end

  def normalized_role(raw_role)
    role = raw_role.to_s.strip.downcase
    return nil unless VALID_ROLES.include?(role)

    role
  end

  def render_invalid_role
    render json: {
      success: false,
      message: "Please choose a valid role: Student or Instructor"
    }, status: :unprocessable_entity
  end
end
