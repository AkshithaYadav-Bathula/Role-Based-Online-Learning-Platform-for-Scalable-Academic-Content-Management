class UserCourse < ApplicationRecord
  belongs_to :user
  belongs_to :course
  
  validates :user_id, uniqueness: { scope: :course_id }
end