# # backend/app/controllers/ai_controller.rb

# require 'net/http'
# require 'json'

# class AiController < ApplicationController
#   # Skip auth for now — add back later if needed
#   before_action :authenticate_user, only: [:chat]

#   AI_SERVICE_URL = 'http://127.0.0.1:8000'

#   # POST /ai/chat
#   # Called by React when student sends a message
#   def chat
#     puts "\n[RAILS AI] Chat request received"
#     puts "[RAILS AI] Question: #{params[:question]}"
#     puts "[RAILS AI] Course ID: #{params[:course_id]}"

#     question  = params[:question].to_s.strip
#     course_id = params[:course_id].to_s.strip

#     if question.blank? || course_id.blank?
#       render json: { error: 'question and course_id are required' }, status: :bad_request
#       return
#     end

#     puts "[RAILS AI] Forwarding to Python AI service..."

#     response = call_ai_service(
#       endpoint: '/chat',
#       body: {
#         question: question,
#         course_id: course_id.to_i
#       }
#     )

#     if response[:success]
#       puts "[RAILS AI] Answer received: #{response[:data]['answer']}"
#       render json: { answer: response[:data]['answer'] }, status: :ok
#     else
#       puts "[RAILS AI] Error from AI service: #{response[:error]}"
#       render json: { error: response[:error] }, status: :service_unavailable
#     end
#   end

#   # POST /ai/ingest
#   # Called when educator saves a lecture (we will hook this into lectures controller)
#   def ingest
#     puts "\n[RAILS AI] Ingest request received"
#     puts "[RAILS AI] Lecture: #{params[:lecture_title]}"

#     response = call_ai_service(
#       endpoint: '/ingest',
#       body: {
#         lecture_id:      params[:lecture_id].to_i,
#         lecture_title:   params[:lecture_title].to_s,
#         lecture_content: params[:lecture_content].to_s,
#         course_id:       params[:course_id].to_i
#       }
#     )

#     if response[:success]
#       render json: response[:data], status: :ok
#     else
#       render json: { error: response[:error] }, status: :service_unavailable
#     end
#   end

#   private

#   def call_ai_service(endpoint:, body:)
#     uri = URI("#{AI_SERVICE_URL}#{endpoint}")

#     http          = Net::HTTP.new(uri.host, uri.port)
#     http.open_timeout = 5   # 5 seconds to connect
#     http.read_timeout = 60  # 60 seconds to get answer (LLM is slow)

#     request = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
#     request.body = body.to_json

#     response = http.request(request)
#     data     = JSON.parse(response.body)

#     { success: true, data: data }

#   rescue Errno::ECONNREFUSED
#     puts "[RAILS AI] ERROR: Python AI service is not running on port 8000"
#     { success: false, error: 'AI service is offline. Please try again later.' }

#   rescue Net::ReadTimeout
#     puts "[RAILS AI] ERROR: AI service timed out (LLM took too long)"
#     { success: false, error: 'AI service timed out. Please try again.' }

#   rescue => e
#     puts "[RAILS AI] ERROR: #{e.message}"
#     { success: false, error: 'Unexpected error contacting AI service.' }
#   end

#   def authenticate_user
#     token = request.headers['Authorization']&.split(' ')&.last
#     unless token
#       render json: { error: 'Unauthorized' }, status: :unauthorized
#     end
#   end
# end
require 'net/http'
require 'json'

class AiController < ApplicationController

#   AI_SERVICE_URL = 'http://127.0.0.1:8000'
AI_SERVICE_URL = 'http://localhost:8000'
  # POST /ai/chat
  # React calls this when student sends a message
  # This forwards the question to the Python AI service
  def chat
    puts "\n[RAILS AI] /ai/chat called"
    puts "[RAILS AI] Question: #{params[:question]}"
    puts "[RAILS AI] Course ID: #{params[:course_id]}"

    question  = params[:question].to_s.strip
    course_id = params[:course_id].to_s.strip

    # Validate inputs
    if question.blank? || course_id.blank?
      render json: { error: 'question and course_id are required' }, status: :bad_request
      return
    end

    puts "[RAILS AI] Forwarding to Python AI service at port 8000..."

    result = call_ai_service(
      endpoint: '/chat',
      body: {
        question:  question,
        course_id: course_id.to_i
      }
    )

    if result[:success]
      puts "[RAILS AI] Answer received: #{result[:data]['answer']}"
      render json: { answer: result[:data]['answer'] }, status: :ok
    else
      puts "[RAILS AI] Error: #{result[:error]}"
      render json: { error: result[:error] }, status: :service_unavailable
    end
  end

  # POST /ai/ingest
  # Called when educator creates or updates a lecture
  def ingest
    puts "\n[RAILS AI] /ai/ingest called"
    puts "[RAILS AI] Lecture: #{params[:lecture_title]}"
    puts "[RAILS AI] Course ID: #{params[:course_id]}"

    result = call_ai_service(
      endpoint: '/ingest',
      body: {
        lecture_id:      params[:lecture_id].to_i,
        lecture_title:   params[:lecture_title].to_s,
        lecture_content: params[:lecture_content].to_s,
        course_id:       params[:course_id].to_i
      }
    )

    if result[:success]
      puts "[RAILS AI] Ingest successful"
      render json: result[:data], status: :ok
    else
      puts "[RAILS AI] Ingest error: #{result[:error]}"
      render json: { error: result[:error] }, status: :service_unavailable
    end
  end

  private

  # Shared method to call the Python AI service
  def call_ai_service(endpoint:, body:)
    uri = URI("#{AI_SERVICE_URL}#{endpoint}")

    http              = Net::HTTP.new(uri.host, uri.port)
    http.open_timeout = 5   # fail fast if Python service is not running
    http.read_timeout = 90  # LLM can take up to 90 seconds to respond

    request      = Net::HTTP::Post.new(uri, 'Content-Type' => 'application/json')
    request.body = body.to_json

    puts "[RAILS AI] Sending POST to #{uri}"
    response = http.request(request)
    data     = JSON.parse(response.body)
    puts "[RAILS AI] Response received from Python service"

    { success: true, data: data }

  rescue Errno::ECONNREFUSED
    puts "[RAILS AI] ERROR: Python AI service not running on port 8000"
    { success: false, error: 'AI service is offline. Please start the AI service.' }

  rescue Net::OpenTimeout
    puts "[RAILS AI] ERROR: Could not connect to AI service (timeout)"
    { success: false, error: 'Could not connect to AI service.' }

  rescue Net::ReadTimeout
    puts "[RAILS AI] ERROR: AI service timed out while generating answer"
    { success: false, error: 'AI service timed out. Please try again.' }

  rescue => e
    puts "[RAILS AI] ERROR: #{e.message}"
    { success: false, error: 'Unexpected error contacting AI service.' }
  end
end