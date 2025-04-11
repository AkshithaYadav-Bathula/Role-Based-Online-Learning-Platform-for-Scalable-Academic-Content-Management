class AuthController < ApplicationController
  skip_before_action :authenticate_user, only: [:login, :signup]

  def login
    user = User.find_by(email: params[:email])
    
    if user&.authenticate(params[:password])
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
    user_params = params.permit(:name, :email, :password).merge(role: "student")  # Accept params directly
    user = User.new(user_params)
  
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

  def user_params
    params.require(:user).permit(:name, :email, :password)  # Removed role from permitted params
  end
end
