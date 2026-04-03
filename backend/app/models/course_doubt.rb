class CourseDoubt < ApplicationRecord
  belongs_to :course
  belongs_to :user
  belongs_to :educator, class_name: 'User', foreign_key: 'educator_id', optional: true

  validates :question, presence: true
end