class CourseRating < ApplicationRecord
  belongs_to :user
  belongs_to :course
  
  validates :user_id, uniqueness: { scope: :course_id }
  validates :rating, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 5 }
end