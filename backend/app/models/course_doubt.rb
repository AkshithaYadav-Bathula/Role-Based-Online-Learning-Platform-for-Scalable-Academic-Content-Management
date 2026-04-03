class CourseDoubt < ApplicationRecord
  belongs_to :course
  belongs_to :user
  belongs_to :educator, class_name: 'User', foreign_key: 'educator_id', optional: true
  has_many :notifications, dependent: :nullify
  has_many :course_doubt_votes, dependent: :destroy

  validates :question, presence: true
end