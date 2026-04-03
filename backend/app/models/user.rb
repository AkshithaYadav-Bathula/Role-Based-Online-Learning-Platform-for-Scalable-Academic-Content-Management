class User < ApplicationRecord
  has_secure_password
  
  # user_courses has no primary key (id: false), so delete rows directly.
  has_many :user_courses
  has_many :enrolled_courses, through: :user_courses, source: :course
  has_many :course_progresses, dependent: :destroy
  has_many :course_ratings, dependent: :destroy
  has_many :purchases, dependent: :destroy
  has_many :created_courses, class_name: 'Course', foreign_key: 'educator_id', dependent: :destroy
  has_many :announcements, class_name: 'Announcement', foreign_key: 'educator_id', dependent: :destroy
  has_many :course_doubts, dependent: :destroy

  before_destroy :delete_user_courses_records

  validates :email, presence: true, uniqueness: true
  validates :name, presence: true
  validates :role, inclusion: { in: ['student', 'educator'] }

  def educator?
    role == "educator"
  end

  def student?
    role == "student"
  end

  private

  def delete_user_courses_records
    UserCourse.where(user_id: id).delete_all
  end

  
end
