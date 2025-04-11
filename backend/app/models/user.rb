class User < ApplicationRecord
  has_secure_password
  
  has_many :user_courses, dependent: :destroy
  has_many :enrolled_courses, through: :user_courses, source: :course
  has_many :course_progresses, dependent: :destroy
  has_many :course_ratings, dependent: :destroy
  has_many :purchases, dependent: :destroy
  has_many :created_courses, class_name: 'Course', foreign_key: 'educator_id', dependent: :destroy

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
  validates :role, inclusion: { in: ['student', 'educator'] }

  def educator?
    role == "educator"
  end

  def student?
    role == "student"
  end

  
end
