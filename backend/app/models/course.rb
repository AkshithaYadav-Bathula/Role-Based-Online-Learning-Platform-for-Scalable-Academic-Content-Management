class Course < ApplicationRecord
  belongs_to :educator, class_name: 'User', foreign_key: 'educator_id'
  
  has_many :chapters, dependent: :destroy
  has_many :course_ratings, dependent: :destroy
  has_many :purchases, dependent: :destroy
  has_many :user_courses, dependent: :destroy
  has_many :users, through: :user_courses
  has_many :course_progresses, dependent: :destroy

  has_one_attached :thumbnail

  validates :course_title, presence: true
  validates :course_description, presence: true
  validates :course_price, presence: true, 
            numericality: { greater_than_or_equal_to: 0 }
  validates :discount, 
            numericality: { 
              greater_than_or_equal_to: 0, 
              less_than_or_equal_to: 100 
            }

  def thumbnail_url
    return unless thumbnail.attached?
    
    Rails.application.routes.url_helpers.rails_blob_url(
      thumbnail,
      host: Rails.application.config.action_controller.default_url_options[:host],
      protocol: Rails.application.config.action_controller.default_url_options[:protocol] || 'http'
    )
  end

  def discounted_price
    (course_price * (100 - discount) / 100.0).round(2)
  end
end