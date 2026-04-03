class CourseDoubtVote < ApplicationRecord
  belongs_to :course_doubt
  belongs_to :user

  validates :course_doubt_id, uniqueness: { scope: :user_id }
end
