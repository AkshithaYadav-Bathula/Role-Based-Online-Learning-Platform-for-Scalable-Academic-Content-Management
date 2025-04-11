class CourseProgress < ApplicationRecord
    belongs_to :user
    belongs_to :course
  
    validates :completed, inclusion: { in: [true, false] }
  end
  