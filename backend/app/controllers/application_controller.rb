class ApplicationController < ActionController::API
  before_action :authenticate_user
  
  private

  def authenticate_user
    header = request.headers['Authorization']
    token = header.split(' ').last if header
    
    if token
      begin
        @decoded = decode_token(token)
        @current_user = User.find(@decoded[:user_id])
      rescue ActiveRecord::RecordNotFound => e
        render json: { error: 'User not found' }, status: :unauthorized
      rescue JWT::DecodeError => e
        render json: { error: 'Invalid token' }, status: :unauthorized
      end
    else
      render json: { error: 'Token missing' }, status: :unauthorized
    end
  end

  def encode_token(payload)
    JWT.encode(payload, jwt_secret)
  end

  def decode_token(token)
    body = JWT.decode(token, jwt_secret)[0]
    HashWithIndifferentAccess.new body
  rescue JWT::DecodeError => e
    # Return more detailed error for debugging
    Rails.logger.error("JWT decode error: #{e.message}")
    nil
  end

  def jwt_secret
    ENV['JWT_SECRET'] || 'Teja'
  end

  def current_user
    @current_user
  end
end