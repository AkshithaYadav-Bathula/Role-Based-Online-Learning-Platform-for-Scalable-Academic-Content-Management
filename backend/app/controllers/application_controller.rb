class ApplicationController < ActionController::API
  before_action :authenticate_user
  
  private

  def authenticate_user
    header = request.headers['Authorization']
    token = header.split(' ').last if header
    
    if token
      begin
        @decoded = decode_token(token)
        if @decoded.nil? || @decoded[:user_id].blank?
          render json: { error: 'Invalid token' }, status: :unauthorized
          return
        end
        @current_user = User.find(@decoded[:user_id])
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'User not found' }, status: :unauthorized
      rescue JWT::DecodeError
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
    Rails.logger.error("JWT decode error: #{e.message}")
    nil
  end

  def jwt_secret
    ENV['JWT_SECRET'] || 'Teja'
  end

  def current_user
    @current_user
  end

  def serialize_course_doubt(doubt, viewer = nil)
    votes = doubt.course_doubt_votes
    viewer_id = viewer&.id

    {
      id: doubt.id,
      course_id: doubt.course_id,
      user_id: doubt.user_id,
      user_name: doubt.user&.name,
      educator_id: doubt.educator_id,
      educator_name: doubt.educator&.name,
      question: doubt.question,
      reply: doubt.reply,
      replied_at: doubt.replied_at,
      answered: doubt.reply.present?,
      upvotes_count: votes.size,
      upvoted_by_current_user: viewer_id.present? ? votes.any? { |vote| vote.user_id == viewer_id } : false,
      created_at: doubt.created_at,
      updated_at: doubt.updated_at
    }
  end

  def serialize_notification(notification)
    {
      id: notification.id,
      kind: notification.kind,
      title: notification.title,
      message: notification.message,
      read_at: notification.read_at,
      is_read: notification.read_at.present?,
      course_id: notification.course_id,
      course_title: notification.course&.course_title,
      course_doubt_id: notification.course_doubt_id,
      actor_name: notification.actor&.name,
      created_at: notification.created_at
    }
  end
end